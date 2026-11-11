import type { Proof } from "@/libs/consent"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const neon = vi.hoisted(() => {
  /** Every database the module connected to, by its connection string. */
  const databases = new Map<
    string,
    ReturnType<typeof vi.fn> & { query: ReturnType<typeof vi.fn> }
  >()

  return {
    databases,
    neon: vi.fn((url: string) => {
      if (!databases.has(url)) {
        databases.set(
          url,
          Object.assign(
            vi.fn(async () => []),
            { query: vi.fn(async () => []) }
          )
        )
      }

      return databases.get(url)
    }),
  }
})

vi.mock("@neondatabase/serverless", () => ({ neon: neon.neon }))

/**
 * Loads the module afresh, so no test inherits the tables another created.
 *
 * @returns The module.
 */
async function load() {
  vi.resetModules()

  return import("@/libs/storage")
}

/**
 * Reads back one query a database ran.
 *
 * @param url - The database's connection string.
 * @param call - Which query, in order.
 *
 * @returns Its SQL, whitespace folded, and its values.
 */
function query(url: string, call = 0) {
  const [strings, ...values] = neon.databases.get(url)!.mock.calls[call] as [
    TemplateStringsArray,
    ...unknown[],
  ]

  return { sql: strings.join("?").replace(/\s+/g, " ").trim(), values }
}

const MESSAGE = {
  createdAt: "2026-11-11T12:00:00.000Z",
  email: "ada@example.com",
  id: "0b8e4f6c-1d2a-4c3b-9e5f-7a6b5c4d3e2f",
  locale: "en",
  message: "Hello",
  name: "Ada",
  page: "/en/contact/",
  reason: "project",
}

const PROOF: Proof = {
  id: MESSAGE.id,
  ipHash: "ip",
  locale: "en",
  notice: "Notice",
  noticeVersion: "2026-05-01",
  page: "/en/contact/",
  purpose: "contact",
  recordedAt: MESSAGE.createdAt,
  userAgent: "Firefox",
}

describe("storage", () => {
  beforeEach(() => {
    neon.databases.clear()
    neon.neon.mockClear()
    vi.stubEnv("DB_MESSAGES_DATABASE_URL", "postgres://messages")
    vi.stubEnv("DB_CONSENT_DATABASE_URL", "postgres://consent")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("stores a message in the messages database, every field in its column", async () => {
    const { storeMessage } = await load()

    await storeMessage(MESSAGE)

    expect(query("postgres://messages")).toEqual({
      sql: "INSERT INTO messages (id, created_at, reason, name, email, message, locale, page) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      values: [
        MESSAGE.id,
        MESSAGE.createdAt,
        "project",
        "Ada",
        "ada@example.com",
        "Hello",
        "en",
        "/en/contact/",
      ],
    })
    expect(neon.databases.has("postgres://consent")).toBe(false)
  })

  it("stores a proof in the consent database, sealed with its hash", async () => {
    const { hashProof } = await import("@/libs/consent")
    const { storeProof } = await load()

    await storeProof(PROOF)

    const { sql, values } = query("postgres://consent")

    expect(sql).toMatch(/^INSERT INTO proofs .* record_hash\)/)
    expect(values.at(-1)).toBe(hashProof(PROOF))
    expect(neon.databases.has("postgres://messages")).toBe(false)
  })

  it("creates a table on first use, and only once", async () => {
    const { storeMessage } = await load()

    await storeMessage(MESSAGE)
    await storeMessage(MESSAGE)

    const { query: schema } = neon.databases.get("postgres://messages")!

    expect(schema).toHaveBeenCalledOnce()
    expect(schema.mock.calls[0][0]).toContain(
      "CREATE TABLE IF NOT EXISTS messages"
    )
  })

  it("creates each table of a database on its own", async () => {
    const { recordNotice, storeProof } = await load()

    await storeProof(PROOF)
    await recordNotice({
      delivered: 2,
      failed: 1,
      id: MESSAGE.id,
      policyVersion: "2026-05-01",
      recipients: 3,
      sentAt: MESSAGE.createdAt,
      subject: "Update",
    })

    const { query: schema } = neon.databases.get("postgres://consent")!

    expect(schema).toHaveBeenCalledTimes(2)
    expect(schema.mock.calls[1][0]).toContain(
      "CREATE TABLE IF NOT EXISTS notices"
    )
    expect(query("postgres://consent", 1)).toEqual({
      sql: "INSERT INTO notices (id, sent_at, policy_version, subject, recipients, delivered, failed) VALUES (?, ?, ?, ?, ?, ?, ?)",
      values: [MESSAGE.id, MESSAGE.createdAt, "2026-05-01", "Update", 3, 2, 1],
    })
  })

  it("tries to create the table again after a failed attempt", async () => {
    const { storeMessage } = await load()
    const sql = neon.neon("postgres://messages")!

    sql.query.mockRejectedValueOnce(new Error("Connection refused"))

    await expect(storeMessage(MESSAGE)).rejects.toThrow("Connection refused")
    await storeMessage(MESSAGE)

    expect(sql.query).toHaveBeenCalledTimes(2)
    expect(sql).toHaveBeenCalledOnce()
  })

  it("throws, naming the variable, when a database isn't connected", async () => {
    vi.stubEnv("DB_CONSENT_DATABASE_URL", "")

    const { storeProof } = await load()

    await expect(storeProof(PROOF)).rejects.toThrow(
      "No database to store in. Connect the Neon database to this Vercel environment so it sets `DB_CONSENT_DATABASE_URL`."
    )
  })

  it.each([
    [
      "deleteExpiredMessages",
      "postgres://messages",
      "messages",
      "created_at",
      "12 months",
    ],
    [
      "deleteExpiredProofs",
      "postgres://consent",
      "proofs",
      "recorded_at",
      "3 years",
    ],
  ] as const)(
    "%s deletes what's older than its retention, and counts it",
    async (name, url, table, column, retention) => {
      const storage = await load()

      neon.neon(url)!.mockResolvedValueOnce([{ id: "a" }, { id: "b" }])

      expect(await storage[name]()).toBe(2)
      expect(query(url)).toEqual({
        sql: `DELETE FROM ${table} WHERE ${column} < now() - ?::interval RETURNING id`,
        values: [retention],
      })
    }
  )

  it("lists each address once, with its latest name and language", async () => {
    const { listRecipients } = await load()
    const recipients = [{ email: "ada@example.com", locale: "en", name: "Ada" }]

    neon.neon("postgres://messages")!.mockResolvedValueOnce(recipients)

    expect(await listRecipients()).toBe(recipients)
    expect(query("postgres://messages").sql).toBe(
      "SELECT DISTINCT ON (lower(email)) email, name, locale FROM messages ORDER BY lower(email), created_at DESC"
    )
  })
})
