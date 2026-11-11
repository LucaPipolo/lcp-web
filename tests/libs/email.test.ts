import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { type Email, sendEmail } from "@/libs/email"

const EMAIL: Email = {
  subject: "Hello",
  text: "Plain text",
  to: { email: "ada@example.com", name: "Ada" },
}

/**
 * Replaces `fetch` with one that answers every request the same way.
 *
 * @param response - What every request gets back.
 *
 * @returns The mock, to read the requests it received.
 */
function stubFetch(response: Response) {
  const fetch = vi.fn().mockResolvedValue(response)

  vi.stubGlobal("fetch", fetch)

  return fetch
}

/**
 * Reads back what a request sent.
 *
 * @param fetch - The stubbed `fetch`.
 *
 * @returns The URL, the request options and the parsed JSON body.
 */
function sent(fetch: ReturnType<typeof stubFetch>) {
  const [url, init] = fetch.mock.calls[0] as [string, RequestInit]

  return { body: JSON.parse(init.body as string), init, url }
}

describe("sendEmail", () => {
  beforeEach(() => {
    vi.stubEnv("BREVO_API_KEY", "test-key")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("posts the email to Brevo with the API key", async () => {
    const fetch = stubFetch(new Response(null, { status: 201 }))

    await sendEmail(EMAIL)

    const { body, init, url } = sent(fetch)

    expect(url).toBe("https://api.brevo.com/v3/smtp/email")
    expect(init.method).toBe("POST")
    expect(init.headers).toMatchObject({ "api-key": "test-key" })
    expect(body).toMatchObject({
      sender: { email: "website@lucapipolo.com" },
      subject: "Hello",
      textContent: "Plain text",
      to: [{ email: "ada@example.com", name: "Ada" }],
    })
  })

  it("sends no idempotency header unless given a key", async () => {
    const fetch = stubFetch(new Response(null, { status: 201 }))

    await sendEmail(EMAIL)

    expect(sent(fetch).body.headers).toBeUndefined()
  })

  it("passes the idempotency key on, so a retry is sent once", async () => {
    const fetch = stubFetch(new Response(null, { status: 201 }))

    await sendEmail({ ...EMAIL, idempotencyKey: "a-uuid" })

    expect(sent(fetch).body.headers).toEqual({ idempotencyKey: "a-uuid" })
  })

  it("throws when the API key is missing, without calling Brevo", async () => {
    vi.stubEnv("BREVO_API_KEY", "")
    const fetch = stubFetch(new Response(null, { status: 201 }))

    await expect(sendEmail(EMAIL)).rejects.toThrow("BREVO_API_KEY")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("throws with Brevo's answer when it refuses the email", async () => {
    stubFetch(new Response("unauthorized sender", { status: 401 }))

    await expect(sendEmail(EMAIL)).rejects.toThrow(
      "Brevo refused the email (401): unauthorized sender"
    )
  })
})
