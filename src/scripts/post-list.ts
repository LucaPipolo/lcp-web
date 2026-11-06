import { fillPlaceholders } from "@/libs/template"

import { register } from "@/scripts/alpine"

/** How long typing has to pause before the address catches up, in ms. */
const URL_DELAY = 300

/** The longest search the address will carry back in. */
const MAX_QUERY = 100

/** What each part of the state is called in the page's address. */
const PARAMS = { page: "page", query: "q", tag: "tag" } as const

/** A post in the list, as much of it as the search reads. */
interface Entry {
  tags: string[]
  text: string
}

/**
 * Puts text in the form the search compares: lower case, and with its accents
 * taken off, so that `cache` finds `caché` and the other way round.
 *
 * @param text - What to normalise.
 *
 * @returns The comparable form.
 */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
}

register("postList", () => {
  // The posts are read from the markup once and never change, so they are
  // kept out of the component's state: there is nothing to gain from making
  // them reactive.
  let entries: Entry[] = []
  let pageSize = 1
  let templates = {
    filteredOne: "",
    filteredOther: "",
    one: "",
    other: "",
    page: "",
  }
  let plural = new Intl.PluralRules()
  let root: HTMLElement | undefined
  let timer = 0

  return {
    filtersOpen: false,
    page: 1,
    query: "",
    tags: [] as string[],

    /**
     * Reads the posts and the copy out of the markup, then restores the
     * state the address carries, so a filtered view can be shared or reloaded.
     *
     * The address is the Visitor's to edit, so what it carries is checked:
     * tags no post has are dropped, repeats are folded into one, and a page
     * out of range is brought back in.
     */
    init() {
      root = this.$el

      const data = this.$el.dataset

      pageSize = Math.max(1, Number(data.pageSize) || 1)
      templates = {
        filteredOne: data.filteredOne ?? "",
        filteredOther: data.filteredOther ?? "",
        one: data.resultsOne ?? "",
        other: data.resultsOther ?? "",
        page: data.pageStatus ?? "",
      }
      plural = new Intl.PluralRules(document.documentElement.lang || undefined)

      entries = [
        ...this.$el.querySelectorAll<HTMLElement>("[data-post-index]"),
      ].map((element) => ({
        tags: (element.dataset.postTags ?? "").split("|").filter(Boolean),
        text: normalize(element.dataset.postText ?? ""),
      }))

      const params = new URLSearchParams(location.search)
      const known = new Set(entries.flatMap((entry) => entry.tags))

      this.query = (params.get(PARAMS.query) ?? "").slice(0, MAX_QUERY)
      this.tags = [...new Set(params.getAll(PARAMS.tag))].filter((tag) =>
        known.has(tag)
      )
      this.page = Math.min(
        Math.max(1, Math.trunc(Number(params.get(PARAMS.page))) || 1),
        this.pages
      )
    },

    /**
     * The positions of the posts that pass the search and the tags.
     *
     * A post passes the tags with any one of them, not all: tags name
     * alternative subjects, so picking a second widens what is shown.
     */
    get matches(): number[] {
      const terms = normalize(this.query).split(/\s+/).filter(Boolean)

      return entries.flatMap((entry, index) =>
        (this.tags.length === 0 ||
          entry.tags.some((tag) => this.tags.includes(tag))) &&
        terms.every((term) => entry.text.includes(term))
          ? [index]
          : []
      )
    },

    /** How many pages the matching posts fill, never fewer than one. */
    get pages(): number {
      return Math.max(1, Math.ceil(this.matches.length / pageSize))
    },

    /** Whether there is more than one page to move between. */
    get paged(): boolean {
      return this.pages > 1
    },

    /** Whether a search or a tag is narrowing the list down. */
    get filtered(): boolean {
      return this.query.trim() !== "" || this.tags.length > 0
    },

    /** Whether the line under the search has anything to show: a count, tags. */
    get detailed(): boolean {
      return this.filtered || this.filtersOpen
    },

    /** Whether any tag is picked, which the button that opens them shows. */
    get hasTags(): boolean {
      return this.tags.length > 0
    },

    /**
     * Says which tags are picked, small enough to sit on a button.
     *
     * @returns The tag itself when there is one, how many when there are more.
     */
    badge(): string {
      return this.tags.length === 1 ? this.tags[0] : String(this.tags.length)
    },

    /** Whether nothing passes, which is when the list says so instead. */
    get empty(): boolean {
      return this.matches.length === 0
    },

    get hasPrevious(): boolean {
      return this.page > 1
    },

    get hasNext(): boolean {
      return this.page < this.pages
    },

    /**
     * Tells a post whether it is on the page being shown.
     *
     * @param element - The post asking, passed from the markup as `$el`.
     *
     * @returns Whether it matches and falls on the current page.
     */
    shows(element: HTMLElement): boolean {
      const start = (this.page - 1) * pageSize

      return this.matches
        .slice(start, start + pageSize)
        .includes(Number(element.dataset.postIndex))
    },

    /**
     * Tells a tag button whether its tag is picked.
     *
     * @param element - The button asking, passed from the markup as `$el`.
     *
     * @returns `aria-pressed` as the attribute writes it.
     */
    pressed(element: HTMLElement): "false" | "true" {
      return this.tags.includes(element.dataset.tag ?? "") ? "true" : "false"
    },

    /**
     * Picks the tag a button names, or puts it back if it was picked.
     *
     * @param element - The button pressed, passed from the markup as `$el`.
     */
    pick(element: HTMLElement) {
      const tag = element.dataset.tag ?? ""

      this.tags = this.tags.includes(tag)
        ? this.tags.filter((picked) => picked !== tag)
        : [...this.tags, tag]
      this.page = 1
      this.sync()
    },

    /** Starts the results over from their first page as the search changes. */
    search() {
      this.page = 1
      this.sync()
    },

    /** Empties the search box, as Escape does in any search field. */
    clearQuery() {
      this.query = ""
      this.search()
    },

    toggleFilters() {
      this.filtersOpen = !this.filtersOpen
    },

    /**
     * Tells the button that opens the tags whether they are open.
     *
     * @returns `aria-expanded` as the attribute writes it.
     */
    expanded(): "false" | "true" {
      return this.filtersOpen ? "true" : "false"
    },

    /** Takes the search and the tag off, back to every post. */
    clear() {
      this.query = ""
      this.tags = []
      this.page = 1
      this.sync()
    },

    previous() {
      this.turn(-1)
    },

    next() {
      this.turn(1)
    },

    /**
     * Moves a page along, and back up to where the list starts, since the
     * button pressed sits below the posts the Visitor wants to read.
     *
     * @param step - How many pages to move, and which way.
     */
    turn(step: number) {
      this.page = Math.min(Math.max(1, this.page + step), this.pages)
      this.sync()
      root?.scrollIntoView({ block: "start" })
    },

    /**
     * Says how many posts there are, for the count above the list: all of
     * them, or how many of them a search or tag leaves.
     *
     * The plural follows the total once there is one, since that is the
     * number the noun stands next to: one of two posts, not one of two post.
     *
     * @returns The count in the page's language and the right plural form.
     */
    summary(): string {
      const count = String(this.matches.length)
      const total = entries.length
      const one = plural.select(total) === "one"
      if (this.filtered) {
        return fillPlaceholders(
          one ? templates.filteredOne : templates.filteredOther,
          { count, total: String(total) }
        )
      }

      const own = plural.select(this.matches.length) === "one"

      return fillPlaceholders(own ? templates.one : templates.other, { count })
    },

    /**
     * Says which page is being shown, between the buttons that move it.
     *
     * @returns The position, as the content writes it.
     */
    status(): string {
      return fillPlaceholders(templates.page, {
        page: String(this.page),
        pages: String(this.pages),
      })
    },

    /**
     * Writes the state into the address without adding to the history, and
     * only once typing pauses: browsers throttle a page that rewrites its
     * address on every keystroke.
     */
    sync() {
      clearTimeout(timer)

      timer = window.setTimeout(() => {
        const url = new URL(location.href)
        const values = {
          [PARAMS.page]: this.page > 1 ? [String(this.page)] : [],
          [PARAMS.query]: this.query.trim() ? [this.query.trim()] : [],
          [PARAMS.tag]: this.tags,
        }

        for (const [name, list] of Object.entries(values)) {
          url.searchParams.delete(name)

          for (const value of list) url.searchParams.append(name, value)
        }

        history.replaceState(history.state, "", url)
      }, URL_DELAY)
    },
  }
})
