import {
  SPINNER_FRAMES,
  SPINNER_INTERVAL,
  SPINNER_REST,
  spinnerFrame,
} from "@/scripts/spinner"

const SIZE = 64
const RADIUS = 31

const darkChrome = window.matchMedia("(prefers-color-scheme: dark)")
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

interface Primaries {
  dark: string
  light: string
}

/**
 * Resolves `--primary` for both themes, once.
 *
 * The icon sits in the browser's tab strip rather than in the page, so it has to
 * track the operating system rather than the theme the Visitor picked for the
 * site: someone reading a light site inside a dark browser still needs the dark
 * chrome's colour. The dark value comes from a hidden probe carrying the `dark`
 * class, because that is the selector the stylesheet declares it under and a
 * value the root is not currently using cannot be read from the root.
 *
 * @returns Both colours as `getComputedStyle` reports them. A site already in
 *   dark mode reports the dark value from the root too, so the light one is not
 *   in the document to be read and the dark one is returned for both.
 */
function readPrimaries(): Primaries {
  const probe = document.createElement("div")
  probe.className = "dark"
  probe.style.display = "none"
  document.body.append(probe)
  const dark = getComputedStyle(probe).getPropertyValue("--primary").trim()
  probe.remove()

  if (document.documentElement.classList.contains("dark")) {
    return { light: dark, dark }
  }

  const light = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim()

  return { light, dark }
}

/**
 * Draws one spinner frame, replacing whatever the canvas held.
 *
 * @param context - The offscreen canvas's 2d context.
 * @param frame - An index into `SPINNER_FRAMES`.
 * @param colour - What to stroke the bars with.
 */
function draw(
  context: CanvasRenderingContext2D,
  frame: number,
  colour: string
) {
  const { bars, strokeWidth } = spinnerFrame(frame, RADIUS)

  context.clearRect(0, 0, SIZE, SIZE)
  context.strokeStyle = colour
  context.lineWidth = strokeWidth
  context.lineCap = "round"

  context.beginPath()
  for (const [x1, y1, x2, y2] of bars) {
    context.moveTo(SIZE / 2 + x1, SIZE / 2 + y1)
    context.lineTo(SIZE / 2 + x2, SIZE / 2 + y2)
  }
  context.stroke()
}

/**
 * Turns the spinner in the tab for as long as the page is open and visible.
 *
 * The colour is reread on every frame from the operating system's scheme, so an
 * icon keeps its contrast against a tab strip that just flipped. A hidden tab
 * shows its icon but cannot show motion in it, so the whole draw and encode loop
 * is suspended rather than left running for nobody.
 *
 * @param link - The `<link rel="icon">` whose href is swapped each frame.
 * @param canvas - The offscreen canvas each frame is drawn to.
 * @param context - That canvas's 2d context.
 */
function animate(
  link: HTMLLinkElement,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D
) {
  const primaries = readPrimaries()
  const declared = { href: link.href, type: link.type }

  link.type = "image/png"

  let frame = SPINNER_REST
  let timer = 0

  function paint() {
    const colour = darkChrome.matches ? primaries.dark : primaries.light
    draw(context, frame, colour)
    link.href = canvas.toDataURL("image/png")
  }

  function stop() {
    window.clearInterval(timer)
    timer = 0
  }

  function start() {
    if (timer || document.hidden || reducedMotion.matches) return
    timer = window.setInterval(() => {
      frame = (frame + 1) % SPINNER_FRAMES.length
      paint()
    }, SPINNER_INTERVAL)
  }

  paint()

  darkChrome.addEventListener("change", () => {
    if (!reducedMotion.matches) paint()
  })

  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      stop()
      link.type = declared.type
      link.href = declared.href
      return
    }

    link.type = "image/png"
    start()
  })

  document.addEventListener("visibilitychange", () =>
    document.hidden ? stop() : start()
  )

  start()
}

/**
 * Takes the tab's icon over, unless there is a reason to leave it alone.
 *
 * Somebody who asked for less motion keeps the icon the document declared,
 * untouched: painting even the first frame would trade a sharp SVG that answers
 * `prefers-color-scheme` on its own for a raster copy of the same shape, which
 * costs them something and gains them nothing.
 */
function initFavicon() {
  if (reducedMotion.matches) return

  const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
  if (!link) return

  const canvas = document.createElement("canvas")
  canvas.width = SIZE
  canvas.height = SIZE

  const context = canvas.getContext("2d")
  if (!context) return

  animate(link, canvas, context)
}

initFavicon()
