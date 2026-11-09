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
            website: this.website,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        })

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
