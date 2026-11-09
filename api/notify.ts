import { randomUUID } from "node:crypto"

import { readNotice } from "../src/libs/consent.js"
import { sendEmail } from "../src/libs/email.js"
import {
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
  LOCALES,
} from "../src/libs/i18n.js"
import {
  type Notice,
  readFrame,
  readNoticeInput,
  renderNotice,
} from "../src/libs/notice.js"
import {
  listRecipients,
  type Recipient,
  recordNotice,
} from "../src/libs/storage.js"

/**
 * We decided to notify people by hand, one occasion at a time, rather than on
 * every change to the privacy policy, because only a material change (a new
 * controller, a new purpose, data leaving the EU) has to reach them. Emailing
 * everyone for a reworded sentence is the "notice fatigue" regulators warn
 * about. `bun run notify` is the trigger; see the README.
 */

/** What a run does: count, send to Luca only, or send to everyone. */
const MODES = ["dry-run", "test", "send"] as const

/** How long to wait before retrying an email Brevo didn't take, in ms. */
const RETRY_AFTER = 3000

/**
 * Picks the language someone gets the notice in.
 *
 * @param recipient - Someone whose message is kept.
 *
 * @returns The language they wrote in, or the default one for a value the
 *   site no longer has.
 */
function localeOf(recipient: Recipient): Locale {
  return isLocale(recipient.locale) ? recipient.locale : DEFAULT_LOCALE
}

/**
 * Finds Luca's inbox, which tests go to and replies come back to.
 *
 * @returns The address in `CONTACT_TO_EMAIL`.
 *
 * @throws When it isn't set.
 */
function inbox(): string {
  const to = process.env.CONTACT_TO_EMAIL

  if (!to) {
    throw new Error(
      "No inbox for tests and replies. Set `CONTACT_TO_EMAIL` in this Vercel environment."
    )
  }

  return to
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

export default {
  /**
   * Counts, previews or sends a notice to everyone whose message is kept.
   *
   * @param request - A POST carrying `PRIVACY_NOTICE_SECRET`, the mode and the notice.
   *
   * @returns What was counted or sent.
   */
  async fetch(request: Request): Promise<Response> {
    const secret = process.env.PRIVACY_NOTICE_SECRET

    // Without the secret set, anyone could email everyone; refusing is safer
    // than running unguarded.
    if (
      !secret ||
      request.headers.get("authorization") !== `Bearer ${secret}`
    ) {
      return new Response(null, { status: 401 })
    }

    if (request.method !== "POST") {
      return new Response(null, { headers: { Allow: "POST" }, status: 405 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      mode?: string
      notice?: unknown
    }
    const mode = MODES.find((candidate) => candidate === body.mode)
    const notice = readNoticeInput(body.notice)

    if (!mode || !notice) {
      return json(
        {
          error: `Send a \`mode\` (${MODES.join(", ")}) and a \`notice\` with a subject and a body for each of ${LOCALES.join(", ")}.`,
        },
        400
      )
    }

    const site = new URL(request.url).origin

    // Only Luca can call this, so the real error is more use to him than a
    // generic one.
    try {
      if (mode === "test") return json(await test(notice, site))

      const recipients = await listRecipients()

      if (mode === "send") return json(await send(notice, recipients, site))

      const byLocale = Object.fromEntries(
        LOCALES.map((locale) => [
          locale,
          recipients.filter((recipient) => localeOf(recipient) === locale)
            .length,
        ])
      )

      return json({ byLocale, mode, recipients: recipients.length })
    } catch (error) {
      console.error(error)

      return json({ error: String(error) }, 500)
    }
  },
}

/**
 * Sends every language version to Luca's own inbox, to check them before
 * anyone else gets one.
 *
 * @param notice - The notice in every language.
 * @param site - The site's origin.
 *
 * @returns How many versions were sent.
 *
 * @throws When `CONTACT_TO_EMAIL` isn't set.
 */
async function test(notice: Notice, site: string) {
  const to = inbox()

  for (const locale of LOCALES) {
    const email = renderNotice(
      locale,
      notice[locale],
      await readFrame(locale),
      "Luca",
      site
    )

    await sendEmail({
      html: email.html,
      subject: `[Test, ${locale}] ${email.subject}`,
      tags: ["policy-notice", "test"],
      text: email.text,
      to: { email: to },
    })
  }

  return { mode: "test", sent: LOCALES.length, to }
}

/**
 * Sends the notice to everyone, one email each, and records that it went out.
 *
 * @param notice - The notice in every language.
 * @param recipients - Everyone whose message is kept.
 * @param site - The site's origin.
 *
 * @returns How many it reached and how many failed.
 */
async function send(notice: Notice, recipients: Recipient[], site: string) {
  // The sender has no mailbox, and the email invites a reply. Looked up before
  // anything goes out, so a missing inbox stops the run instead of every send.
  const replyTo = { email: inbox() }
  let delivered = 0
  let failed = 0

  // One email each, so nobody sees anyone else's address, sent one after
  // another, which keeps a short list well inside Brevo's rate limits.
  for (const recipient of recipients) {
    const locale = localeOf(recipient)
    const email = renderNotice(
      locale,
      notice[locale],
      await readFrame(locale),
      recipient.name,
      site
    )

    const message = {
      html: email.html,
      idempotencyKey: randomUUID(),
      replyTo,
      subject: email.subject,
      tags: ["policy-notice"],
      text: email.text,
      to: { email: recipient.email, name: recipient.name },
    }

    // Brevo now and then fails for a moment (a 5xx, a dropped connection),
    // and one person missing a legal notice over that isn't acceptable. The
    // retry carries the same key, so if the first attempt did go through,
    // Brevo answers `duplicate_parameter` instead of sending it again.
    try {
      await sendEmail(message).catch(async () => {
        await new Promise((resolve) => setTimeout(resolve, RETRY_AFTER))
        await sendEmail(message).catch((error: unknown) => {
          if (!String(error).includes("duplicate_parameter")) throw error
        })
      })
      delivered += 1
    } catch (error) {
      console.error(error)
      failed += 1
    }
  }

  await recordNotice({
    delivered,
    failed,
    id: randomUUID(),
    policyVersion: (await readNotice(DEFAULT_LOCALE)).version,
    recipients: recipients.length,
    sentAt: new Date().toISOString(),
    subject: notice[DEFAULT_LOCALE].subject,
  })

  return { delivered, failed, mode: "send", recipients: recipients.length }
}
