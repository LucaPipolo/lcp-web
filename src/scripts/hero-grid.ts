/**
 * Settings.
 *
 * Lengths are in pixels, durations in seconds, waits in milliseconds.
 */
const CELL_WIDE = 108
const CELL_NARROW = 64
const NARROW_FRAME = 700

const HALO_RADIUS = 300
const HOVER_EASING = 7
const MAX_FRAME_DELTA = 0.05

const MAX_PULSES = 6
const SPAWN_MIN = 450
const SPAWN_RANGE = 900
const PULSE_MIN_DURATION = 3.2
const PULSE_DURATION_RANGE = 2.4
const PULSE_MIN_LENGTH = 180
const PULSE_LENGTH_RANGE = 160

type Rgb = readonly [number, number, number]

interface Pulse {
  vertical: boolean
  position: number
  backwards: boolean
  progress: number
  duration: number
  length: number
}

/**
 * Resolves a theme token to its red, green and blue channels.
 *
 * The tokens are authored in `oklch()`, so they cannot be parsed as hex, and
 * every gradient stop needs its own alpha, which an `oklch()` string does not
 * carry. The browser does the conversion instead: fill one pixel with the
 * token and read that pixel back.
 *
 * @param element - The element the token is resolved against.
 * @param token - A custom property name, such as `--primary`.
 * @returns The resolved channels, or black if the canvas is unavailable.
 */
function resolveToken(element: Element, token: string): Rgb {
  const value = getComputedStyle(element).getPropertyValue(token).trim()

  const probe = document.createElement("canvas")
  probe.width = 1
  probe.height = 1

  const context = probe.getContext("2d")
  if (!context) return [0, 0, 0]

  context.fillStyle = value
  context.fillRect(0, 0, 1, 1)

  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data
  return [red, green, blue]
}

/**
 * Writes a colour and an alpha as the `rgba()` string canvas expects.
 *
 * @param channels - The colour, from {@link resolveToken}.
 * @param alpha - Opacity, from 0 to 1.
 * @returns The value to assign to `fillStyle` or `strokeStyle`.
 */
function rgba([red, green, blue]: Rgb, alpha: number) {
  return `rgba(${red},${green},${blue},${alpha})`
}

/**
 * Draws and animates one hero grid.
 *
 * Everything it draws is decoration: the section renders complete without it,
 * and the canvas sits inside an `aria-hidden` layer, so nothing here is
 * reachable by a screen reader or by keyboard.
 *
 * @param frame - The element carrying `data-hero-grid`, watched for resizes.
 * @param canvas - The canvas inside that frame.
 * @param context - That canvas's drawing context.
 */
function drawHeroGrid(
  frame: HTMLElement,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D
) {
  const foreground = resolveToken(frame, "--foreground")
  const primary = resolveToken(frame, "--primary")
  const stillOnly = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches

  const pulses: Pulse[] = []
  const pointer = { x: -1, y: -1, inside: false }

  let width = 0
  let height = 0
  let cell = CELL_WIDE
  let hoverAmount = 0
  let lastFrame = 0
  let spawnAt = 0

  /** Clears the canvas and strokes the grid, fading in from the left. */
  function drawLines() {
    context.clearRect(0, 0, width, height)
    context.lineWidth = 1

    const gradient = context.createLinearGradient(0, 0, width, 0)
    gradient.addColorStop(0, rgba(foreground, 0.015))
    gradient.addColorStop(0.42, rgba(foreground, 0.03))
    gradient.addColorStop(0.72, rgba(foreground, 0.07))
    gradient.addColorStop(1, rgba(foreground, 0.085))
    context.strokeStyle = gradient

    context.beginPath()
    for (let x = cell; x < width; x += cell) {
      context.moveTo(x + 0.5, 0)
      context.lineTo(x + 0.5, height)
    }
    for (let y = cell; y < height; y += cell) {
      context.moveTo(0, y + 0.5)
      context.lineTo(width, y + 0.5)
    }
    context.stroke()
  }

  /** Re-strokes the lines near the pointer, brightening them where they are. */
  function drawHalo() {
    const { x, y } = pointer

    const halo = context.createRadialGradient(x, y, 0, x, y, HALO_RADIUS)
    halo.addColorStop(0, rgba(primary, 0.4 * hoverAmount))
    halo.addColorStop(0.55, rgba(primary, 0.12 * hoverAmount))
    halo.addColorStop(1, rgba(primary, 0))

    context.save()
    context.strokeStyle = halo
    context.lineWidth = 1
    context.beginPath()

    const firstColumn = Math.max(1, Math.floor((x - HALO_RADIUS) / cell))
    for (let i = firstColumn; i <= Math.ceil((x + HALO_RADIUS) / cell); i++) {
      const lineX = i * cell + 0.5
      if (lineX <= 0 || lineX >= width) continue
      context.moveTo(lineX, Math.max(0, y - HALO_RADIUS))
      context.lineTo(lineX, Math.min(height, y + HALO_RADIUS))
    }

    const firstRow = Math.max(1, Math.floor((y - HALO_RADIUS) / cell))
    for (let j = firstRow; j <= Math.ceil((y + HALO_RADIUS) / cell); j++) {
      const lineY = j * cell + 0.5
      if (lineY <= 0 || lineY >= height) continue
      context.moveTo(Math.max(0, x - HALO_RADIUS), lineY)
      context.lineTo(Math.min(width, x + HALO_RADIUS), lineY)
    }

    context.stroke()
    context.restore()
  }

  /** Adds a pulse on a random line, dropping the oldest once past the cap. */
  function spawnPulse() {
    const columns = Math.floor(width / cell)
    const rows = Math.floor(height / cell)
    if (columns < 2 || rows < 2) return

    const vertical = Math.random() < 0.5
    const lines = vertical ? columns : rows

    pulses.push({
      vertical,
      position: (1 + Math.floor(Math.random() * (lines - 1))) * cell,
      backwards: Math.random() < 0.5,
      progress: 0,
      duration: PULSE_MIN_DURATION + Math.random() * PULSE_DURATION_RANGE,
      length: PULSE_MIN_LENGTH + Math.random() * PULSE_LENGTH_RANGE,
    })

    if (pulses.length > MAX_PULSES) pulses.shift()
  }

  /**
   * Advances every pulse and strokes it, retiring the ones that have arrived.
   *
   * @param delta - Seconds since the previous frame.
   */
  function drawPulses(delta: number) {
    context.lineWidth = 1.5
    context.lineCap = "round"

    for (let index = pulses.length - 1; index >= 0; index--) {
      const pulse = pulses[index]
      pulse.progress += delta / pulse.duration

      if (pulse.progress >= 1) {
        pulses.splice(index, 1)
        continue
      }

      const travel = (pulse.vertical ? height : width) + 2 * pulse.length
      const head = pulse.backwards
        ? travel - pulse.length - pulse.progress * travel
        : pulse.progress * travel - pulse.length
      const tail = pulse.backwards ? head + pulse.length : head - pulse.length
      const fade = Math.sin(Math.PI * pulse.progress)

      const gradient = pulse.vertical
        ? context.createLinearGradient(0, tail, 0, head)
        : context.createLinearGradient(tail, 0, head, 0)
      gradient.addColorStop(0, rgba(primary, 0))
      gradient.addColorStop(0.75, rgba(primary, 0.28 * fade))
      gradient.addColorStop(1, rgba(primary, 0.8 * fade))
      context.strokeStyle = gradient

      context.beginPath()
      if (pulse.vertical) {
        context.moveTo(pulse.position + 0.5, tail)
        context.lineTo(pulse.position + 0.5, head)
      } else {
        context.moveTo(tail, pulse.position + 0.5)
        context.lineTo(head, pulse.position + 0.5)
      }
      context.stroke()
    }

    context.lineCap = "butt"
  }

  /**
   * Redraws the whole grid once, then queues the next frame.
   *
   * @param time - The timestamp `requestAnimationFrame` supplies.
   */
  function tick(time: number) {
    const delta = Math.min((time - lastFrame) / 1000, MAX_FRAME_DELTA)
    lastFrame = time

    if (width > 0 && height > 0) {
      drawLines()

      const target = pointer.inside ? 1 : 0
      hoverAmount += (target - hoverAmount) * Math.min(1, delta * HOVER_EASING)
      if (hoverAmount > 0.01) drawHalo()

      if (time > spawnAt) {
        spawnPulse()
        spawnAt = time + SPAWN_MIN + Math.random() * SPAWN_RANGE
      }

      drawPulses(delta)
    }

    requestAnimationFrame(tick)
  }

  /** Matches the canvas to the frame, at the screen's pixel density. */
  function resize() {
    // Measured on the canvas rather than on the frame, because the frame's
    // border sits outside the canvas and backing it at the border box would
    // draw the grid a couple of pixels wider than it is shown.
    const rect = canvas.getBoundingClientRect()
    const ratio = Math.min(window.devicePixelRatio || 1, 2)

    width = rect.width
    height = rect.height
    cell = width < NARROW_FRAME ? CELL_NARROW : CELL_WIDE

    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)

    // Resizing clears the canvas, so the still grid has to be redrawn here.
    // The animated one is redrawn by the next frame anyway.
    if (stillOnly && width > 0 && height > 0) drawLines()
  }

  resize()
  new ResizeObserver(resize).observe(frame)

  // A Visitor who asked for less motion gets the grid drawn once, and nothing
  // else: no frame loop, no pulses, and no pointer listeners.
  if (stillOnly) return

  // The listeners go on the section rather than on the frame, because the
  // frame is `pointer-events-none`.
  const section = frame.closest("section")
  section?.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect()
    pointer.x = event.clientX - rect.left
    pointer.y = event.clientY - rect.top
    pointer.inside = true
  })
  section?.addEventListener("pointerleave", () => {
    pointer.inside = false
  })

  lastFrame = performance.now()
  requestAnimationFrame(tick)
}

for (const frame of document.querySelectorAll<HTMLElement>(
  "[data-hero-grid]"
)) {
  const canvas = frame.querySelector("canvas")
  const context = canvas?.getContext("2d")
  if (canvas && context) drawHeroGrid(frame, canvas, context)
}
