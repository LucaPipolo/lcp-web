import { ipAddress } from "@vercel/functions"
import { randomUUID } from "node:crypto"

import { hashIp, readNotice } from "../src/libs/consent.js"
import {
  checkContact,
  type ContactInput,
  type ContactReason,
  MIN_ELAPSED,
} from "../src/libs/contact.js"
import { sendEmail } from "../src/libs/email.js"
import { isLocale, type Locale } from "../src/libs/i18n.js"
import { storeMessage, storeProof } from "../src/libs/storage.js"

/**
 * We decided to check every submission here, in this order, from the cheapest
 * check to the one that calls Cloudflare, because each one that fails saves
 * the next: a bot caught by the hidden field never costs a Turnstile lookup.
 */

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

/** Longer than any real browser's, so the rest is never worth keeping. */
const MAX_USER_AGENT = 512

/** How each reason reads in the subject line of the email Luca gets. */
const REASONS: Record<ContactReason, string> = {
  collaboration: "Collaboration",
  job: "Role",
  other: "Message",
  project: "Project",
}

/** What the form sends, as far as anything about it is trusted. */
interface Submission extends ContactInput {
  elapsed: number
  locale: string
  page: string
  token: string
  website: string
}

/**
 * Builds a JSON response.
 *
 * @param body - What to send back.
 * @param status - The HTTP status.
 *
 * @returns The response.
 */
function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  })
}

/**
 * Reads the request body into a submission, treating anything missing or of
 * the wrong type as empty rather than trusting the browser to send it right.
 *
 * @param body - The parsed JSON.
 *
 * @returns The submission.
 */
function read(body: unknown): Submission {
  const data = (
    typeof body === "object" && body !== null ? body : {}
  ) as Record<string, unknown>
  const text = (key: string) =>
    typeof data[key] === "string" ? (data[key] as string) : ""

  return {
    acknowledged: data.acknowledged === true,
    elapsed: typeof data.elapsed === "number" ? data.elapsed : 0,
    email: text("email"),
    locale: text("locale"),
    message: text("message"),
    name: text("name"),
    page: text("page"),
    reason: text("reason"),
    token: text("token"),
    website: text("website"),
  }
}

/**
 * Asks Cloudflare whether the Turnstile token is genuine and unused.
 *
 * @param token - The token the widget issued.
 * @param ip - The Visitor's address, which Cloudflare weighs alongside it.
 *
 * @returns Whether the token passed.
 */
async function verify(token: string, ip: string | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  if (!secret || !token) return false

  const form = new FormData()

  form.append("secret", secret)
  form.append("response", token)
  if (ip) form.append("remoteip", ip)

  const response = await fetch(SITEVERIFY, { body: form, method: "POST" })

  if (!response.ok) return false

  const result = (await response.json()) as { success?: boolean }

  return result.success === true
}

/**
 * Sends a submission to Luca's inbox, set up so that replying answers the
 * Visitor directly.
 *
 * @param submission - A submission that passed every check.
 */
async function deliver(submission: Submission): Promise<void> {
  const to = process.env.CONTACT_TO_EMAIL

  if (!to) {
    throw new Error(
      "No inbox for contact messages. Set `CONTACT_TO_EMAIL` in this Vercel environment."
    )
  }

  // A name is free text, and a line break in it has no place in a subject.
  const name = submission.name.trim().replace(/\s+/g, " ")
  const email = submission.email.trim()

  await sendEmail({
    replyTo: { email, name },
    subject: `${REASONS[submission.reason as ContactReason]} from ${name}`,
    tags: ["contact"],
    text: [
      `From: ${name} <${email}>`,
      `Page: ${submission.page} (${submission.locale})`,
      "",
      submission.message.trim(),
    ].join("\n"),
    to: { email: to },
  })
}

/**
 * Keeps a submission and the proof of what its Visitor was told, both under
 * one id.
 *
 * @param submission - A submission that passed every check.
 * @param request - The request it came in, for the address and browser.
 */
async function keep(
  submission: Submission & { locale: Locale },
  request: Request
): Promise<void> {
  const secret = process.env.CONSENT_IP_HASH_SECRET

  if (!secret) {
    throw new Error(
      "No key to hash addresses with. Set `CONSENT_IP_HASH_SECRET` in this Vercel environment."
    )
  }

  const id = randomUUID()
  const now = new Date().toISOString()
  const notice = await readNotice(submission.locale)

  await Promise.all([
    storeMessage({
      createdAt: now,
      email: submission.email.trim(),
      id,
      locale: submission.locale,
      message: submission.message.trim(),
      name: submission.name.trim(),
      page: submission.page,
      reason: submission.reason,
    }),
    storeProof({
      id,
      ipHash: hashIp(ipAddress(request) ?? "", secret),
      locale: submission.locale,
      notice: notice.text,
      noticeVersion: notice.version,
      page: submission.page,
      purpose: "contact",
      recordedAt: now,
      userAgent: (request.headers.get("user-agent") ?? "").slice(
        0,
        MAX_USER_AGENT
      ),
    }),
  ])
}

export default {
  /**
   * Checks a contact form submission and answers the form.
   *
   * @param request - The form's POST.
   *
   * @returns `{ ok }`, or what went wrong in the shape the form reads.
   */
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response(null, { headers: { Allow: "POST" }, status: 405 })
    }

    let body: unknown

    try {
      body = await request.json()
    } catch {
      return json({ error: "generic" }, 400)
    }

    const submission = read(body)

    // Bots are told it worked, so they have no reason to try again any
    // differently.
    if (submission.website || submission.elapsed < MIN_ELAPSED) {
      return json({ ok: true })
    }

    const fields = checkContact(submission)

    if (Object.keys(fields).length > 0) return json({ fields }, 422)

    // The locale picks which notice is read from disk, so nothing else may
    // get that far.
    if (!isLocale(submission.locale)) return json({ error: "generic" }, 400)

    try {
      if (!(await verify(submission.token, ipAddress(request)))) {
        return json({ error: "verification" }, 403)
      }
    } catch {
      return json({ error: "generic" }, 502)
    }

    // Either one reaching Luca is enough: the message isn't lost, and an
    // error would only make the Visitor send it again.
    const [kept, delivered] = await Promise.allSettled([
      keep({ ...submission, locale: submission.locale }, request),
      deliver(submission),
    ])

    for (const outcome of [kept, delivered]) {
      if (outcome.status === "rejected") console.error(outcome.reason)
    }

    if (kept.status === "rejected" && delivered.status === "rejected") {
      return json({ error: "generic" }, 502)
    }

    return json({ ok: true })
  },
}
