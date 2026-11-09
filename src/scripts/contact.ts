import { TURNSTILE_SITE_KEY } from "astro:env/client"

import {
  checkContact,
  checkField,
  CONTACT_FIELDS,
  type ContactError,
  type ContactField,
} from "@/libs/contact"

import { register } from "@/scripts/alpine"

/** Where the form is sent. */
const ENDPOINT = "/api/contact"

const TURNSTILE_SCRIPT =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

/**
 * How long a submission waits for Turnstile, in ms, when the Visitor is faster
 * than the check. Past that, it's blocked or broken, and waiting longer won't
 * help.
 */
const TURNSTILE_TIMEOUT = 10_000

/** The part of Cloudflare's Turnstile API the form uses. */
interface Turnstile {
  render(container: HTMLElement, options: Record<string, unknown>): string
  reset(widget: string): void
}

declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

/** Codes the server can answer with beyond a field failing its rules. */
type ServerError = "generic" | "rateLimited" | "verification"

type Copy = Record<ContactError | ServerError, string>

/** The fields that can carry an error, in the order the form shows them. */
const ORDER = ["reason", ...CONTACT_FIELDS, "acknowledged"] as const

type Checked = (typeof ORDER)[number]

register("contactForm", () => {
  // Copy and hints are read from the markup once and never change, so they
  // stay out of the component's state.
  let copy = {} as Copy
  let hints: Record<string, string> = {}
  let startedAt = 0

  // A token proves one submission only, so it's dropped after every attempt,
  // and anything already waiting on it is answered when the next one arrives.
  let token = ""
  let waiting: ((token: string) => void)[] = []
  let widget: string | undefined

  /**
   * Hands over the current token, or the next one Turnstile issues.
   *
   * @returns The token, or an empty string when none came in time.
   */
  function verified(): Promise<string> {
    if (token) return Promise.resolve(token)

    return new Promise((resolve) => {
      waiting.push(resolve)
      setTimeout(() => resolve(""), TURNSTILE_TIMEOUT)
    })
  }

  /**
   * Loads Turnstile and draws its widget, which stays invisible unless it
   * needs the Visitor to interact.
   *
   * @param container - Where the widget goes.
   */
  function protect(container: HTMLElement) {
    const script = document.createElement("script")

    script.src = TURNSTILE_SCRIPT
    script.async = true
    script.addEventListener("load", () => {
      widget = window.turnstile?.render(container, {
        appearance: "interaction-only",
        callback: (issued: string) => {
          token = issued
          for (const resolve of waiting) resolve(issued)
          waiting = []
        },
        "error-callback": () => {
          token = ""
        },
        "expired-callback": () => {
          token = ""
        },
        language: document.documentElement.lang,
        sitekey: TURNSTILE_SITE_KEY,
      })
    })

    document.head.append(script)
  }

  /**
   * Spends the current token: Cloudflare accepts each one once, so the next
   * attempt needs a fresh one.
   */
  function spend() {
    token = ""
    if (widget) window.turnstile?.reset(widget)
  }

  return {
    acknowledged: false,
    email: "",
    errors: {} as Partial<Record<Checked, ContactError>>,
    failure: "",
    message: "",
    name: "",
    reason: "",
    status: "idle" as "failed" | "idle" | "sending" | "sent",
    website: "",

    /**
     * Reads the copy out of the markup and starts the clock that tells a
     * person from a script.
     */
    init() {
      copy = JSON.parse(this.$el.dataset.errors ?? "{}") as Copy
      hints = Object.fromEntries(
        [...this.$el.querySelectorAll<HTMLInputElement>("[data-hint]")].map(
          (input) => [input.value, input.dataset.hint ?? ""]
        )
      )
      startedAt = Date.now()

      if (this.$refs.turnstile) protect(this.$refs.turnstile)
    },

    /**
     * Suggests what to write, once the Visitor has said what it's about.
     *
     * @param el - The message field, whose own placeholder is the fallback.
     *
     * @returns The hint for the reason picked, or the field's placeholder.
     */
    placeholder(el: HTMLElement) {
      return hints[this.reason] || el.dataset.placeholder || ""
    },

    /**
     * Rechecks a field as the Visitor leaves it, but only once it has had
     * something typed into it: an error on a field nobody has reached yet
     * reads as being told off in advance.
     *
     * @param el - The field being left.
     */
    check(el: HTMLElement) {
      const field = el.dataset.field as ContactField

      if (!this[field] && !this.errors[field]) return

      this.errors = { ...this.errors, [field]: checkField(field, this[field]) }
    },

    /**
     * Clears a field's error the moment it's put right, rather than waiting
     * for the Visitor to leave it.
     *
     * @param el - The field being changed.
     */
    recheck(el: HTMLElement) {
      const field = el.dataset.field as Checked

      if (!this.errors[field]) return

      const errors = checkContact(this)

      this.errors = { ...this.errors, [field]: errors[field] }
    },

    /**
     * @param el - A field, or the element that shows its error.
     *
     * @returns The field's error message, or nothing when it passes.
     */
    errorFor(el: HTMLElement) {
      const code = this.errors[el.dataset.field as Checked]

      return code ? copy[code] : ""
    },

    /**
     * @param el - A field, or the element that shows its error.
     *
     * @returns Whether the field currently fails.
     */
    hasError(el: HTMLElement) {
      return Boolean(this.errors[el.dataset.field as Checked])
    },

    /** @returns Whether a submission is on its way. */
    sending() {
      return this.status === "sending"
    },

    /** @returns Whether the message went through. */
    sent() {
      return this.status === "sent"
    },

    /** @returns Whether sending failed for a reason no field explains. */
    failed() {
      return this.status === "failed"
    },

    /**
     * Checks everything, then sends it, or points the Visitor at the first
     * thing to fix.
     */
    async submit() {
      if (this.sending()) return

      this.errors = checkContact(this)

      const first = ORDER.find((field) => this.errors[field])

      if (first) {
        this.$el.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus()

        return
      }

      this.status = "sending"
      this.failure = ""

      const proof = await verified()

      if (!proof) {
        this.fail("verification")

        return
      }

      try {
        const response = await fetch(ENDPOINT, {
          body: JSON.stringify({
            acknowledged: this.acknowledged,
            elapsed: Date.now() - startedAt,
            email: this.email,
            locale: document.documentElement.lang,
            message: this.message,
            name: this.name,
            page: location.pathname,
            reason: this.reason,
            token: proof,
            website: this.website,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        })

        spend()

        if (response.ok) {
          this.status = "sent"
          this.$nextTick(() => this.$refs.success?.focus())

          return
        }

        // The firewall answers this one before the endpoint runs, so it comes
        // without the JSON body every other failure carries.
        if (response.status === 429) {
          this.fail("rateLimited")

          return
        }

        const body = (await response.json().catch(() => ({}))) as {
          error?: ServerError
          fields?: Partial<Record<Checked, ContactError>>
        }

        if (body.fields) {
          this.errors = body.fields
          this.status = "idle"

          return
        }

        this.fail(body.error ?? "generic")
      } catch {
        spend()
        this.fail("generic")
      }
    },

    /**
     * Shows why sending failed when no single field is to blame.
     *
     * @param code - What the server, or the network, answered with.
     */
    fail(code: ServerError) {
      this.failure = copy[code] ?? copy.generic
      this.status = "failed"
    },
  }
})
