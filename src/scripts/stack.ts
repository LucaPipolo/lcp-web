import { register } from "@/scripts/alpine"

register("stackTabs", () => ({
  selected: "",

  /**
   * Opens the first tab by default.
   */
  init() {
    const first = this.$el.querySelector<HTMLElement>("[data-tab]")
    this.selected = first?.dataset.tab ?? ""
  },

  /**
   * Opens the tab that was clicked.
   *
   * @param event - The click. `currentTarget` is read rather than `target`,
   *   because the id sits on the button while the click lands on whatever
   *   the tab wraps.
   */
  select(event: Event) {
    const target = event.currentTarget as HTMLElement
    this.selected = target.dataset.tab ?? this.selected
  },

  /**
   * Walks the tabs with the arrow keys, wrapping around at either end.
   *
   * Only the open tab is in the tab order, so the arrows are how a keyboard
   * reaches the rest, and opening each one it lands on is what makes the
   * panels readable that way.
   *
   * @param event - The key press on a tab. Anything the tablist does not
   *   answer for is left alone.
   */
  navigate(event: KeyboardEvent) {
    const target = event.currentTarget as HTMLElement
    const list = target.closest("[role=tablist]")
    const tabs = [...(list?.querySelectorAll<HTMLElement>("[role=tab]") ?? [])]
    const from = tabs.indexOf(target)

    const to = {
      ArrowRight: from + 1,
      ArrowLeft: from - 1,
      Home: 0,
      End: tabs.length - 1,
    }[event.key]

    if (to === undefined) return

    event.preventDefault()

    const tab = tabs.at(to % tabs.length)

    if (!tab) return

    this.selected = tab.dataset.tab ?? this.selected
    tab.focus()
  },

  /**
   * Tells a tab or a panel whether it is the open one.
   *
   * @param element - The element asking, passed from the markup as `$el`.
   *
   * @returns Whether it belongs to the open pair.
   */
  isSelected(element: HTMLElement) {
    return element.dataset.tab === this.selected
  },
}))
