/**
 * We decided to call Brevo's HTTP API directly rather than through its SDK
 * because one POST is all the site needs, and a dependency for it would be
 * more to keep up to date than the code it saves.
 */

const ENDPOINT = "https://api.brevo.com/v3/smtp/email"

/**
 * Who the site's own emails come from. The domain is authenticated in Brevo,
 * which is what lets them pass DMARC instead of landing in spam.
 */
const SENDER = { email: "website@lucapipolo.com", name: "lucapipolo.com" }

/** An address, with the name to show beside it. */
interface Address {
  email: string
  name?: string
}

/** One plain-text email. */
export interface Email {
  replyTo?: Address
  subject: string
  tags?: string[]
  text: string
  to: Address
}

/**
 * Sends an email through Brevo.
 *
 * Plain text only: nothing a Visitor typed can turn into markup in the inbox
 * reading it.
 *
 * @param email - What to send, and to whom.
 *
 * @throws When the API key is missing or Brevo refuses the email, because a
 *   message that silently goes nowhere is worse than an error.
 */
export async function sendEmail(email: Email): Promise<void> {
  const key = process.env.BREVO_API_KEY

  if (!key) {
    throw new Error(
      "No Brevo API key. Set `BREVO_API_KEY` in this Vercel environment."
    )
  }

  const response = await fetch(ENDPOINT, {
    body: JSON.stringify({
      replyTo: email.replyTo,
      sender: SENDER,
      subject: email.subject,
      tags: email.tags,
      textContent: email.text,
      to: [email.to],
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": key,
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(
      `Brevo refused the email (${response.status}): ${await response.text()}. Check the API key and that ${SENDER.email} is an allowed sender.`
    )
  }
}
