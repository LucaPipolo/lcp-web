import { normalize } from "@/libs/search"
import { fillPlaceholders } from "@/libs/template"

import { register } from "@/scripts/alpine"
import { chooseTheme, clearThemeChoice } from "@/scripts/theme"

/** How far each arrow key moves the highlight through the results. */
const STEPS: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 }

/** How long a command says it copied before the palette closes, in ms. */
const COPIED_DELAY = 1000

/**
 * Reads the address to share for the page, its canonical one where it has
 * one, so a link copied mid-page carries no stray hash or query.
 *
 * @returns The page's address.
 */
function pageAddress(): string {
  return (
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ??
    location.href
  )
}

/**
 * Puts text on the clipboard.
 *
 * @param text - What to copy.
 *
 * @returns Whether the browser allowed it. A refused clipboard is the
 *   Visitor's decision to have made, so it is not treated as a failure.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

register("commandPalette", () => {
  // Read from the markup once and kept out of the component's state: they
  // never change, and the CSP build refuses writes to DOM objects anyway.
  let options: HTMLElement[] = []
  let texts = new Map<HTMLElement, string>()
  let labels = { empty: "", one: "", other: "" }
  let plurals = new Intl.PluralRules()

  return {
    query: "",
    activeId: "",
    copiedId: "",

    /**
     * Reads every command the page rendered, and the words each one answers
     * to, which are its label and its group's.
     */
    init() {
      const root = this.$el
      options = [...root.querySelectorAll<HTMLElement>('[role="option"]')]
      texts = new Map(
        options.map((option) => [
          option,
          normalize(option.dataset.search ?? option.textContent ?? ""),
        ])
      )
      labels = {
        empty: root.dataset.empty ?? "",
        one: root.dataset.resultsOne ?? "",
        other: root.dataset.resultsOther ?? "",
      }
      plurals = new Intl.PluralRules(document.documentElement.lang)
    },

    /**
     * Tells whether a command answers to every word typed so far, in any
     * order and whatever their accents.
     *
     * @param option - The command.
     *
     * @returns Whether it stays listed.
     */
    matches(option: HTMLElement) {
      const text = texts.get(option) ?? ""
      return normalize(this.query)
        .split(/\s+/)
        .every((term) => text.includes(term))
    },

    /**
     * Lists the commands still matching, in the order they are shown.
     *
     * @returns The matching commands.
     */
    results() {
      return options.filter((option) => this.matches(option))
    },

    /**
     * Tells whether a group still holds a match, so an emptied one hides
     * its heading too.
     *
     * @param group - The group.
     *
     * @returns Whether any of its commands match.
     */
    hasMatches(group: HTMLElement) {
      return this.results().some((option) => group.contains(option))
    },

    /**
     * Tells whether anything at all matches.
     *
     * @returns Whether there are results to show.
     */
    hasResults() {
      return this.results().length > 0
    },

    /**
     * Words the count of results for screen readers.
     *
     * @returns The announcement.
     */
    status() {
      const count = this.results().length
      if (count === 0) return labels.empty

      const label = plurals.select(count) === "one" ? labels.one : labels.other
      return fillPlaceholders(label, { count: String(count) })
    },

    /**
     * Tells whether a command is the highlighted one.
     *
     * @param option - The command.
     *
     * @returns Whether Enter would run it.
     */
    isActive(option: HTMLElement) {
      return option.id === this.activeId
    },

    /**
     * Highlights a command, which is what the pointer does on its way over.
     *
     * @param option - The command.
     */
    activate(option: HTMLElement) {
      this.activeId = option.id
    },

    /**
     * Highlights the first result, as the list changes under the typing.
     */
    search() {
      this.activeId = this.results()[0]?.id ?? ""
    },

    /**
     * Moves the highlight with the arrow keys, wrapping at either end, and
     * runs the highlighted command on Enter.
     *
     * Focus never leaves the input: the highlight is only ever announced
     * through `aria-activedescendant`, so typing carries on uninterrupted.
     *
     * @param event - The key pressed in the input.
     */
    move(event: KeyboardEvent) {
      const results = this.results()
      const from = results.findIndex((option) => option.id === this.activeId)

      if (event.key === "Enter") {
        event.preventDefault()
        results[from]?.click()
        return
      }

      const step = STEPS[event.key]
      if (step === undefined || results.length === 0) return

      event.preventDefault()

      const next = results[(from + step + results.length) % results.length]
      this.activeId = next.id
      next.scrollIntoView({ block: "nearest" })
    },

    /**
     * Opens the palette on a fresh search.
     */
    open() {
      const dialog = this.$refs.dialog as HTMLDialogElement | undefined
      if (!dialog || dialog.open) return

      this.query = ""
      this.copiedId = ""
      this.search()
      dialog.showModal()
    },

    /**
     * Closes the palette. The browser hands focus back to whatever held it
     * before the palette opened.
     */
    close() {
      ;(this.$refs.dialog as HTMLDialogElement | undefined)?.close()
    },

    /**
     * Names the shortcut the way the Visitor's keyboard labels it.
     *
     * @returns `⌘K` on Apple devices, `Ctrl K` everywhere else.
     */
    shortcutLabel() {
      return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl K"
    },

    /**
     * Opens or closes the palette on Cmd+K, or Ctrl+K off a Mac.
     *
     * @param event - Any key pressed on the page.
     */
    shortcut(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k") return
      if (!event.metaKey && !event.ctrlKey) return

      event.preventDefault()

      const dialog = this.$refs.dialog as HTMLDialogElement | undefined
      if (dialog?.open) this.close()
      else this.open()
    },

    /**
     * Runs the command clicked, or chosen with Enter, which clicks it.
     *
     * A link is left to the browser and only closes the palette, so a link to
     * a section of the page already open does not leave the palette covering
     * it. A command that runs in place is dispatched by its `data-command`.
     *
     * @param event - A click anywhere in the list.
     */
    async choose(event: MouseEvent) {
      if (!(event.target instanceof Element)) return

      const option = event.target.closest<HTMLElement>('[role="option"]')
      if (!option) return

      const { command, value = "" } = option.dataset

      if (command === "theme") {
        if (value === "light" || value === "dark") chooseTheme(value)
        else clearThemeChoice()
      }

      if (command === "copy") {
        const copied = await copyText(value || pageAddress())

        // Lingering on the confirmation is the only sign the copy worked;
        // a refused clipboard has nothing to confirm, so it closes at once.
        if (copied) {
          this.copiedId = option.id
          await new Promise((resolve) => setTimeout(resolve, COPIED_DELAY))
          this.copiedId = ""
        }
      }

      this.close()
    },

    /**
     * Tells whether the command holding an element just copied something.
     *
     * @param element - The command, or an element inside it.
     *
     * @returns Whether it should read as copied.
     */
    isCopied(element: HTMLElement) {
      const id = element.closest('[role="option"]')?.id
      return id !== undefined && id === this.copiedId
    },

    /**
     * Closes the palette on a click outside its panel, which lands on the
     * dialog itself, as only its backdrop can.
     *
     * @param event - A click on the dialog.
     */
    dismiss(event: MouseEvent) {
      if (event.target === this.$refs.dialog) this.close()
    },
  }
})
