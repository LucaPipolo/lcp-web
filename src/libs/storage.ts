import { neon } from "@neondatabase/serverless"

import { hashProof, type Proof } from "./consent.js"

/**
 * We decided to keep messages and proof records in two separate databases,
 * with their own credentials, because they're kept for different lengths of
 * time and for different reasons: a leak or a mistake in one never reaches
 * the other. A shared id ties a message to its proof.
 */

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

  if (!ready.has(variable)) ready.set(variable, sql.query(schema))

  try {
    await ready.get(variable)
  } catch (error) {
    ready.delete(variable)
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
