/**
 * We decided to keep the contact form's rules in one module that both the
 * browser and the `api/contact` function import, because two copies drift: a
 * message the page lets through and the server turns down reads as a bug to
 * whoever wrote it.
 */

/** Why someone is getting in touch, as the form sends it. */
export const CONTACT_REASONS = [
  "job",
  "project",
  "collaboration",
  "other",
] as const

export type ContactReason = (typeof CONTACT_REASONS)[number]

/** The text fields a Visitor fills in. */
export const CONTACT_FIELDS = ["name", "email", "message"] as const

export type ContactField = (typeof CONTACT_FIELDS)[number]

/**
 * Lengths each field is held to, in characters. Only the message has a real
 * minimum: a short name is still a name, and the address pattern already
 * turns down one too short to work.
 */
export const LIMITS = {
  name: { min: 1, max: 100 },
  email: { min: 1, max: 254 },
  message: { min: 20, max: 5000 },
} as const satisfies Record<ContactField, { max: number; min: number }>

/** More links than this reads as spam rather than as a message. */
export const MAX_LINKS = 3

/**
 * The quickest a person fills the form in, in ms. Anything faster was a
 * script, which never pauses to read.
 */
export const MIN_ELAPSED = 3000

/** What a failed check is called, matching the page's `errors` copy. */
export type ContactError =
  "acknowledgement" | "email" | "links" | "required" | "tooLong" | "tooShort"

/** What the form sends, before anything about it is trusted. */
export interface ContactInput {
  acknowledged: boolean
  email: string
  message: string
  name: string
  reason: string
}

// Deliberately loose: the only proof an address works is a reply reaching it,
// so this just catches the typo that would leave nowhere to reply to.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const LINK = /https?:\/\/|www\./gi

/**
 * Checks one text field against its rules.
 *
 * @param field - Which field the value belongs to.
 * @param value - What was typed, untrimmed.
 *
 * @returns The first rule it breaks, or `undefined` when it passes.
 */
export function checkField(
  field: ContactField,
  value: string
): ContactError | undefined {
  const text = value.trim()
  const { max, min } = LIMITS[field]

  if (!text) return "required"
  if (field === "email" && !EMAIL.test(text)) return "email"
  if (text.length < min) return "tooShort"
  if (text.length > max) return "tooLong"
  if (field === "message" && (text.match(LINK)?.length ?? 0) > MAX_LINKS) {
    return "links"
  }

  return undefined
}

/**
 * Checks a whole submission.
 *
 * @param input - What the form sent.
 *
 * @returns Every field that fails, keyed by name; empty when all pass. The
 *   reason is checked too, since the server can't trust the page to send one
 *   of the four it offers.
 */
export function checkContact(
  input: ContactInput
): Partial<Record<"acknowledged" | "reason" | ContactField, ContactError>> {
  const errors: Partial<
    Record<"acknowledged" | "reason" | ContactField, ContactError>
  > = {}

  for (const field of CONTACT_FIELDS) {
    const error = checkField(field, input[field])

    if (error) errors[field] = error
  }

  if (!CONTACT_REASONS.includes(input.reason as ContactReason)) {
    errors.reason = "required"
  }

  if (input.acknowledged !== true) errors.acknowledged = "acknowledgement"

  return errors
}
