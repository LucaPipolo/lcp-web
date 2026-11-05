import {
  SPINNER_FRAMES,
  SPINNER_INTERVAL,
  SPINNER_REST,
  spinnerFrame,
} from "@/scripts/spinner"

/** How long each character takes to appear, in milliseconds. */
const TYPE_MS = 55

/** How long each character takes to disappear, in milliseconds. */
const DELETE_MS = 30

/** How long a finished tail stays on screen, in milliseconds. */
const HOLD_MS = 2200

/** How long the line stays empty between one tail and the next. */
const BETWEEN_MS = 400

/**
 * Turns the spinner for as long as the page is open.
 *
 * @param spinner - The asterisk's `<svg>`, whose bars are redrawn each frame.
 */
function spin(spinner: SVGSVGElement) {
  const lines = [...spinner.querySelectorAll("line")]
  const radius = spinner.viewBox.baseVal.width / 2
  let frame = SPINNER_REST

  window.setInterval(() => {
    frame = (frame + 1) % SPINNER_FRAMES.length

    const { bars, strokeWidth } = spinnerFrame(frame, radius)
    spinner.setAttribute("stroke-width", String(strokeWidth))
    lines.forEach((line, index) => {
      const [x1, y1, x2, y2] = bars[index]
      line.setAttribute("x1", String(x1))
      line.setAttribute("y1", String(y1))
      line.setAttribute("x2", String(x2))
      line.setAttribute("y2", String(y2))
    })
  }, SPINNER_INTERVAL)
}

/**
 * Types each tail in, holds it, deletes it, and moves on to the next.
 *
 * @param badge - The badge, which carries `data-typing` while characters are
 *   moving. That is what holds the caret solid, because a caret blinking
 *   mid-word reads as two animations fighting rather than as one terminal.
 * @param target - The element the typed characters are written into.
 * @param tails - The lines to cycle through, in order.
 */
function type(badge: HTMLElement, target: HTMLElement, tails: string[]) {
  let index = 0
  let length = 0
  let deleting = false

  function step() {
    const tail = tails[index]

    if (!deleting && length < tail.length) {
      badge.setAttribute("data-typing", "")
      target.textContent = tail.slice(0, ++length)
      window.setTimeout(step, TYPE_MS)
      return
    }

    if (!deleting) {
      badge.removeAttribute("data-typing")
      deleting = true
      window.setTimeout(step, HOLD_MS)
      return
    }

    if (length > 0) {
      badge.setAttribute("data-typing", "")
      target.textContent = tail.slice(0, --length)
      window.setTimeout(step, DELETE_MS)
      return
    }

    badge.removeAttribute("data-typing")
    deleting = false
    index = (index + 1) % tails.length
    window.setTimeout(step, BETWEEN_MS)
  }

  step()
}

/**
 * Starts the spinner and the typewriter on one badge.
 *
 * Everything it adds is decoration. The stem and the first tail render with no
 * JavaScript at all, and that pair stays the only thing assistive technology
 * is given, so nobody is read a line that rewrites itself under them.
 *
 * @param badge - An element carrying `data-hero-badge`.
 */
function initHeroBadge(badge: HTMLElement) {
  const spinner = badge.querySelector<SVGSVGElement>("[data-badge-spinner]")
  const tailElements = [
    ...badge.querySelectorAll<HTMLElement>("[data-badge-tail]"),
  ]

  const [primary] = tailElements
  if (!primary) return

  // A Visitor who asked for less motion keeps the first tail exactly as the
  // server rendered it, and the spinner rests on the full mark.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

  if (spinner) spin(spinner)

  const tails = tailElements
    .map((element) => element.textContent?.trim() ?? "")
    .filter(Boolean)

  if (tails.length === 0) return

  // The first tail stops being visible but keeps being the accessible name, so
  // the line reads as one stable sentence however much the typed copy churns.
  primary.classList.add("sr-only")

  const typed = document.createElement("span")
  typed.setAttribute("aria-hidden", "true")
  primary.after(typed)

  type(badge, typed, tails)
}

for (const badge of document.querySelectorAll<HTMLElement>(
  "[data-hero-badge]"
)) {
  initHeroBadge(badge)
}
