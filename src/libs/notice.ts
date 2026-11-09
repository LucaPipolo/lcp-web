import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { parse } from "yaml"

import { type Locale, LOCALES } from "./i18n.js"
import { fillPlaceholders } from "./template.js"

/**
 * We decided to keep the parts of a notice that never change (the greeting,
 * why someone is getting it, how to object) in content files the server
 * reads, rather than in each notice, so a notice can't go out without them.
 * Only the subject and the body are written for each occasion.
 */

const EMAILS = join(process.cwd(), "src/content/emails/notice")

/** What's written for one notice, in one language. */
export interface NoticeCopy {
  /** Paragraphs separated by a blank line. Plain text: no markup. */
  body: string
  subject: string
}

/** One notice, written in every language the site has. */
export type Notice = Record<Locale, NoticeCopy>

/** The fixed copy around every notice, in one language. */
interface Frame {
  /** Opens the email, with `{name}` for the recipient's name. */
  greeting: string
  /** The privacy policy, as linked from the email. */
  privacy: { href: string; label: string }
  /** Why they're getting it, so it never reads as marketing. */
  reason: string
  /** How to object or ask for deletion. */
  rights: string
  signature: string
}

/** A notice ready to send to one person. */
export interface RenderedNotice {
  html: string
  subject: string
  text: string
}

/**
 * Checks what the trigger sent is a complete notice.
 *
 * @param value - The parsed request body's `notice`.
 *
 * @returns The notice, or `undefined` when a language or a field is missing.
 */
export function readNoticeInput(value: unknown): Notice | undefined {
  if (typeof value !== "object" || value === null) return undefined

  const notice = value as Record<string, unknown>

  for (const locale of LOCALES) {
    const copy = notice[locale] as Partial<NoticeCopy> | undefined

    if (
      typeof copy?.subject !== "string" ||
      typeof copy.body !== "string" ||
      !copy.subject.trim() ||
      !copy.body.trim()
    ) {
      return undefined
    }
  }

  return notice as Notice
}

/**
 * Reads the fixed copy around a notice.
 *
 * @param locale - The recipient's language.
 *
 * @returns The greeting, reason, rights and signature in that language.
 *
 * @throws When the content file isn't there, which on Vercel means
 *   `includeFiles` in `vercel.json` no longer covers it.
 */
export async function readFrame(locale: Locale): Promise<Frame> {
  return parse(await readFile(join(EMAILS, `${locale}.yaml`), "utf8")) as Frame
}

const ESCAPES: Record<string, string> = {
  '"': "&quot;",
  "&": "&amp;",
  "'": "&#39;",
  "<": "&lt;",
  ">": "&gt;",
}

/**
 * Escapes text for HTML.
 *
 * @param text - Anything that isn't markup already.
 *
 * @returns The text, safe to put between tags or in an attribute.
 */
function escape(text: string): string {
  return text.replace(/["&'<>]/g, (character) => ESCAPES[character])
}

/**
 * Splits text into its paragraphs.
 *
 * @param text - Paragraphs separated by a blank line.
 *
 * @returns Each paragraph, with its own line breaks folded into spaces.
 */
function paragraphs(text: string): string[] {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean)
}

/**
 * Builds the email one person gets.
 *
 * @param locale - Their language.
 * @param copy - The notice in that language.
 * @param frame - The fixed copy in that language.
 * @param name - Their name, as they wrote it in the form.
 * @param site - The site's origin, to make the privacy link absolute.
 *
 * @returns The subject, a plain-text version and an HTML version.
 */
export function renderNotice(
  locale: Locale,
  copy: NoticeCopy,
  frame: Frame,
  name: string,
  site: string
): RenderedNotice {
  const greeting = fillPlaceholders(frame.greeting, { name: name.trim() })
  const privacy = new URL(frame.privacy.href, site).href
  const body = paragraphs(copy.body)
  const closing = [frame.rights, frame.reason]

  const text = [
    greeting,
    ...body,
    `${frame.privacy.label}: ${privacy}`,
    ...closing,
    frame.signature,
  ].join("\n\n")

  const paragraph = (content: string, style = "") =>
    `<p style="margin:0 0 16px;${style}">${escape(content)}</p>`

  // Email clients ignore stylesheets, so every style is inline and the layout
  // is a table: the one thing every client agrees on.
  const html = `<!doctype html>
<html lang="${locale}">
<body style="margin:0;padding:0;background:#f5f5f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e5e5;">
<tr><td style="padding:24px 32px;border-bottom:1px solid #e5e5e5;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;letter-spacing:0.04em;color:#171717;">
<span style="color:#d62f4b;">*</span> lucapipolo.com
</td></tr>
<tr><td style="padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#171717;">
${paragraph(greeting)}
${body.map((content) => paragraph(content)).join("\n")}
<p style="margin:24px 0;"><a href="${escape(privacy)}" style="display:inline-block;padding:12px 20px;background:#171717;color:#ffffff;text-decoration:none;font-weight:600;">${escape(frame.privacy.label)}</a></p>
${paragraph(frame.signature, "margin-bottom:0;")}
</td></tr>
<tr><td style="padding:24px 32px;border-top:1px solid #e5e5e5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:#737373;">
${closing.map((content) => paragraph(content)).join("\n")}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

  return { html, subject: copy.subject.trim(), text }
}
