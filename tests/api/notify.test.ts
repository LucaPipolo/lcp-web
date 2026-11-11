import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { sendEmail } from "@/libs/email"
import { LOCALES } from "@/libs/i18n"
import { listRecipients, recordNotice } from "@/libs/storage"

import notify from "../../api/notify"
import { files, resetFiles } from "../support/files"

vi.mock("node:fs/promises", () => import("../support/files"))
vi.mock("@/libs/email", () => ({ sendEmail: vi.fn() }))
vi.mock("@/libs/storage", () => ({
  listRecipients: vi.fn(),
  recordNotice: vi.fn(),
}))

const NOTICE = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    { body: `Body in ${locale}.`, subject: `Subject in ${locale}` },
  ])
)

const RECIPIENTS = [
  { email: "ada@example.com", locale: "en", name: "Ada" },
  { email: "bea@example.com", locale: "es", name: "Bea" },
  { email: "cira@example.com", locale: "it", name: "Cira" },
  // A language the site has since dropped falls back to the default one.
  { email: "dirk@example.com", locale: "de", name: "Dirk" },
]

/**
 * Calls the function the way `bun run notify` does.
 *
 * @param body - What it sends.
 * @param init - Anything else about the request.
 *
 * @returns The function's response.
 */
function call(body: unknown, init: RequestInit = {}): Promise<Response> {
  return notify.fetch(
    new Request("https://www.lucapipolo.com/api/notify/", {
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { authorization: "Bearer notice" },
      method: "POST",
      ...init,
    })
  )
}

describe("api/notify", () => {
  beforeEach(() => {
    resetFiles()

    for (const locale of LOCALES) {
      files[`src/content/emails/notice/${locale}.yaml`] = `
greeting: "Hi {name} (${locale}),"
privacy: { href: /${locale}/privacy/, label: Privacy }
reason: Reason.
rights: Rights.
signature: Luca
`
    }

    files["src/content/pages/contact/es.yaml"] = `
form: { acknowledgement: Ack }
notice: { heading: Heading, items: [] }
`
    files["src/content/pages/privacy/es.yaml"] = "updated: 2026-05-01\n"
    vi.stubEnv("PRIVACY_NOTICE_SECRET", "notice")
    vi.stubEnv("CONTACT_TO_EMAIL", "luca@example.com")
    vi.mocked(listRecipients).mockResolvedValue(RECIPIENTS)
    vi.mocked(sendEmail).mockResolvedValue()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.mocked(sendEmail).mockReset()
    vi.mocked(recordNotice).mockReset()
  })

  describe("guards", () => {
    it.each([
      ["no secret", {}],
      ["the wrong secret", { authorization: "Bearer guess" }],
    ])("refuses a call with %s", async (_, headers) => {
      const response = await call(
        { mode: "send", notice: NOTICE },
        { headers, method: "POST" }
      )

      expect(response.status).toBe(401)
      expect(listRecipients).not.toHaveBeenCalled()
    })

    it("refuses every call when no secret is set, rather than run unguarded", async () => {
      vi.stubEnv("PRIVACY_NOTICE_SECRET", undefined)

      const response = await call(
        { mode: "send", notice: NOTICE },
        { headers: { authorization: "Bearer undefined" }, method: "POST" }
      )

      expect(response.status).toBe(401)
    })

    it("only takes a POST", async () => {
      const response = await notify.fetch(
        new Request("https://www.lucapipolo.com/api/notify/", {
          headers: { authorization: "Bearer notice" },
        })
      )

      expect(response.status).toBe(405)
      expect(response.headers.get("allow")).toBe("POST")
    })

    it.each([
      ["a body that isn't JSON", "{"],
      ["an unknown mode", { mode: "blast", notice: NOTICE }],
      [
        "a notice missing a language",
        { mode: "send", notice: { en: NOTICE.en } },
      ],
    ])("explains what to send, given %s", async (_, body) => {
      const response = await call(body)

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe(
        "Send a `mode` (dry-run, test, send) and a `notice` with a subject and a body for each of es, en, it."
      )
    })
  })

  describe("dry run", () => {
    it("counts the recipients by language, and sends nothing", async () => {
      const response = await call({ mode: "dry-run", notice: NOTICE })

      expect(response.headers.get("cache-control")).toBe("no-store")
      expect(await response.json()).toEqual({
        byLocale: { en: 1, es: 2, it: 1 },
        mode: "dry-run",
        recipients: 4,
      })
      expect(sendEmail).not.toHaveBeenCalled()
      expect(recordNotice).not.toHaveBeenCalled()
    })

    it("answers with the real error when the database fails", async () => {
      vi.mocked(listRecipients).mockRejectedValue(new Error("Neon is down"))

      const response = await call({ mode: "dry-run", notice: NOTICE })

      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: "Error: Neon is down" })
    })
  })

  describe("test", () => {
    it("sends each language's version to Luca alone, greeting him by name", async () => {
      const response = await call({ mode: "test", notice: NOTICE })

      expect(await response.json()).toEqual({
        mode: "test",
        sent: 3,
        to: "luca@example.com",
      })
      expect(listRecipients).not.toHaveBeenCalled()
      expect(
        vi.mocked(sendEmail).mock.calls.map(([email]) => email.subject)
      ).toEqual([
        "[Test, es] Subject in es",
        "[Test, en] Subject in en",
        "[Test, it] Subject in it",
      ])

      const [[first]] = vi.mocked(sendEmail).mock.calls

      expect(first).toMatchObject({
        tags: ["policy-notice", "test"],
        to: { email: "luca@example.com" },
      })
      expect(first.text).toMatch(/^Hi Luca \(es\),\n\nBody in es\./)
      expect(first.text).toContain(
        "Privacy: https://www.lucapipolo.com/es/privacy/"
      )
    })

    it("fails without an inbox to send to", async () => {
      vi.stubEnv("CONTACT_TO_EMAIL", "")

      const response = await call({ mode: "test", notice: NOTICE })

      expect(response.status).toBe(500)
      expect((await response.json()).error).toContain("CONTACT_TO_EMAIL")
    })
  })

  describe("send", () => {
    it("emails each person in their language, and records the run", async () => {
      const response = await call({ mode: "send", notice: NOTICE })

      expect(await response.json()).toEqual({
        delivered: 4,
        failed: 0,
        mode: "send",
        recipients: 4,
      })

      const emails = vi.mocked(sendEmail).mock.calls.map(([email]) => email)

      expect(emails.map(({ subject, to }) => [to, subject])).toEqual([
        [{ email: "ada@example.com", name: "Ada" }, "Subject in en"],
        [{ email: "bea@example.com", name: "Bea" }, "Subject in es"],
        [{ email: "cira@example.com", name: "Cira" }, "Subject in it"],
        [{ email: "dirk@example.com", name: "Dirk" }, "Subject in es"],
      ])
      expect(emails[0]).toMatchObject({
        replyTo: { email: "luca@example.com" },
        tags: ["policy-notice"],
      })
      expect(emails[0].text).toMatch(/^Hi Ada \(en\),/)
      expect(
        new Set(emails.map(({ idempotencyKey }) => idempotencyKey)).size
      ).toBe(4)

      expect(recordNotice).toHaveBeenCalledWith({
        delivered: 4,
        failed: 0,
        id: expect.any(String),
        policyVersion: "2026-05-01",
        recipients: 4,
        sentAt: expect.any(String),
        subject: "Subject in es",
      })
    })

    it("stops before sending anything when there's no inbox for replies", async () => {
      vi.stubEnv("CONTACT_TO_EMAIL", "")

      const response = await call({ mode: "send", notice: NOTICE })

      expect(response.status).toBe(500)
      expect(sendEmail).not.toHaveBeenCalled()
      expect(recordNotice).not.toHaveBeenCalled()
    })

    describe("when Brevo fails", () => {
      beforeEach(() => {
        vi.useFakeTimers()
        vi.mocked(listRecipients).mockResolvedValue(RECIPIENTS.slice(0, 1))
      })

      /**
       * Sends to one person, letting the wait before the retry pass.
       *
       * @returns The function's report.
       */
      async function sendOnce() {
        const response = call({ mode: "send", notice: NOTICE })

        await vi.advanceTimersByTimeAsync(3000)

        return (await response).json()
      }

      it("waits, then retries with the same key", async () => {
        vi.mocked(sendEmail).mockRejectedValueOnce(new Error("503"))

        expect(await sendOnce()).toMatchObject({ delivered: 1, failed: 0 })

        const [[first], [retry]] = vi.mocked(sendEmail).mock.calls

        expect(retry.idempotencyKey).toBe(first.idempotencyKey)
      })

      it("counts it delivered when the retry finds the first attempt went through", async () => {
        vi.mocked(sendEmail)
          .mockRejectedValueOnce(new Error("503"))
          .mockRejectedValueOnce(new Error("Brevo 400: duplicate_parameter"))

        expect(await sendOnce()).toMatchObject({ delivered: 1, failed: 0 })
      })

      it("counts it failed, and still records the run, when the retry fails too", async () => {
        const error = new Error("Brevo 503")

        vi.mocked(sendEmail)
          .mockRejectedValueOnce(new Error("503"))
          .mockRejectedValueOnce(error)

        expect(await sendOnce()).toMatchObject({ delivered: 0, failed: 1 })
        expect(console.error).toHaveBeenCalledWith(error)
        expect(recordNotice).toHaveBeenCalledWith(
          expect.objectContaining({ delivered: 0, failed: 1, recipients: 1 })
        )
      })
    })
  })
})
