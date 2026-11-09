import { neon } from "@neondatabase/serverless"

import { hashProof, type Proof } from "./consent.js"

/**
 * We decided to keep messages and proof records in two separate databases,
 * with their own credentials, because they're kept for different lengths of
 * time and for different reasons: a leak or a mistake in one never reaches
 * the other. A shared id ties a message to its proof.
 */

/**
 * How long each is kept, as Postgres intervals. The privacy policy promises
 * these exact periods in every language, so changing one means changing it
 * there too.
 */
export const RETENTION = {
  /** Long enough to answer, follow up and pick a conversation back up. */
  messages: "12 months",
  /** The time a data protection authority has to act on a complaint. */
  proofs: "3 years",
} as const

/** A message as it's kept. */
export interface StoredMessage {
  createdAt: string
  email: string
  id: string
  locale: string
  message: string
  name: string
  page: string
  reason: string
}

const MESSAGES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS messages (
    id uuid PRIMARY KEY,
    created_at timestamptz NOT NULL,
    reason text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    message text NOT NULL,
    locale text NOT NULL,
    page text NOT NULL
  )`

const PROOFS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS proofs (
    id uuid PRIMARY KEY,
    recorded_at timestamptz NOT NULL,
    purpose text NOT NULL,
    locale text NOT NULL,
    page text NOT NULL,
    notice text NOT NULL,
    notice_version text NOT NULL,
    user_agent text NOT NULL,
    ip_hash text NOT NULL,
    record_hash text NOT NULL
  )`

// Each preview starts on a fresh copy of the database, so the tables are
// created on first use rather than by a migration someone has to remember.
const ready = new Map<string, Promise<unknown>>()

/**
 * Connects to a database, creating its table the first time this instance
 * uses it.
 *
 * @param variable - The environment variable holding the connection string.
 * @param schema - The `CREATE TABLE` statement for its one table.
 *
 * @returns A query function for that database.
 *
 * @throws When the variable isn't set.
 */
async function connect(variable: string, schema: string) {
  const url = process.env[variable]

  if (!url) {
    throw new Error(
      `No database to store in. Connect the Neon database to this Vercel environment so it sets \`${variable}\`.`
    )
  }

  const sql = neon(url)
  // One database can hold more than one table, so each is tracked on its own.
  const key = `${variable} ${schema}`

  if (!ready.has(key)) ready.set(key, sql.query(schema))

  try {
    await ready.get(key)
  } catch (error) {
    ready.delete(key)
    throw error
  }

  return sql
}

/**
 * Stores a message.
 *
 * @param message - The message, as it passed every check.
 */
export async function storeMessage(message: StoredMessage): Promise<void> {
  const sql = await connect("DB_MESSAGES_DATABASE_URL", MESSAGES_SCHEMA)

  await sql`
    INSERT INTO messages (id, created_at, reason, name, email, message, locale, page)
    VALUES (${message.id}, ${message.createdAt}, ${message.reason}, ${message.name},
      ${message.email}, ${message.message}, ${message.locale}, ${message.page})`
}

/**
 * Stores the proof of what a Visitor was told when they sent a message.
 *
 * @param proof - The record, sealed here with its own hash.
 */
export async function storeProof(proof: Proof): Promise<void> {
  const sql = await connect("DB_CONSENT_DATABASE_URL", PROOFS_SCHEMA)

  await sql`
    INSERT INTO proofs (id, recorded_at, purpose, locale, page, notice,
      notice_version, user_agent, ip_hash, record_hash)
    VALUES (${proof.id}, ${proof.recordedAt}, ${proof.purpose}, ${proof.locale},
      ${proof.page}, ${proof.notice}, ${proof.noticeVersion}, ${proof.userAgent},
      ${proof.ipHash}, ${hashProof(proof)})`
}

/**
 * Deletes the messages kept longer than {@link RETENTION} allows.
 *
 * @returns How many were deleted.
 */
export async function deleteExpiredMessages(): Promise<number> {
  const sql = await connect("DB_MESSAGES_DATABASE_URL", MESSAGES_SCHEMA)
  const deleted = await sql`
    DELETE FROM messages
    WHERE created_at < now() - ${RETENTION.messages}::interval
    RETURNING id`

  return deleted.length
}

/**
 * Deletes the proof records kept longer than {@link RETENTION} allows.
 *
 * @returns How many were deleted.
 */
export async function deleteExpiredProofs(): Promise<number> {
  const sql = await connect("DB_CONSENT_DATABASE_URL", PROOFS_SCHEMA)
  const deleted = await sql`
    DELETE FROM proofs
    WHERE recorded_at < now() - ${RETENTION.proofs}::interval
    RETURNING id`

  return deleted.length
}

/** Someone who wrote through the form and whose message is still kept. */
export interface Recipient {
  email: string
  locale: string
  name: string
}

/**
 * Lists everyone whose message is still kept, once per address.
 *
 * @returns Each address with the name and language of its latest message.
 */
export async function listRecipients(): Promise<Recipient[]> {
  const sql = await connect("DB_MESSAGES_DATABASE_URL", MESSAGES_SCHEMA)

  return (await sql`
    SELECT DISTINCT ON (lower(email)) email, name, locale
    FROM messages
    ORDER BY lower(email), created_at DESC`) as Recipient[]
}

const NOTICES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS notices (
    id uuid PRIMARY KEY,
    sent_at timestamptz NOT NULL,
    policy_version text NOT NULL,
    subject text NOT NULL,
    recipients integer NOT NULL,
    delivered integer NOT NULL,
    failed integer NOT NULL
  )`

/** What a notice sent to everyone leaves behind: no address, only counts. */
export interface SentNotice {
  delivered: number
  failed: number
  id: string
  policyVersion: string
  recipients: number
  sentAt: string
  subject: string
}

/**
 * Records that a notice went out, as proof that people were told.
 *
 * @param notice - When, which policy version, and how many it reached.
 */
export async function recordNotice(notice: SentNotice): Promise<void> {
  const sql = await connect("DB_CONSENT_DATABASE_URL", NOTICES_SCHEMA)

  await sql`
    INSERT INTO notices (id, sent_at, policy_version, subject, recipients,
      delivered, failed)
    VALUES (${notice.id}, ${notice.sentAt}, ${notice.policyVersion},
      ${notice.subject}, ${notice.recipients}, ${notice.delivered},
      ${notice.failed})`
}
