import { register } from "@/scripts/alpine"

/** How long the button says it copied, in milliseconds. */
const CONFIRMATION = 2000

register("postShare", () => {
  // Read once from the root element, because `$el` inside a handler is the
  // button that was pressed rather than the element holding the markup's data.
  let url = ""
  let labels = { copy: "", copied: "" }
  let timer = 0

  return {
    copied: false,
    supported: false,

    /**
     * Takes what the markup carries, and looks for a clipboard before offering
     * to copy to it.
     *
     * A browser without one, or a page served over plain HTTP, leaves the
     * button out rather than showing one that does nothing.
     */
    init() {
      const data = this.$el.dataset

      url = data.url ?? ""
      labels = { copy: data.copyLabel ?? "", copied: data.copiedLabel ?? "" }

      this.supported = Boolean(navigator.clipboard)
    },

    /**
     * Puts the post's address on the clipboard.
     *
     * The address comes from the markup rather than from `location`, so what
     * is copied is the page's canonical URL, whatever the link that led here
     * may have carried.
     */
    async copy() {
      if (!url) return

      try {
        await navigator.clipboard.writeText(url)
      } catch {
        // A refused clipboard is the Visitor's decision to have made.
        return
      }

      this.copied = true

      clearTimeout(timer)
      timer = window.setTimeout(() => {
        this.copied = false
      }, CONFIRMATION)
    },

    /**
     * Names what the button does, and then what it just did.
     *
     * @returns The label for its current state, which is the only word a
     *   Visitor using a screen reader gets out of an icon button.
     */
    label() {
      return this.copied ? labels.copied : labels.copy
    },
  }
})
