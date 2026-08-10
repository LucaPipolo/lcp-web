import { register } from "@/scripts/alpine"

register("experienceRoles", () => ({
  open: "",

  /**
   * Opens the role the markup marks as open.
   */
  init() {
    const first = this.$el.querySelector<HTMLElement>("[data-open]")
    this.open = first?.dataset.role ?? ""
  },

  /**
   * Opens the role that was clicked, and closes the one that was open.
   *
   * @param event - The click. `currentTarget` is read rather than `target`,
   *   because the id sits on the toggle while the click can land on the mark
   *   it carries.
   */
  toggle(event: Event) {
    const target = event.currentTarget as HTMLElement
    const role = target.dataset.role ?? ""

    this.open = this.open === role ? "" : role
  },

  /**
   * Tells a toggle or a panel whether its role is the open one.
   *
   * @param element - The element asking, passed from the markup as `$el`.
   *
   * @returns Whether it belongs to the open role.
   */
  isOpen(element: HTMLElement) {
    return element.dataset.role === this.open
  },
}))
