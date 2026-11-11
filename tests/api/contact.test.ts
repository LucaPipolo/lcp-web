import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { hashIp } from "@/libs/consent"
import { sendEmail } from "@/libs/email"
import { storeMessage, storeProof } from "@/libs/storage"

import contact from "../../api/contact"
import { files, resetFiles } from "../support/files"

vi.mock("node:fs/promises", () => import("../support/files"))
vi.mock("@/libs/email", () => ({ sendEmail: vi.fn() }))
vi.mock("@/libs/storage", () => ({
  storeMessage: vi.fn(),
  storeProof: vi.fn(),
}))

const FORM = {
  acknowledged: true,
  elapsed: 10_000,
  email: " ada@example.com ",
  locale: "en",
  message: "  I'd like to talk about a project with you.  ",
  name: " Ada\nLovelace ",
  page: "/en/contact/",
  reason: "project",
  token: "turnstile-token",
  website: "",
}

/**
 * Replaces `fetch` with one that answers Turnstile's check.
 *
 * @param response - What the check answers.
 *
 * @returns The mock, to read what it was sent.
 */
function stubTurnstile(
  response: Promise<never> | Response = Response.json({ success: true })
) {
  const fetch = vi.fn(() => response)

  vi.stubGlobal("fetch", fetch)

  return fetch
}

/**
 * Posts the form.
 *
 * @param body - What it sends, as an object or as raw text.
 * @param init - Anything else about the request.
 *
 * @returns The function's response.
 */
function post(body: unknown = FORM, init: RequestInit = {}): Promise<Response> {
  return contact.fetch(
    new Request("https://www.lucapipolo.com/api/contact/", {
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "user-agent": "Firefox", "x-real-ip": "203.0.113.7" },
      method: "POST",
      ...init,
    })
  )
}

describe("api/contact", () => {
  beforeEach(() => {
    resetFiles()
    files["src/content/pages/contact/en.yaml"] = `
form:
  acknowledgement: I've read the privacy policy.
notice:
  heading: Data protection
  items: []
`
    files["src/content/pages/privacy/en.yaml"] = "updated: 2026-05-01\n"
    vi.stubEnv("CONTACT_TO_EMAIL", "inbox@example.com")
    vi.stubEnv("CONSENT_IP_HASH_SECRET", "pepper")
    vi.stubEnv("TURNSTILE_SECRET_KEY", "turnstile")
    vi.spyOn(console, "error").mockImplementation(() => {})
    stubTurnstile()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.mocked(sendEmail).mockReset()
    vi.mocked(storeMessage).mockReset()
    vi.mocked(storeProof).mockReset()
  })

  it("emails the message to Luca, set up so a reply reaches the Visitor", async () => {
    const response = await post()

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(await response.json()).toEqual({ ok: true })
    expect(sendEmail).toHaveBeenCalledWith({
      replyTo: { email: "ada@example.com", name: "Ada Lovelace" },
      subject: "Project from Ada Lovelace",
      tags: ["contact"],
      text: [
        "From: Ada Lovelace <ada@example.com>",
        "Page: /en/contact/ (en)",
        "",
        "I'd like to talk about a project with you.",
      ].join("\n"),
      to: { email: "inbox@example.com" },
    })
  })

  it("keeps the message and the proof of the notice, under one id", async () => {
    await post()

    const [message] = vi.mocked(storeMessage).mock.calls[0]
    const [proof] = vi.mocked(storeProof).mock.calls[0]

    expect(message).toMatchObject({
      email: "ada@example.com",
      locale: "en",
      message: "I'd like to talk about a project with you.",
      name: "Ada\nLovelace",
      page: "/en/contact/",
      reason: "project",
    })
    expect(proof).toEqual({
      id: message.id,
      ipHash: hashIp("203.0.113.7", "pepper"),
      locale: "en",
      notice: "I've read the privacy policy.\nData protection",
      noticeVersion: "2026-05-01",
      page: "/en/contact/",
      purpose: "contact",
      recordedAt: message.createdAt,
      userAgent: "Firefox",
    })
  })

  it("keeps no more of the browser's name than any real one needs", async () => {
    await post(FORM, {
      headers: { "user-agent": "x".repeat(600) },
      method: "POST",
    })

    const [proof] = vi.mocked(storeProof).mock.calls[0]

    expect(proof.userAgent).toHaveLength(512)
    expect(proof.ipHash).toBe(hashIp("", "pepper"))
  })

  it("keeps an empty browser name when the request has none", async () => {
    await post(FORM, { headers: {}, method: "POST" })

    expect(vi.mocked(storeProof).mock.calls[0][0].userAgent).toBe("")
  })

  it("passes the Visitor's address to Turnstile alongside the token", async () => {
    const fetch = stubTurnstile()

    await post()

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    const form = init.body as FormData

    expect(url).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    )
    expect(Object.fromEntries(form)).toEqual({
      remoteip: "203.0.113.7",
      response: "turnstile-token",
      secret: "turnstile",
    })
  })

  it("leaves the address out of the Turnstile check when there is none", async () => {
    const fetch = stubTurnstile()

    await post(FORM, { headers: {}, method: "POST" })

    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]

    expect((init.body as FormData).has("remoteip")).toBe(false)
  })

  it("only takes a POST", async () => {
    const response = await contact.fetch(
      new Request("https://www.lucapipolo.com/api/contact/")
    )

    expect(response.status).toBe(405)
    expect(response.headers.get("allow")).toBe("POST")
  })

  it("turns down a body that isn't JSON", async () => {
    const response = await post("{")

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "generic" })
  })

  it.each([
    ["fills in the hidden field", { website: "https://spam.example" }],
    ["sends the form too fast", { elapsed: 500 }],
  ])("tells a bot that %s it worked, and does nothing", async (_, change) => {
    const response = await post({ ...FORM, ...change })

    expect(await response.json()).toEqual({ ok: true })
    expect(sendEmail).not.toHaveBeenCalled()
    expect(storeMessage).not.toHaveBeenCalled()
  })

  it("treats a body that isn't an object as an empty, too-fast form", async () => {
    expect(await (await post([1, 2])).json()).toEqual({ ok: true })
    expect(await (await post(null)).json()).toEqual({ ok: true })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("names each field that fails its checks", async () => {
    const response = await post({
      ...FORM,
      acknowledged: "yes",
      email: 42,
      message: "Hi",
    })

    expect(response.status).toBe(422)
    expect((await response.json()).fields).toEqual({
      acknowledged: "acknowledgement",
      email: "required",
      message: "tooShort",
    })
  })

  it("turns down a language the site doesn't have", async () => {
    const response = await post({ ...FORM, locale: "fr" })

    expect(response.status).toBe(400)
    expect(storeProof).not.toHaveBeenCalled()
  })

  it.each([
    [
      "Turnstile says no",
      () => stubTurnstile(Response.json({ success: false })),
    ],
    [
      "Turnstile answers with an error",
      () => stubTurnstile(new Response(null, { status: 500 })),
    ],
    ["no token was sent", () => stubTurnstile()],
    ["no secret is set", () => vi.stubEnv("TURNSTILE_SECRET_KEY", "")],
  ])("fails the spam check when %s", async (reason, arrange) => {
    arrange()

    const body = reason === "no token was sent" ? { ...FORM, token: "" } : FORM
    const response = await post(body)

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: "verification" })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("answers with an error when Turnstile can't be reached", async () => {
    stubTurnstile(Promise.reject(new Error("offline")))

    const response = await post()

    expect(response.status).toBe(502)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it.each([
    [
      "the email fails",
      () => vi.mocked(sendEmail).mockRejectedValue(new Error("Brevo")),
    ],
    ["no inbox is set", () => vi.stubEnv("CONTACT_TO_EMAIL", "")],
    [
      "storing fails",
      () => vi.mocked(storeMessage).mockRejectedValue(new Error("Neon")),
    ],
    ["no hashing key is set", () => vi.stubEnv("CONSENT_IP_HASH_SECRET", "")],
  ])(
    "still answers ok when %s, since the other reached Luca",
    async (_, arrange) => {
      arrange()

      const response = await post()

      expect(await response.json()).toEqual({ ok: true })
      expect(console.error).toHaveBeenCalledOnce()
    }
  )

  it("answers with an error when neither the email nor the storage worked", async () => {
    vi.stubEnv("CONTACT_TO_EMAIL", "")
    vi.mocked(storeMessage).mockRejectedValue(new Error("Neon"))

    const response = await post()

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: "generic" })
    expect(console.error).toHaveBeenCalledTimes(2)
  })
})
