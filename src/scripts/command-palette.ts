import type { PostIndexEntry } from "@/libs/blog"

import * as Sentry from "@sentry/astro"

import { normalize } from "@/libs/search"
import { fillPlaceholders } from "@/libs/template"

import { register } from "@/scripts/alpine"
import { chooseTheme, clearThemeChoice } from "@/scripts/theme"

/** How far each arrow key moves the highlight through the results. */
const STEPS: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 }

/**
 * We decided to list at most this many posts, newest first, because the
 * palette is for jumping somewhere quickly: past a handful, typing more narrows
 * faster than scrolling, and the blog's own search is there for browsing them
 * all.
 */
const POST_LIMIT = 5

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

/** A post as the palette lists it, with what its option binds. */
interface PostOption extends PostIndexEntry {
  id: string
  search: string
}

/**
 * Narrows what the posts list returned to the entries it promises.
 *
 * @param value - One item of the parsed response.
 *
 * @returns Whether it is a post the palette can list.
 */
function isPostIndexEntry(value: unknown): value is PostIndexEntry {
  if (typeof value !== "object" || value === null) return false

  const { href, tags, title } = value as Record<string, unknown>

  return (
    typeof href === "string" &&
    typeof title === "string" &&
    Array.isArray(tags) &&
    tags.every((tag) => typeof tag === "string")
  )
}

register("commandPalette", () => {
  // Kept out of the component's state: read once, never reactive, and the
  // CSP build refuses writes to DOM objects anyway.
  let root: HTMLElement | undefined
  let labels = { empty: "", one: "", other: "" }
  let plurals = new Intl.PluralRules()
  let postsRequested = false

  return {
    query: "",
    activeId: "",
    copiedId: "",
    posts: [] as PostOption[],
    // Bumped once the list has rendered, so whatever reads it reads it anew.
    renders: 0,

    /**
     * Reads the labels the markup carries for what the script words itself.
     */
    init() {
      root = this.$el
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
      return this.answers(option.dataset.search ?? "")
    },

    /**
     * Tells whether a text holds every word typed so far, in any order and
     * whatever their accents.
     *
     * @param text - What a command answers to.
     *
     * @returns Whether it matches the search.
     */
    answers(text: string) {
      const haystack = normalize(text)
      return normalize(this.query)
        .split(/\s+/)
        .every((term) => haystack.includes(term))
    },

    /**
     * Lists the posts to render: the newest that match, up to the limit.
     *
     * @returns The posts.
     */
    shownPosts() {
      return this.posts
        .filter((post) => this.answers(post.search))
        .slice(0, POST_LIMIT)
    },

    /**
     * Lists the commands still matching, in the order they are shown.
     *
     * @returns The matching commands.
     */
    results() {
      // Read live, since the posts rendered change with the search; reading
      // `renders` runs every binding asking again once they have.
      if (!root || this.renders < 0) return []

      return [...root.querySelectorAll<HTMLElement>('[role="option"]')].filter(
        (option) => this.matches(option)
      )
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
      this.refresh(false)
    },

    /**
     * Reads the list again once Alpine has rendered the posts it now shows.
     *
     * @param keep - Whether a highlight still showing stays where it is,
     *   rather than going back to the first result.
     */
    refresh(keep: boolean) {
      this.$nextTick(() => {
        this.renders++

        const results = this.results()
        if (keep && results.some((option) => option.id === this.activeId)) {
          return
        }

        this.activeId = results[0]?.id ?? ""
      })
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

      void this.loadPosts()
    },

    /**
     * Fetches the posts, once, the first time the palette opens.
     *
     * A failure leaves the palette working without them. One the site caused,
     * a missing or malformed list, is reported; a network that dropped is the
     * Visitor's, and only means trying again on the next open.
     */
    async loadPosts() {
      const href = root?.dataset.posts
      if (!href || postsRequested) return

      postsRequested = true

      let response: Response
      try {
        response = await fetch(href)
      } catch {
        postsRequested = false
        return
      }

      const entries: unknown = response.ok
        ? await response.json().catch(() => undefined)
        : undefined

      if (!Array.isArray(entries) || !entries.every(isPostIndexEntry)) {
        Sentry.captureException(
          new Error(
            `The command palette could not list posts from ${href} (HTTP ${response.status}).`
          )
        )
        return
      }

      const group = root?.dataset.postsLabel ?? ""

      this.posts = entries.map((entry, index) => ({
        ...entry,
        id: `command-palette-post-${index}`,
        search: [group, entry.title, ...entry.tags].join(" "),
      }))

      // Typed ahead of the posts, the highlight may have nothing left to sit
      // on; one the Visitor moved and still showing stays where it is.
      this.refresh(true)
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
