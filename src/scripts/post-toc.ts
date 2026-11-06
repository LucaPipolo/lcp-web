import { register } from "@/scripts/alpine"

/** How far below the header a heading counts as the one being read, in px. */
const LEAD = 24

register("postToc", () => {
  // The headings themselves are read, never written, and are kept out of the
  // component's state: the CSP build refuses property assignments on DOM
  // objects, and there is nothing to gain from making these reactive.
  let headings: HTMLElement[] = []
  let frame = 0

  /**
   * Measures where the sticky header ends, which is where the readable part
   * of the page begins.
   *
   * @returns The header's height, or zero on a page without one.
   */
  function ceiling() {
    const header = document.querySelector("body > header")

    return (header?.getBoundingClientRect().height ?? 0) + LEAD
  }

  return {
    active: "",

    /**
     * Follows the reader down the page.
     *
     * The panel lists the post's headings, so the post's headings are found
     * through it rather than by searching the page, which keeps the two in
     * step with no second list to maintain.
     */
    init() {
      headings = [...this.$el.querySelectorAll<HTMLElement>("[data-heading]")]
        .map((link) => document.getElementById(link.dataset.heading ?? ""))
        .filter((heading) => heading !== null)

      const update = () => {
        frame = 0
        this.mark()
      }

      // Scrolling fires far faster than the page can be repainted, so the work
      // is done once a frame rather than once an event.
      const schedule = () => {
        frame ||= requestAnimationFrame(update)
      }

      window.addEventListener("scroll", schedule, { passive: true })
      window.addEventListener("resize", schedule, { passive: true })

      this.mark()
    },

    /**
     * Settles which heading the reader is under: the last one they have
     * scrolled past, which stays marked until the next one arrives.
     *
     * Nothing is marked above the first heading, because a Visitor still in
     * the post's opening has not reached a section to be in.
     */
    mark() {
      const offset = ceiling()

      let current: HTMLElement | undefined

      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > offset) break

        current = heading
      }

      this.active = current?.id ?? ""
    },

    /**
     * Tells a link whether it points at the section being read.
     *
     * @param element - The link asking, passed from the markup as `$el`.
     *
     * @returns `location`, which is what marks a place within the page rather
     *   than the page itself, or `false` to leave the attribute off.
     */
    isActive(element: HTMLElement) {
      return element.dataset.heading === this.active ? "location" : false
    },
  }
})
