import { register } from "@/scripts/alpine"

register("siteMenu", () => ({
  open: false,

  /**
   * Opens or closes the narrow-screen panel.
   *
   * Focus moves into the panel once it is displayed, so the next Tab continues
   * through the menu rather than jumping past it to whatever follows the
   * header.
   */
  toggle() {
    this.open = !this.open
    if (!this.open) return

    this.$nextTick(() => {
      this.$refs.panel?.querySelector("a")?.focus()
    })
  },

  /**
   * Closes the panel and puts focus back on the button that opened it, so it
   * does not fall to the body once the element holding it is hidden.
   *
   * Does nothing while the panel is closed: Escape is heard window-wide, and
   * pressing it elsewhere on the page must not pull focus to the header.
   */
  close() {
    if (!this.open) return

    this.open = false
    this.$refs.button?.focus()
  },
}))
