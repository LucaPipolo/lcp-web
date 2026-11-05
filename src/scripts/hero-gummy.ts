import { BAR_HALF_WIDTH, BARS } from "@/libs/asterisk"

/**
 * Settings.
 *
 * Lengths are in pixels unless they say otherwise, times in seconds, and
 * speeds in pixels per second. Anything "per second" is a fraction kept
 * after one second, so a lower number damps harder.
 */
const POINTS = 96
const SUBSTEP = 1 / 120
const MAX_FRAME_DELTA = 0.05
const SOLVER_PASSES = 3

/**
 * The gummies, as fractions of the largest one's radius: a large one, a
 * medium one and a small one.
 */
const SIZES = [1, 0.58, 0.36]

/**
 * How far apart two gummies' surfaces are held, in pixels. Contact starts this
 * far out, so a hard push never drives one surface deep into the other, which
 * is where a point would be resolved to the wrong side and the two would
 * lock together.
 */
const SKIN = 3

/**
 * How much of a held gummy's mass counts in a collision. The hand pushes it
 * into the other gummy, so it gives way more, but not entirely, or every
 * contact would be resolved on one side alone.
 */
const HELD_MASS = 0.25

/**
 * A bar's moment of inertia, as a fraction of its mass times its half length
 * squared: that of a thin rod spun about its middle.
 */
const INERTIA = 1 / 3

/** Radius, as a fraction of the frame's shorter side, and its limits. */
const RADIUS_RATIO = 0.176
const RADIUS_MIN = 48
const RADIUS_MAX = 120

/**
 * Below this frame width the copy fills the frame, so the gummy starts
 * smaller and up in the frame's top padding, the one band with nothing in it.
 */
const NARROW_FRAME = 640
const NARROW_RADIUS_RATIO = 0.096
const NARROW_RADIUS_MIN = 32
const NARROW_RADIUS_MAX = 45

/** How hard the body pulls back to its rest shape, per pass. */
const STIFFNESS = 0.06
const EDGE_STIFFNESS = 0.6
const BEND_STIFFNESS = 0.35
const AREA_STIFFNESS = 0.7

const DRAG = 0.5
const WOBBLE_DAMPING = 0.08
const MAX_SPEED = 2600

const RESTITUTION = 0.45
/** The least a gummy's home keeps from a wall, so none rests against one. */
const WALL_GAP = 8
const WALL_FRICTION = 0.04

/** How much of the gap to the pointer the held region closes per substep. */
const GRAB_STRENGTH = 0.25
/**
 * The furthest the hand drags the held region in one substep, in pixels: past
 * any comfortable drag, and short of jumping clean through a small gummy's arm.
 */
const GRAB_STEP = 12
/** Width of the held region, in radii, and the pull the far side still gets. */
const GRAB_SPREAD = 0.9
const GRAB_FLOOR = 0.28
/**
 * The disc the hovering pointer presses with, in radii of the gummy it
 * presses, so a small gummy is not shoved by a fingertip its own size.
 */
const POKE_RATIO = 0.18
const POKE_MIN = 4
const POKE_MAX = 18
/**
 * How much of the overlap with that disc each pass resolves, and how much of
 * what it moves carries on as speed: a hover should dent and roll a gummy,
 * not fling it.
 */
const POKE_STIFFNESS = 0.5
const POKE_MOMENTUM = 0.5

/** How long after the last touch the idle motion resumes, and its fade-in. */
const IDLE_AFTER = 2.5
const IDLE_RAMP = 2
const DRIFT_FORCE = 16
const HOME_PULL = 0.25
const BREATH_PERIOD = 3.8
const BREATH_DEPTH = 0.012
const NUDGE_MIN = 2.6
const NUDGE_RANGE = 3.4
const NUDGE_SPEED = 120
const NUDGE_SPREAD = 0.55

/**
 * Shading. The gummy is lit from the top left, as the rest of the page is
 * styled to be, and shaded per pixel on a sprite at most this many device
 * pixels across, which the crisp outline then clips.
 */
const SPRITE_SIZE = 320
/**
 * How far the shape may change, in pixels, before it is shaded again. Below
 * this, a frame only moves the layers already drawn: a gummy drifting at rest
 * changes where it is, not what it looks like, and the shading is the cost.
 */
const RESHADE_TOLERANCE = 0.35
const PADDING = 20
/**
 * The shadow on a light page, and the glow on a dark one: softness, how far
 * it falls from the body, and the resolution it is cast at. A blur this wide
 * loses nothing at half resolution, and costs a quarter as much.
 */
const SHADOW_BLUR = 20
const SHADOW_OFFSET_X = 8
const SHADOW_OFFSET_Y = 14
const GLOW_BLUR = 22
const GLOW_OFFSET_Y = 4
const SHADOW_SCALE = 0.5
/** Far enough off the sprite that only a shape's shadow lands on it. */
const OFFSCREEN = 10_000
const LIGHT = unit(-0.5, -0.65, 0.58)
/** How far in from the edge the surface finishes curving over, in radii. */
const BEVEL = 0.2
/**
 * How far past the outline the sprites are shaded, in sprite pixels, so the
 * crisp clip is the silhouette and no sprite edge ever shows through it.
 */
const BLEED = 3
/** How much the flat top still domes, which spreads the sheen over it. */
const DOME = 0.18
/** Optical density: how much of the body's colour a full thickness keeps. */
const DENSITY = 1.1
const GLOW = 0.8
const REFRACTION = 22

type Rgb = readonly [number, number, number]

const WHITE: Rgb = [255, 255, 255]
const BLACK: Rgb = [0, 0, 0]

interface Grab {
  id: number
  weights: Float64Array
  x: number
  y: number
}

/** What every gummy reads from the scene they share. */
interface World {
  clock: number
  dark: boolean
  density: number
  height: number
  lastTouch: number
  pointer: { inside: boolean; x: number; y: number }
  primary: Rgb
  ratio: number
  refracting: boolean
  stillOnly: boolean
  width: number
}

/** Where a gummy's rest shape, best fitted to its points, sits. */
interface Pose {
  angle: number
  scale: number
  x: number
  y: number
}

/** One gummy, as the world drives it. */
interface Gummy {
  begin(): void
  fit(radius: number, homeX: number, homeY: number): void
  goalX: Float64Array
  goalY: Float64Array
  grabAt(id: number, gx: number, gy: number): void
  readonly grabbed: number | null
  hit: HTMLElement
  hold(gx: number, gy: number): void
  readonly mass: number
  maybeNudge(): void
  readonly pose: Readonly<Pose>
  readonly radius: number
  refit(): void
  release(id: number): void
  render(): void
  reshade(): void
  settle(): void
  settled(): boolean
  shift(dx: number, dy: number, turn: number): void
  solve(): void
  x: Float64Array
  y: Float64Array
}

/**
 * Normalises a vector.
 *
 * @param x - Its first component.
 * @param y - Its second.
 * @param z - Its third.
 * @returns The same direction at unit length.
 */
function unit(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1
  return [x / length, y / length, z / length]
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
  if (!context) return BLACK

  context.fillStyle = value
  context.fillRect(0, 0, 1, 1)

  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data
  return [red, green, blue]
}

/**
 * Blends two colours.
 *
 * @param from - The colour at `amount` 0.
 * @param to - The colour at `amount` 1.
 * @param amount - How far to go from one to the other.
 * @returns The blend.
 */
function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  ]
}

/**
 * Keeps a number within a range.
 *
 * @param value - The number.
 * @param min - The lowest it may be.
 * @param max - The highest it may be.
 * @returns The number, or whichever limit it crossed.
 */
function clamp(value: number, min: number, max: number) {
  return value < min ? min : value > max ? max : value
}

/**
 * Measures how far a bar reaches from the centre along a direction.
 *
 * A bar is a stadium: a rectangle with a half disc on each end. A ray from
 * the centre leaves it either through a long side or through an end cap.
 *
 * @param angle - The direction, relative to the bar's own.
 * @param halfLength - Half the bar's length, caps included.
 * @param halfWidth - Half its width, which is also the caps' radius.
 * @returns The distance from the centre to where the ray leaves the bar.
 */
function reach(angle: number, halfLength: number, halfWidth: number) {
  const sin = Math.abs(Math.sin(angle))
  const cos = Math.abs(Math.cos(angle))
  const across = halfLength * sin

  if (across > halfWidth) return halfWidth / sin

  return halfLength * cos + Math.sqrt(halfWidth * halfWidth - across * across)
}

/**
 * Traces the asterisk, as points spaced evenly along its outline.
 *
 * Even spacing is what keeps the springs between neighbours uniform, so the
 * outline is sampled densely by angle first, rounded a little where the bars
 * meet, and then walked at equal steps of arc length.
 *
 * @param radius - How far a tip reaches from the centre.
 * @param count - How many points to return.
 * @returns The points' x and y coordinates, about the centre.
 */
function asterisk(radius: number, count: number): [number[], number[]] {
  const STEPS = 1440
  const SMOOTHING = 8
  const halfWidth = radius * BAR_HALF_WIDTH

  let dense: [number, number][] = []
  for (let step = 0; step < STEPS; step++) {
    const angle = (step / STEPS) * Math.PI * 2

    let distance = 0
    for (let bar = 0; bar < BARS; bar++) {
      const own = angle - (bar * Math.PI) / BARS
      distance = Math.max(distance, reach(own, radius, halfWidth))
    }

    dense.push([Math.cos(angle) * distance, Math.sin(angle) * distance])
  }

  // Two moving averages round the sharp inside corners off.
  for (let pass = 0; pass < 2; pass++) {
    dense = dense.map((_, index) => {
      let x = 0
      let y = 0
      for (let offset = -SMOOTHING; offset <= SMOOTHING; offset++) {
        const [px, py] = dense[(index + offset + STEPS) % STEPS]
        x += px
        y += py
      }
      return [x / (2 * SMOOTHING + 1), y / (2 * SMOOTHING + 1)]
    })
  }

  const lengths = [0]
  for (let index = 1; index <= STEPS; index++) {
    const [ax, ay] = dense[index - 1]
    const [bx, by] = dense[index % STEPS]
    lengths.push(lengths[index - 1] + Math.hypot(bx - ax, by - ay))
  }

  const xs: number[] = []
  const ys: number[] = []
  const perimeter = lengths[STEPS]
  let segment = 0

  for (let index = 0; index < count; index++) {
    const target = (index / count) * perimeter
    while (lengths[segment + 1] < target) segment++

    const [ax, ay] = dense[segment]
    const [bx, by] = dense[(segment + 1) % STEPS]
    const span = lengths[segment + 1] - lengths[segment] || 1
    const t = (target - lengths[segment]) / span

    xs.push(ax + (bx - ax) * t)
    ys.push(ay + (by - ay) * t)
  }

  return [xs, ys]
}

/**
 * Measures how far inside the outline every sprite pixel is.
 *
 * A two-pass chamfer transform: close enough to Euclidean for shading, and
 * cheap enough to run every frame.
 *
 * @param inside - Whether each pixel is inside the outline.
 * @param w - The sprite's width.
 * @param h - Its height.
 * @returns Each pixel's distance to the nearest outside pixel.
 */
function distances(inside: Uint8Array, w: number, h: number) {
  const far = w + h
  const distance = new Float32Array(w * h)

  for (let i = 0; i < w * h; i++) distance[i] = inside[i] ? far : 0

  for (let j = 1; j < h - 1; j++) {
    for (let i = 1; i < w - 1; i++) {
      const at = j * w + i
      if (!inside[at]) continue
      distance[at] = Math.min(
        distance[at],
        distance[at - 1] + 1,
        distance[at - w] + 1,
        distance[at - w - 1] + Math.SQRT2,
        distance[at - w + 1] + Math.SQRT2
      )
    }
  }

  for (let j = h - 2; j > 0; j--) {
    for (let i = w - 2; i > 0; i--) {
      const at = j * w + i
      if (!inside[at]) continue
      distance[at] = Math.min(
        distance[at],
        distance[at + 1] + 1,
        distance[at + w] + 1,
        distance[at + w + 1] + Math.SQRT2,
        distance[at + w - 1] + Math.SQRT2
      )
    }
  }

  // The chamfer steps in whole pixels, which would ridge the highlights,
  // so the field is softened before anything takes its slope.
  const smooth = new Float32Array(w * h)
  for (let pass = 0; pass < 2; pass++) {
    const from = pass === 0 ? distance : smooth
    const to = pass === 0 ? smooth : distance
    for (let j = 1; j < h - 1; j++) {
      for (let i = 1; i < w - 1; i++) {
        const at = j * w + i
        to[at] =
          (from[at - w - 1] +
            from[at - w] +
            from[at - w + 1] +
            from[at - 1] +
            from[at] +
            from[at + 1] +
            from[at + w - 1] +
            from[at + w] +
            from[at + w + 1]) /
          9
      }
    }
  }

  return distance
}

/**
 * Builds one gummy: its body, its shading and its layers on the page.
 *
 * The gummy is a ring of points joined by springs, pulled towards its rest
 * shape and holding its area, so it squashes where it hits and bulges where
 * it does not. The world steps it, collides it with the others and draws it.
 * The gummy is decoration: the section renders complete without it, it sits
 * in an `aria-hidden` layer, and nothing here is reachable by keyboard.
 *
 * @param world - The scene the gummies share: frame size, pointer, theme.
 * @param index - Which gummy this is, which sets its size and offsets its idle
 *   motion.
 * @param hit - The element that is the gummy to the pointer. It is moved over
 *   the gummy and clipped to its outline each frame, so it only catches what
 *   lands on the gummy itself, and it is what bends and blurs the page seen
 *   through the gummy.
 * @param tint - The canvas that multiplies the page with the body's colour,
 *   which is what absorption does: white turns the gummy's red, and dark text
 *   stays dark, rather than everything fading towards one pink.
 * @param tintContext - That canvas's drawing context.
 * @param canvas - The canvas the light is painted on: glow, reflection, sheen.
 * @param context - That canvas's drawing context.
 * @param map - The filter input that carries the refraction map.
 * @returns The gummy, for the world to drive.
 */
function createGummy(
  world: World,
  index: number,
  hit: HTMLElement,
  tint: HTMLCanvasElement,
  tintContext: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  map: SVGFEImageElement | null
): Gummy {
  // Positions, positions one substep ago (which is how a Verlet integrator
  // carries velocity), the rest shape about its centre, and outward normals.
  const x = new Float64Array(POINTS)
  const y = new Float64Array(POINTS)
  const px = new Float64Array(POINTS)
  const py = new Float64Array(POINTS)
  const qx = new Float64Array(POINTS)
  const qy = new Float64Array(POINTS)
  const nx = new Float64Array(POINTS)
  const ny = new Float64Array(POINTS)
  const restEdge = new Float64Array(POINTS)
  const restBend = new Float64Array(POINTS)
  const goalX = new Float64Array(POINTS)
  const goalY = new Float64Array(POINTS)
  const pose: Pose = { angle: 0, scale: 1, x: 0, y: 0 }

  const home = { x: 0, y: 0 }
  // Each gummy drifts and breathes on its own phase, so they never move in
  // step.
  const phase = index * 2.4

  const tintSprite = document.createElement("canvas")
  const tintSpriteContext = tintSprite.getContext("2d", {
    willReadFrequently: true,
  })
  const lightSprite = document.createElement("canvas")
  const lightSpriteContext = lightSprite.getContext("2d")
  const lens = document.createElement("canvas")
  const lensContext = lens.getContext("2d")
  const shadowSprite = document.createElement("canvas")
  const shadowSpriteContext = shadowSprite.getContext("2d")

  let grab: Grab | null = null
  let radius = 0
  let restArea = 0
  let meanEdge = 0
  let scale = 1
  let nudgeAt = index * 1.3
  let box = 0
  // The shape as last shaded, about its centre, and where its box was put.
  const shadedX = new Float64Array(POINTS)
  const shadedY = new Float64Array(POINTS)
  let shaded = false
  let shadedCx = 0
  let shadedCy = 0
  let shadedOx = 0
  let shadedOy = 0

  /**
   * Builds the rest shape for a radius.
   *
   * @param value - The new radius.
   */
  function setRadius(value: number) {
    radius = value

    const [xs, ys] = asterisk(radius, POINTS)
    restArea = 0
    meanEdge = 0

    for (let i = 0; i < POINTS; i++) {
      qx[i] = xs[i]
      qy[i] = ys[i]
    }

    for (let i = 0; i < POINTS; i++) {
      const j = (i + 1) % POINTS
      const k = (i + 2) % POINTS
      restEdge[i] = Math.hypot(qx[j] - qx[i], qy[j] - qy[i])
      restBend[i] = Math.hypot(qx[k] - qx[i], qy[k] - qy[i])
      restArea += qx[i] * qy[j] - qx[j] * qy[i]
      meanEdge += restEdge[i]
    }

    restArea *= 0.5
    meanEdge /= POINTS
  }

  /** @returns The centre of the body. */
  function centroid(): [number, number] {
    let cx = 0
    let cy = 0

    for (let i = 0; i < POINTS; i++) {
      cx += x[i]
      cy += y[i]
    }

    return [cx / POINTS, cy / POINTS]
  }

  /** Recomputes the outward normal at every point. */
  function updateNormals() {
    for (let i = 0; i < POINTS; i++) {
      const before = (i + POINTS - 1) % POINTS
      const after = (i + 1) % POINTS
      const tx = x[after] - x[before]
      const ty = y[after] - y[before]
      const length = Math.hypot(tx, ty) || 1
      nx[i] = ty / length
      ny[i] = -tx / length
    }
  }

  /** @returns How far the idle motion has faded in, from 0 to 1. */
  function idleAmount() {
    if (world.stillOnly || grab) return 0
    return clamp((world.clock - world.lastTouch - IDLE_AFTER) / IDLE_RAMP, 0, 1)
  }

  /** Moves every point by its velocity, damped, plus the idle forces. */
  function integrate() {
    const keep = DRAG ** SUBSTEP
    const keepWobble = WOBBLE_DAMPING ** SUBSTEP
    const maxStep = MAX_SPEED * SUBSTEP

    let mvx = 0
    let mvy = 0
    for (let i = 0; i < POINTS; i++) {
      mvx += x[i] - px[i]
      mvy += y[i] - py[i]
    }
    mvx /= POINTS
    mvy /= POINTS

    let ax = 0
    let ay = 0
    const idle = idleAmount()
    if (idle > 0) {
      const [cx, cy] = centroid()
      const t = world.clock + phase
      const driftX = Math.sin(t * 0.37) + 0.5 * Math.sin(t * 0.91 + 2)
      const driftY = Math.sin(t * 0.29 + 1) + 0.5 * Math.sin(t * 0.73 + 4)
      // A small gummy wanders less, so on a phone it stays off the copy.
      const drift = DRIFT_FORCE * (radius / RADIUS_MAX)
      ax = idle * (drift * driftX + HOME_PULL * (home.x - cx))
      ay = idle * (drift * driftY + HOME_PULL * (home.y - cy))
    }

    for (let i = 0; i < POINTS; i++) {
      // The body's motion and the wobble about it fade at their own rates:
      // the first is drag, the second is what makes a gummy settle.
      let vx = mvx * keep + (x[i] - px[i] - mvx) * keepWobble
      let vy = mvy * keep + (y[i] - py[i] - mvy) * keepWobble

      vx += ax * SUBSTEP * SUBSTEP
      vy += ay * SUBSTEP * SUBSTEP

      const speed = Math.hypot(vx, vy)
      if (speed > maxStep) {
        vx *= maxStep / speed
        vy *= maxStep / speed
      }

      px[i] = x[i]
      py[i] = y[i]
      x[i] += vx
      y[i] += vy
    }
  }

  /**
   * Pulls the body towards the pointer while it is held.
   *
   * The held region follows closely and the rest is dragged along by the
   * springs, so the gummy stretches behind the hand, and the velocity it has
   * on release is the velocity it was thrown with.
   */
  function pull() {
    if (!grab) return

    let gx = 0
    let gy = 0
    let sum = 0
    for (let i = 0; i < POINTS; i++) {
      const w = grab.weights[i]
      gx += w * x[i]
      gy += w * y[i]
      sum += w
    }

    let dx = grab.x - gx / sum
    let dy = grab.y - gy / sum

    const reach = Math.hypot(dx, dy) * GRAB_STRENGTH
    if (reach > GRAB_STEP) {
      dx *= GRAB_STEP / reach
      dy *= GRAB_STEP / reach
    }

    for (let i = 0; i < POINTS; i++) {
      const f = grab.weights[i] * GRAB_STRENGTH
      x[i] += dx * f
      y[i] += dy * f
    }
  }

  /** Fits the rest shape to the points, turned and moved, but not bent. */
  function refit() {
    const [cx, cy] = centroid()

    let a = 0
    let b = 0
    for (let i = 0; i < POINTS; i++) {
      const dx = x[i] - cx
      const dy = y[i] - cy
      a += qx[i] * dx + qy[i] * dy
      b += qx[i] * dy - qy[i] * dx
    }

    pose.angle = Math.atan2(b, a)
    pose.scale = scale
    pose.x = cx
    pose.y = cy

    const cos = Math.cos(pose.angle) * scale
    const sin = Math.sin(pose.angle) * scale
    for (let i = 0; i < POINTS; i++) {
      goalX[i] = cx + cos * qx[i] - sin * qy[i]
      goalY[i] = cy + sin * qx[i] + cos * qy[i]
    }
  }

  /** Pulls every point towards where the rest shape, best fitted, puts it. */
  function matchShape() {
    refit()
    for (let i = 0; i < POINTS; i++) {
      x[i] += (goalX[i] - x[i]) * STIFFNESS
      y[i] += (goalY[i] - y[i]) * STIFFNESS
    }
  }

  /**
   * Moves and turns the whole body at once, about its centre.
   *
   * @param dx - The move, on x.
   * @param dy - The same for y.
   * @param turn - The turn, in radians.
   */
  function shift(dx: number, dy: number, turn: number) {
    const cos = Math.cos(turn)
    const sin = Math.sin(turn)
    for (let i = 0; i < POINTS; i++) {
      const rx = x[i] - pose.x
      const ry = y[i] - pose.y
      x[i] = pose.x + cos * rx - sin * ry + dx
      y[i] = pose.y + sin * rx + cos * ry + dy
    }

    pose.angle += turn
    pose.x += dx
    pose.y += dy
  }

  /**
   * Holds the points along the ring at their rest spacing.
   *
   * @param gap - How many points apart each pair is.
   * @param rest - Each pair's rest distance, by the first point's index.
   * @param stiffness - How much of the error to correct.
   */
  function constrainRing(gap: number, rest: Float64Array, stiffness: number) {
    for (let i = 0; i < POINTS; i++) {
      const j = (i + gap) % POINTS
      const dx = x[j] - x[i]
      const dy = y[j] - y[i]
      const distance = Math.hypot(dx, dy) || 1
      const correction =
        ((distance - rest[i] * scale) / distance) * 0.5 * stiffness

      x[i] += dx * correction
      y[i] += dy * correction
      x[j] -= dx * correction
      y[j] -= dy * correction
    }
  }

  /** Pushes the surface out or in until the body is back to its area. */
  function preserveArea() {
    let area = 0
    let perimeter = 0
    for (let i = 0; i < POINTS; i++) {
      const j = (i + 1) % POINTS
      area += x[i] * y[j] - x[j] * y[i]
      perimeter += Math.hypot(x[j] - x[i], y[j] - y[i])
    }
    area *= 0.5

    const target = restArea * scale * scale
    const limit = radius * 0.05
    const move = clamp(
      ((target - area) / perimeter) * AREA_STIFFNESS,
      -limit,
      limit
    )

    updateNormals()
    for (let i = 0; i < POINTS; i++) {
      x[i] += nx[i] * move
      y[i] += ny[i] * move
    }
  }

  /** Keeps the surface out of the disc the pointer presses with. */
  function poke() {
    const { pointer } = world
    const disc = clamp(radius * POKE_RATIO, POKE_MIN, POKE_MAX)
    const carry = 1 - POKE_MOMENTUM

    for (let i = 0; i < POINTS; i++) {
      const dx = x[i] - pointer.x
      const dy = y[i] - pointer.y
      const distance = Math.hypot(dx, dy)
      if (distance >= disc || distance === 0) continue

      const push = ((disc - distance) * POKE_STIFFNESS) / distance
      x[i] += dx * push
      y[i] += dy * push
      px[i] += dx * push * carry
      py[i] += dy * push * carry
    }
  }

  /** Keeps every point inside the frame. */
  function contain() {
    for (let i = 0; i < POINTS; i++) {
      x[i] = clamp(x[i], 0, world.width)
      y[i] = clamp(y[i], 0, world.height)
    }
  }

  /** Bounces the points that are pressed against a wall, with some friction. */
  function bounce() {
    const slide = 1 - WALL_FRICTION

    for (let i = 0; i < POINTS; i++) {
      const vx = x[i] - px[i]
      const vy = y[i] - py[i]

      if ((x[i] <= 0 && vx < 0) || (x[i] >= world.width && vx > 0)) {
        px[i] = x[i] + vx * RESTITUTION
        py[i] = y[i] - vy * slide
      }

      if ((y[i] <= 0 && vy < 0) || (y[i] >= world.height && vy > 0)) {
        py[i] = y[i] + vy * RESTITUTION
        px[i] = x[i] - vx * slide
      }
    }
  }

  /** Taps the surface somewhere at random, so the gummy wobbles on its own. */
  function nudge() {
    const at = Math.floor(Math.random() * POINTS)
    const spread = radius * NUDGE_SPREAD

    updateNormals()
    for (let i = 0; i < POINTS; i++) {
      const apart = Math.min(Math.abs(i - at), POINTS - Math.abs(i - at))
      const distance = apart * meanEdge
      const weight = Math.exp(-((distance / spread) ** 2))
      const speed = NUDGE_SPEED * SUBSTEP * weight

      px[i] += nx[i] * speed
      py[i] += ny[i] * speed
    }
  }

  /** Starts a substep: breathes, moves every point, follows the hand. */
  function begin() {
    const breath = Math.sin(
      ((world.clock + phase) * 2 * Math.PI) / BREATH_PERIOD
    )
    scale = world.stillOnly ? 1 : 1 + BREATH_DEPTH * breath

    integrate()
    pull()
  }

  /** Runs one pass of the constraints that hold the body together. */
  function solve() {
    matchShape()
    constrainRing(1, restEdge, EDGE_STIFFNESS)
    constrainRing(2, restBend, BEND_STIFFNESS)
    preserveArea()
    if (world.pointer.inside && !grab) poke()
    contain()
  }

  /** @returns Whether nothing is moving enough to be worth drawing. */
  function settled() {
    for (let i = 0; i < POINTS; i++) {
      if (Math.abs(x[i] - px[i]) > 0.01 || Math.abs(y[i] - py[i]) > 0.01) {
        return false
      }
    }
    return true
  }

  /**
   * Traces the outline as a smooth closed curve through every point.
   *
   * @param ox - What to subtract from every x, to make the data local.
   * @param oy - The same for y.
   * @returns SVG path data, which both `Path2D` and `clip-path` read.
   */
  function outline(ox: number, oy: number) {
    let d = `M${(x[0] - ox).toFixed(1)} ${(y[0] - oy).toFixed(1)}`

    for (let i = 0; i < POINTS; i++) {
      const i0 = (i + POINTS - 1) % POINTS
      const i2 = (i + 1) % POINTS
      const i3 = (i + 2) % POINTS

      const c1x = x[i] + (x[i2] - x[i0]) / 6 - ox
      const c1y = y[i] + (y[i2] - y[i0]) / 6 - oy
      const c2x = x[i2] - (x[i3] - x[i]) / 6 - ox
      const c2y = y[i2] - (y[i3] - y[i]) / 6 - oy

      d +=
        `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ` +
        `${c2x.toFixed(1)} ${c2y.toFixed(1)} ` +
        `${(x[i2] - ox).toFixed(1)} ${(y[i2] - oy).toFixed(1)}`
    }

    return d + "Z"
  }

  /**
   * Shades the gummy pixel by pixel, from the geometry of a rounded slab.
   *
   * The distance to the edge gives each pixel a height on a surface that
   * curves over at the rim and lies almost flat in the middle, and so a
   * normal. From the normal: how much light the surface reflects straight
   * back (a Blinn-Phong specular, which lands on the rims that face the
   * light), how much of the room it mirrors at a grazing angle (Schlick's
   * Fresnel, which brightens the silhouette), and how thick the body is under
   * the pixel, which is what Beer-Lambert absorption turns into colour: deep
   * where thick, nearly clear at the rim. Light that gets in scatters, and
   * leaves again through the thin rim on the side away from the light, which
   * is the glow.
   *
   * Absorption goes on one sprite, as what the page keeps of each channel,
   * and the light on another, since one multiplies the page and the other
   * adds to it.
   *
   * @param path - The outline, in sprite coordinates once scaled.
   * @param w - The sprite's width.
   * @param h - Its height.
   * @param pixel - Sprite pixels per canvas pixel.
   * @param lx - Where the sprite starts inside the box, on x.
   * @param ly - The same for y.
   * @param cx - The body's centre, in sprite coordinates.
   * @param cy - The same for y.
   */
  function shade(
    path: Path2D,
    w: number,
    h: number,
    pixel: number,
    lx: number,
    ly: number,
    cx: number,
    cy: number
  ) {
    if (!tintSpriteContext || !lightSpriteContext) return

    tintSprite.width = w
    tintSprite.height = h
    tintSpriteContext.setTransform(pixel, 0, 0, pixel, -lx * pixel, -ly * pixel)
    tintSpriteContext.fillStyle = "#fff"
    tintSpriteContext.strokeStyle = "#fff"
    tintSpriteContext.lineWidth = (2 * BLEED) / pixel
    tintSpriteContext.lineJoin = "round"
    tintSpriteContext.fill(path)
    tintSpriteContext.stroke(path)

    const tintImage = tintSpriteContext.getImageData(0, 0, w, h)
    const tintData = tintImage.data
    const inside = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) {
      inside[i] = tintData[i * 4 + 3] > 127 ? 1 : 0
    }

    lightSprite.width = w
    lightSprite.height = h
    const lightImage = lightSpriteContext.createImageData(w, h)
    const lightData = lightImage.data

    // The field starts at the band's edge, so the outline sits a little way
    // up the bevel already, which is also what keeps the rim from flaring.
    const distance = distances(inside, w, h)
    const bevel = radius * BEVEL * pixel + BLEED
    const reach = radius * pixel
    const { dark, primary } = world

    const [lightX, lightY, lightZ] = LIGHT
    const [hx, hy, hz] = unit(lightX, lightY, lightZ + 1)
    const lateral = Math.hypot(lightX, lightY) || 1

    // What each thickness lets through of each channel, from the colour,
    // tabulated by height so the hot loop raises nothing to a power.
    const STEPS = 256
    const through = [0, 1, 2].map((channel) => {
      const keep = Math.max(primary[channel], 1) / 255
      const table = new Float32Array(STEPS)
      for (let k = 0; k < STEPS; k++) {
        const z = k / (STEPS - 1)
        table[k] = keep ** ((0.35 + 0.65 * z) * DENSITY) * 255
      }
      return table
    })
    const glow = mix(primary, WHITE, 0.3)
    const room: Rgb = dark ? [40, 40, 40] : WHITE
    const glowGain = GLOW
    // On a dark page there is nothing to tint, so the body colour is painted.
    const scatterGain = dark ? 0.82 : 0.1

    // The lens map is smooth, so half the sprite's resolution is plenty, and
    // it halves what gets encoded as an image every frame.
    const lw = Math.ceil(w / 2)
    const lh = Math.ceil(h / 2)
    const lensData = world.refracting
      ? lensContext!.createImageData(lw, lh)
      : null

    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const at = j * w + i
        const out = at * 4

        if (!inside[at]) {
          tintData[out] = tintData[out + 1] = tintData[out + 2] = 255
          tintData[out + 3] = 255
          if (lensData && (i & 1) === 0 && (j & 1) === 0) {
            const lensOut = ((j >> 1) * lw + (i >> 1)) * 4
            lensData.data[lensOut] = lensData.data[lensOut + 1] = 128
            lensData.data[lensOut + 3] = 255
          }
          continue
        }

        // Which way is inward, from the slope of the distance field.
        let gx = 0
        let gy = 0
        if (i > 0 && i < w - 1 && j > 0 && j < h - 1) {
          gx = distance[at + 1] - distance[at - 1]
          gy = distance[at + w] - distance[at - w]
        }
        const slope = Math.sqrt(gx * gx + gy * gy)
        if (slope > 0.001) {
          gx /= slope
          gy /= slope
        }

        // A quarter circle in profile: upright at the rim, flat by the bevel.
        const u = Math.min(distance[at] / bevel, 1)
        const z = Math.sqrt(1 - (1 - u) * (1 - u))

        let nx = -(1 - u) * gx + ((i - cx) / reach) * DOME
        let ny = -(1 - u) * gy + ((j - cy) / reach) * DOME
        let nz = z
        if (slope <= 0.001 && u < 1) {
          nx = ny = 0
          nz = 1
        }
        const length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
        nx /= length
        ny /= length
        nz /= length

        const ndl = Math.max(0, nx * lightX + ny * lightY + nz * lightZ)
        const ndh = Math.max(0, nx * hx + ny * hy + nz * hz)
        const away = 1 - nz
        const away2 = away * away
        const fresnel = 0.04 + 0.96 * away2 * away2 * away

        // Thickness under this pixel, and what the page keeps through it.
        const row = Math.round(z * (STEPS - 1))
        const lit = 0.88 + 0.12 * ndl
        tintData[out] = through[0][row] * lit
        tintData[out + 1] = through[1][row] * lit
        tintData[out + 2] = through[2][row] * lit
        tintData[out + 3] = 255

        // Scattered light leaves through the rim, mostly away from the light.
        const rim = 1 - z
        const facing = 0.5 - (0.5 * (-gx * lightX - gy * lightY)) / lateral
        const glowing = rim * Math.sqrt(rim) * (0.25 + 0.55 * facing) * glowGain

        // Powers of 16 and 128, by squaring: a broad sheen and a tight glint.
        const ndh2 = ndh * ndh
        const ndh4 = ndh2 * ndh2
        const ndh8 = ndh4 * ndh4
        const ndh16 = ndh8 * ndh8
        const ndh32 = ndh16 * ndh16
        const ndh64 = ndh32 * ndh32
        const specular = Math.min(1, ndh64 * 0.55 + ndh16 * 0.12)
        const mirrored = fresnel * 0.3

        // Composite the light, innermost first, in straight alpha. The first
        // layer is the little the body scatters back out of its middle.
        let a = scatterGain * z
        let r = primary[0]
        let g = primary[1]
        let b = primary[2]

        for (let layer = 0; layer < 3; layer++) {
          const colour = layer === 0 ? glow : layer === 1 ? room : WHITE
          const alpha =
            layer === 0 ? glowing : layer === 1 ? mirrored : specular
          const total = alpha + a * (1 - alpha)
          if (total <= 0) continue
          r = (colour[0] * alpha + r * a * (1 - alpha)) / total
          g = (colour[1] * alpha + g * a * (1 - alpha)) / total
          b = (colour[2] * alpha + b * a * (1 - alpha)) / total
          a = total
        }

        lightData[out] = r
        lightData[out + 1] = g
        lightData[out + 2] = b
        lightData[out + 3] = a * 255

        // The lens bends what is behind the rim outward, strongest at the
        // edge and gone by the flat middle, as a thick rounded edge does.
        if (lensData && (i & 1) === 0 && (j & 1) === 0) {
          const bend = (1 - u) * (1 - u)
          const lensOut = ((j >> 1) * lw + (i >> 1)) * 4
          lensData.data[lensOut] = 128 - gx * bend * 127
          lensData.data[lensOut + 1] = 128 - gy * bend * 127
          lensData.data[lensOut + 2] = 0
          lensData.data[lensOut + 3] = 255
        }
      }
    }

    tintSpriteContext.putImageData(tintImage, 0, 0)
    lightSpriteContext.putImageData(lightImage, 0, 0)

    if (lensData && lensContext && map) {
      lens.width = lw
      lens.height = lh
      lensContext.putImageData(lensData, 0, 0)
      map.setAttribute("href", lens.toDataURL())
    }
  }

  /**
   * Puts the box, and everything drawn in it, at a place in the frame.
   *
   * @param ox - Where the box's top left corner goes, on x.
   * @param oy - The same for y.
   */
  function place(ox: number, oy: number) {
    const transform = `translate(${ox}px, ${oy}px)`
    hit.style.transform = transform
    tint.style.transform = transform
    canvas.style.transform = transform
  }

  /**
   * Sizes the hit layer and both canvases to a box the gummy fits in.
   *
   * The box is square and a little larger than the gummy, so that moving it
   * is a transform, which costs no layout, and nothing is cleared or
   * composited across the whole hero for the sake of one gummy.
   *
   * @param side - The box's side, in CSS pixels.
   */
  function allocate(side: number) {
    const { ratio } = world
    box = side

    hit.style.width = `${box}px`
    hit.style.height = `${box}px`

    for (const [layer, layerContext] of [
      [tint, tintContext],
      [canvas, context],
    ] as const) {
      layer.style.width = `${box}px`
      layer.style.height = `${box}px`
      layer.width = Math.round(box * ratio)
      layer.height = Math.round(box * ratio)
      layerContext.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
  }

  /**
   * Casts the gummy's shadow, blurred by the canvas, onto the box.
   *
   * The outline is filled far off a small sprite with only its shadow landing
   * on it, so what reaches the box is the blur alone, at the sprite's lower
   * resolution, and then scaled up into place.
   *
   * @param path - The outline, in box coordinates.
   * @param lx - Where the gummy's bounds start inside the box, on x.
   * @param ly - The same for y.
   * @param bw - The bounds' width.
   * @param bh - Their height.
   */
  function castShadow(
    path: Path2D,
    lx: number,
    ly: number,
    bw: number,
    bh: number
  ) {
    if (!shadowSpriteContext) return

    const { dark, primary, ratio } = world
    const blur = dark ? GLOW_BLUR : SHADOW_BLUR
    const dx = dark ? 0 : SHADOW_OFFSET_X
    const dy = dark ? GLOW_OFFSET_Y : SHADOW_OFFSET_Y
    const margin = blur * 1.5
    const scale = ratio * SHADOW_SCALE

    shadowSprite.width = Math.ceil((bw + 2 * margin) * scale)
    shadowSprite.height = Math.ceil((bh + 2 * margin) * scale)

    const cast = dark ? primary : mix(primary, BLACK, 0.5)
    shadowSpriteContext.setTransform(
      scale,
      0,
      0,
      scale,
      (margin - lx - OFFSCREEN) * scale,
      (margin - ly) * scale
    )
    shadowSpriteContext.shadowColor = `rgba(${cast[0]},${cast[1]},${cast[2]},${dark ? 0.25 : 0.22})`
    shadowSpriteContext.shadowBlur = blur * scale
    shadowSpriteContext.shadowOffsetX = OFFSCREEN * scale
    shadowSpriteContext.shadowOffsetY = 0
    shadowSpriteContext.fillStyle = "#000"
    shadowSpriteContext.fill(path)

    const target = dark ? context : tintContext
    target.imageSmoothingQuality = "high"
    target.drawImage(
      shadowSprite,
      lx - margin + dx,
      ly - margin + dy,
      bw + 2 * margin,
      bh + 2 * margin
    )
  }

  /**
   * Draws the frame: moves the box over the gummy, shades its sprites, and
   * paints shadow, absorption and light onto the canvases inside the outline.
   */
  function render() {
    if (world.width === 0 || world.height === 0 || radius === 0) return

    const [cx, cy] = centroid()

    if (shaded) {
      let change = 0
      for (let i = 0; i < POINTS; i++) {
        change = Math.max(
          change,
          Math.abs(x[i] - cx - shadedX[i]),
          Math.abs(y[i] - cy - shadedY[i])
        )
      }

      if (change < RESHADE_TOLERANCE) {
        // Moved, in steps of one device pixel, so the layers stay sharp.
        const { ratio } = world
        place(
          shadedOx + Math.round((cx - shadedCx) * ratio) / ratio,
          shadedOy + Math.round((cy - shadedCy) * ratio) / ratio
        )
        return
      }
    }

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (let i = 0; i < POINTS; i++) {
      minX = Math.min(minX, x[i])
      maxX = Math.max(maxX, x[i])
      minY = Math.min(minY, y[i])
      maxY = Math.max(maxY, y[i])
    }

    // The tight bounds of the gummy, and the box they sit in.
    const bx = Math.floor(minX) - PADDING
    const by = Math.floor(minY) - PADDING
    const bw = Math.ceil(maxX) + PADDING - bx
    const bh = Math.ceil(maxY) + PADDING - by

    const need = Math.max(bw, bh) + 2 * (SHADOW_OFFSET_Y + SHADOW_BLUR * 1.5)
    if (need > box) allocate(Math.ceil(need * 1.25))

    const ox = Math.round(bx + (bw - box) / 2)
    const oy = Math.round(by + (bh - box) / 2)
    const lx = bx - ox
    const ly = by - oy

    const d = outline(ox, oy)
    const path = new Path2D(d)

    place(ox, oy)
    hit.style.clipPath = `path("${d}")`

    for (let i = 0; i < POINTS; i++) {
      shadedX[i] = x[i] - cx
      shadedY[i] = y[i] - cy
    }
    shaded = true
    shadedCx = cx
    shadedCy = cy
    shadedOx = ox
    shadedOy = oy

    if (map) {
      map.setAttribute("x", String(lx))
      map.setAttribute("y", String(ly))
      map.setAttribute("width", String(bw))
      map.setAttribute("height", String(bh))
    }

    // Every gummy is shaded at the largest one's density, so they look alike
    // and a small one costs in proportion to its size.
    const pixel = Math.min(
      world.ratio,
      world.density,
      SPRITE_SIZE / Math.max(bw, bh)
    )
    const sw = Math.ceil(bw * pixel)
    const sh = Math.ceil(bh * pixel)
    shade(path, sw, sh, pixel, lx, ly, (cx - bx) * pixel, (cy - by) * pixel)

    tintContext.clearRect(0, 0, box, box)
    context.clearRect(0, 0, box, box)

    // What a translucent body casts is the light that came through it: a
    // darkening on a light page, a glow on a dark one.
    castShadow(path, lx, ly, bw, bh)

    tintContext.save()
    tintContext.clip(path)
    tintContext.imageSmoothingQuality = "high"
    tintContext.drawImage(tintSprite, 0, 0, sw, sh, lx, ly, bw, bh)
    tintContext.restore()

    context.save()
    context.clip(path)
    context.imageSmoothingQuality = "high"
    context.drawImage(lightSprite, 0, 0, sw, sh, lx, ly, bw, bh)
    context.restore()
  }

  /**
   * Fits the gummy to a new radius and home, keeping where it is if it has
   * already been placed.
   *
   * @param value - The new radius.
   * @param homeX - Where the gummy rests, on x.
   * @param homeY - The same for y.
   */
  function fit(value: number, homeX: number, homeY: number) {
    shaded = false
    const before = radius
    setRadius(value)
    home.x = homeX
    home.y = homeY

    if (before === 0) {
      for (let i = 0; i < POINTS; i++) {
        x[i] = px[i] = home.x + qx[i]
        y[i] = py[i] = home.y + qy[i]
      }
    } else {
      const [cx, cy] = centroid()
      const factor = radius / before
      for (let i = 0; i < POINTS; i++) {
        x[i] = cx + (x[i] - cx) * factor
        y[i] = cy + (y[i] - cy) * factor
        px[i] = cx + (px[i] - cx) * factor
        py[i] = cy + (py[i] - cy) * factor
      }
    }

    contain()
    allocate(
      Math.ceil(
        radius * 2.4 + 2 * PADDING + 2 * (SHADOW_OFFSET_Y + SHADOW_BLUR * 1.5)
      )
    )
  }

  /**
   * Takes hold of the gummy where a pointer went down on it.
   *
   * @param id - The pointer's id.
   * @param gx - Where it went down, on x.
   * @param gy - The same for y.
   */
  function grabAt(id: number, gx: number, gy: number) {
    const spread = radius * GRAB_SPREAD
    const weights = new Float64Array(POINTS)

    for (let i = 0; i < POINTS; i++) {
      const distance = Math.hypot(x[i] - gx, y[i] - gy)
      weights[i] =
        GRAB_FLOOR + (1 - GRAB_FLOOR) * Math.exp(-((distance / spread) ** 2))
    }

    grab = { id, weights, x: gx, y: gy }
    hit.setAttribute("data-grabbing", "")
  }

  if (map && lensContext && world.refracting) {
    // A smaller gummy is thinner, so it bends the page less.
    map
      .closest("filter")
      ?.querySelector("[data-gummy-refraction]")
      ?.setAttribute("scale", String(REFRACTION * Math.sqrt(SIZES[index])))
    hit.style.backdropFilter = `url("#hero-gummy-refraction-${index}") saturate(1.5) brightness(1.03)`
  }

  return {
    begin,
    fit,
    goalX,
    goalY,
    grabAt,
    get grabbed() {
      return grab ? grab.id : null
    },
    hit,
    hold(gx: number, gy: number) {
      if (!grab) return
      grab.x = gx
      grab.y = gy
    },
    get mass() {
      return restArea
    },
    pose,
    get radius() {
      return radius
    },
    maybeNudge() {
      if (idleAmount() > 0 && world.clock > nudgeAt) {
        nudge()
        nudgeAt = world.clock + NUDGE_MIN + Math.random() * NUDGE_RANGE
      }
    },
    release(id: number) {
      if (!grab || grab.id !== id) return
      grab = null
      hit.removeAttribute("data-grabbing")
    },
    render() {
      render()
    },
    refit,
    reshade() {
      shaded = false
      render()
    },
    settle: bounce,
    settled,
    shift,
    solve,
    x,
    y,
  }
}

/**
 * Finds the first edge of an outline that a path crosses.
 *
 * @param gummy - The gummy whose outline is crossed.
 * @param x0 - Where the path starts, on x.
 * @param y0 - The same for y.
 * @param x1 - Where it ends, on x.
 * @param y1 - The same for y.
 * @returns The edge crossed nearest the start, or -1 if it crosses none.
 */
function crossing(
  gummy: Gummy,
  x0: number,
  y0: number,
  x1: number,
  y1: number
) {
  const { x, y } = gummy
  const mx = x1 - x0
  const my = y1 - y0
  let first = Infinity
  let edge = -1

  for (let k = 0; k < POINTS; k++) {
    const j = (k + 1) % POINTS
    const ex = x[j] - x[k]
    const ey = y[j] - y[k]
    const denominator = mx * ey - my * ex
    if (Math.abs(denominator) < 1e-9) continue

    const s = ((x[k] - x0) * ey - (y[k] - y0) * ex) / denominator
    const t = ((x[k] - x0) * my - (y[k] - y0) * mx) / denominator
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1 && s < first) {
      first = s
      edge = k
    }
  }

  return edge
}

/**
 * Pushes one gummy's points out of another, and the other's surface back.
 *
 * A point inside the other outline, or within {@link SKIN} of it, moves to
 * that distance outside an edge, and the edge gives way the opposite way,
 * each by its share of the two masses, so a small gummy yields to a large
 * one rather than shoving it.
 *
 * We decided to send a point out through the first edge on its way from
 * where its own rest shape puts it, rather than through the nearest edge,
 * because that side is right however deep a hard push drove it, and the
 * nearest edge is not: a point sent out the far side of an arm is pulled back
 * through it by its own shape, sent out again, and the two gummies lock
 * together. {@link separateBars} keeps the rest shapes apart, so that side
 * always exists.
 *
 * A side already pressed against a wall cannot give way, so the other side
 * takes the whole correction: a gummy trapped against the frame pushes back
 * on whatever presses it, rather than being crushed flat.
 *
 * @param a - The gummy whose points are tested.
 * @param b - The gummy whose outline they are tested against.
 * @param width - The frame's width, where its right wall is.
 * @param height - The frame's height, where its floor is.
 */
function pushOut(a: Gummy, b: Gummy, width: number, height: number) {
  const { goalX, goalY, x: ax, y: ay } = a
  const { x: bx, y: by } = b

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (let i = 0; i < POINTS; i++) {
    if (bx[i] < minX) minX = bx[i]
    if (bx[i] > maxX) maxX = bx[i]
    if (by[i] < minY) minY = by[i]
    if (by[i] > maxY) maxY = by[i]
  }
  minX -= SKIN
  maxX += SKIN
  minY -= SKIN
  maxY += SKIN

  const massA = a.mass * (a.grabbed === null ? 1 : HELD_MASS)
  const massB = b.mass * (b.grabbed === null ? 1 : HELD_MASS)
  const share = massB / (massA + massB)

  for (let i = 0; i < POINTS; i++) {
    const qx = ax[i]
    const qy = ay[i]
    if (qx < minX || qx > maxX || qy < minY || qy > maxY) continue

    // Inside by counting crossings, and the nearest edge on the same walk.
    let inside = false
    let best = Infinity
    let edge = 0

    for (let j = 0, k = POINTS - 1; j < POINTS; k = j++) {
      const x1 = bx[k]
      const y1 = by[k]
      const ex = bx[j] - x1
      const ey = by[j] - y1

      if (by[j] > qy !== y1 > qy && qx < (ex * (qy - y1)) / (ey || 1e-9) + x1) {
        inside = !inside
      }

      const t = clamp(
        ((qx - x1) * ex + (qy - y1) * ey) / (ex * ex + ey * ey || 1),
        0,
        1
      )
      const dx = x1 + ex * t - qx
      const dy = y1 + ey * t - qy
      const distance = dx * dx + dy * dy
      if (distance < best) {
        best = distance
        edge = k
      }
    }

    if (!inside && Math.sqrt(best) >= SKIN) continue

    // A point inside, or outside but past the other gummy's surface from
    // where it belongs, goes back out on its own side. If a stretched arm
    // covers even its rest place, its own centre still shows which side that is.
    let crossed = crossing(b, goalX[i], goalY[i], qx, qy)
    const astray = !inside && crossed >= 0
    if (inside && crossed < 0) crossed = crossing(b, a.pose.x, a.pose.y, qx, qy)
    if (crossed >= 0 && (inside || astray)) edge = crossed

    const next = (edge + 1) % POINTS
    const ex = bx[next] - bx[edge]
    const ey = by[next] - by[edge]
    const length = Math.hypot(ex, ey) || 1
    const along = clamp(
      ((qx - bx[edge]) * ex + (qy - by[edge]) * ey) / (length * length),
      0,
      1
    )

    // The outline runs clockwise on screen, so each edge's outside is on its
    // left.
    const nx = ey / length
    const ny = -ex / length
    const dx = bx[edge] + ex * along + nx * SKIN - qx
    const dy = by[edge] + ey * along + ny * SKIN - qy

    // A point that strayed is put back without shoving the surface it
    // strayed past, which did nothing to send it there.
    let yieldA = share
    if (astray) yieldA = 1
    else if (pinned(qx, qy, dx, dy, width, height)) yieldA = 0
    else if (
      pinned(bx[edge], by[edge], -dx, -dy, width, height) ||
      pinned(bx[next], by[next], -dx, -dy, width, height)
    ) {
      yieldA = 1
    }

    press(ax, ay, i, dx * yieldA, dy * yieldA)
    press(
      bx,
      by,
      edge,
      -dx * (1 - yieldA) * (1 - along),
      -dy * (1 - yieldA) * (1 - along)
    )
    press(bx, by, next, -dx * (1 - yieldA) * along, -dy * (1 - yieldA) * along)
  }
}

/** How much of a contact's push reaches each neighbour along the surface. */
const SPREAD = [0.55, 0.22]

/**
 * Moves one point of a surface, and its neighbours by a falling share, the
 * way a membrane gives under a press, so a contact dents the surface rather
 * than crinkling it point by point.
 *
 * @param x - The surface's x coordinates.
 * @param y - Its y coordinates.
 * @param at - The point pressed.
 * @param dx - The press, on x.
 * @param dy - The same for y.
 */
function press(
  x: Float64Array,
  y: Float64Array,
  at: number,
  dx: number,
  dy: number
) {
  x[at] += dx
  y[at] += dy

  SPREAD.forEach((share, offset) => {
    const before = (at - offset - 1 + POINTS) % POINTS
    const after = (at + offset + 1) % POINTS
    x[before] += dx * share
    y[before] += dy * share
    x[after] += dx * share
    y[after] += dy * share
  })
}

/**
 * Tells whether a point is against a wall and would be pushed into it.
 *
 * @param x - The point, on x.
 * @param y - The same for y.
 * @param dx - The push, on x.
 * @param dy - The same for y.
 * @param width - The frame's width.
 * @param height - The frame's height.
 * @returns Whether the wall stops the push.
 */
function pinned(
  x: number,
  y: number,
  dx: number,
  dy: number,
  width: number,
  height: number
) {
  return (
    (x <= 0.5 && dx < 0) ||
    (x >= width - 0.5 && dx > 0) ||
    (y <= 0.5 && dy < 0) ||
    (y >= height - 0.5 && dy > 0)
  )
}

/**
 * Tells whether a whole gummy is against a wall and would be pushed into it.
 *
 * @param gummy - The gummy.
 * @param dx - The push, on x.
 * @param dy - The same for y.
 * @param width - The frame's width.
 * @param height - The frame's height.
 * @returns Whether any of its points is stopped by a wall.
 */
function walled(
  gummy: Gummy,
  dx: number,
  dy: number,
  width: number,
  height: number
) {
  for (let i = 0; i < POINTS; i++) {
    if (pinned(gummy.x[i], gummy.y[i], dx, dy, width, height)) return true
  }
  return false
}

/**
 * Lays one of a gummy's bars out where its fitted rest shape puts it.
 *
 * @param gummy - The gummy.
 * @param index - Which of its bars.
 * @returns The bar's centre line, and half its width: the radius of the round
 *   caps its stroke would be drawn with.
 */
function bar(gummy: Gummy, index: number) {
  const { angle, scale, x, y } = gummy.pose
  const half = gummy.radius * BAR_HALF_WIDTH * scale
  const reach = gummy.radius * scale - half
  const turn = angle + (index * Math.PI) / BARS
  const dx = Math.cos(turn) * reach
  const dy = Math.sin(turn) * reach

  return { half, x1: x - dx, x2: x + dx, y1: y - dy, y2: y + dy }
}

/**
 * Finds the closest points of two segments.
 *
 * @see https://realtimecollisiondetection.net/books/rtcd/
 *
 * @param ax - The first segment's start, on x.
 * @param ay - The same for y.
 * @param ux - The first segment, from start to end, on x.
 * @param uy - The same for y.
 * @param bx - The second segment's start, on x.
 * @param by - The same for y.
 * @param vx - The second segment, from start to end, on x.
 * @param vy - The same for y.
 * @returns How far along each segment its closest point is, from 0 to 1.
 */
function closest(
  ax: number,
  ay: number,
  ux: number,
  uy: number,
  bx: number,
  by: number,
  vx: number,
  vy: number
): [number, number] {
  const rx = ax - bx
  const ry = ay - by
  const uu = ux * ux + uy * uy
  const vv = vx * vx + vy * vy
  const uv = ux * vx + uy * vy
  const ur = ux * rx + uy * ry
  const vr = vx * rx + vy * ry
  const denominator = uu * vv - uv * uv

  let s =
    denominator > 1e-9 ? clamp((uv * vr - ur * vv) / denominator, 0, 1) : 0
  let t = (uv * s + vr) / vv

  if (t < 0) {
    t = 0
    s = clamp(-ur / uu, 0, 1)
  } else if (t > 1) {
    t = 1
    s = clamp((uv - ur) / uu, 0, 1)
  }

  return [s, t]
}

/**
 * Keeps two gummies' rest shapes apart, moving and turning each whole body.
 *
 * Point by point, the collision keeps surfaces apart, and squashes them as it
 * does. This is the guarantee under it: each gummy's rest shape, fitted to
 * where its points are, is three rounded bars, and no bar of one is ever left
 * overlapping a bar of the other. However hard a hand pushes, the shapes the
 * two bodies spring back to never overlap, so the two can never stay merged.
 *
 * Each overlap is undone as a rigid body would undo it, by each gummy's
 * share of the mass and of the turn about its centre, and a gummy a wall
 * stops takes none of it.
 *
 * @param a - One gummy.
 * @param b - The other.
 * @param width - The frame's width.
 * @param height - The frame's height.
 */
function separateBars(a: Gummy, b: Gummy, width: number, height: number) {
  for (let i = 0; i < BARS; i++) {
    for (let j = 0; j < BARS; j++) {
      const p = bar(a, i)
      const q = bar(b, j)
      const ux = p.x2 - p.x1
      const uy = p.y2 - p.y1
      const vx = q.x2 - q.x1
      const vy = q.y2 - q.y1
      const [s, t] = closest(p.x1, p.y1, ux, uy, q.x1, q.y1, vx, vy)

      const cax = p.x1 + ux * s
      const cay = p.y1 + uy * s
      const cbx = q.x1 + vx * t
      const cby = q.y1 + vy * t
      let nx = cbx - cax
      let ny = cby - cay
      let distance = Math.hypot(nx, ny)
      const least = p.half + q.half
      if (distance >= least) continue

      // Bars that cross have no closest direction, so they part along the
      // line between the two centres.
      if (distance < 1e-6) {
        nx = b.pose.x - a.pose.x
        ny = b.pose.y - a.pose.y
        distance = 0
      }
      const length = Math.hypot(nx, ny)
      if (length < 1e-6) {
        nx = 1
        ny = 0
      } else {
        nx /= length
        ny /= length
      }

      let inverseA = 1 / (a.mass * (a.grabbed === null ? 1 : HELD_MASS))
      let inverseB = 1 / (b.mass * (b.grabbed === null ? 1 : HELD_MASS))
      const stuckA = walled(a, -nx, -ny, width, height)
      const stuckB = walled(b, nx, ny, width, height)
      if (stuckA && !stuckB) inverseA = 0
      if (stuckB && !stuckA) inverseB = 0

      const leverA = (cax - a.pose.x) * ny - (cay - a.pose.y) * nx
      const leverB = (cbx - b.pose.x) * ny - (cby - b.pose.y) * nx
      const spinA = inverseA / (INERTIA * (a.radius * a.pose.scale) ** 2)
      const spinB = inverseB / (INERTIA * (b.radius * b.pose.scale) ** 2)
      const total =
        inverseA + spinA * leverA ** 2 + inverseB + spinB * leverB ** 2
      if (total === 0) continue

      const depth = (least - distance) / total
      a.shift(
        -nx * depth * inverseA,
        -ny * depth * inverseA,
        -leverA * depth * spinA
      )
      b.shift(
        nx * depth * inverseB,
        ny * depth * inverseB,
        leverB * depth * spinB
      )
    }
  }
}

/**
 * Runs the hero's gummies: steps them together, keeps them apart, draws them,
 * and hands them the pointer.
 *
 * The simulation runs on fixed substeps, so it behaves the same at any frame
 * rate, and stops whenever the hero is out of view.
 *
 * @param frame - The element carrying `data-hero-gummy`, whose edges the
 *   gummies bump against. Watched for resizes.
 */
function initHeroGummies(frame: HTMLElement) {
  // Only Chromium runs an SVG filter over a backdrop. Everywhere else the
  // gummies keep the blur from their classes, and no refraction.
  const brands =
    (navigator as { userAgentData?: { brands: { brand: string }[] } })
      .userAgentData?.brands ?? []

  const world: World = {
    clock: 0,
    dark: document.documentElement.classList.contains("dark"),
    density: 1,
    height: 0,
    lastTouch: -Infinity,
    pointer: { inside: false, x: 0, y: 0 },
    primary: resolveToken(frame, "--primary"),
    ratio: 1,
    refracting: brands.some(({ brand }) => /chromium/i.test(brand)),
    stillOnly: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    width: 0,
  }

  const gummies: Gummy[] = []
  for (const layer of frame.querySelectorAll<HTMLElement>("[data-gummy]")) {
    const index = Number(layer.dataset.gummy)
    const hit = layer.querySelector<HTMLElement>("[data-gummy-body]")
    const tint = layer.querySelector<HTMLCanvasElement>("[data-gummy-tint]")
    const tintContext = tint?.getContext("2d")
    const canvas = layer.querySelector<HTMLCanvasElement>("[data-gummy-light]")
    const context = canvas?.getContext("2d")
    const map = layer.querySelector<SVGFEImageElement>("[data-gummy-map]")

    if (index >= SIZES.length) continue
    if (!hit || !tint || !tintContext || !canvas || !context) continue

    gummies.push(
      createGummy(world, index, hit, tint, tintContext, canvas, context, map)
    )
  }

  if (gummies.length === 0) return

  let lastFrame = 0
  let accumulator = 0
  let running = false
  let visible = true
  let frames = 0

  /** Keeps every pair of gummies apart: their rest shapes, then surfaces. */
  function collide() {
    const { height, width } = world

    for (const gummy of gummies) gummy.refit()
    for (let a = 0; a < gummies.length; a++) {
      for (let b = a + 1; b < gummies.length; b++) {
        separateBars(gummies[a], gummies[b], width, height)
      }
    }

    for (const gummy of gummies) gummy.refit()
    for (let a = 0; a < gummies.length; a++) {
      for (let b = a + 1; b < gummies.length; b++) {
        pushOut(gummies[a], gummies[b], width, height)
        pushOut(gummies[b], gummies[a], width, height)
      }
    }
  }

  /** Advances every gummy by one substep, colliding them in every pass. */
  function step() {
    world.clock += SUBSTEP

    for (const gummy of gummies) gummy.begin()

    for (let pass = 0; pass < SOLVER_PASSES; pass++) {
      for (const gummy of gummies) gummy.solve()
      collide()
    }

    for (const gummy of gummies) gummy.settle()
  }

  /** @returns Whether a hand is on the scene, or was a moment ago. */
  function busy() {
    return (
      world.pointer.inside ||
      gummies.some((gummy) => gummy.grabbed !== null) ||
      world.clock - world.lastTouch < IDLE_AFTER
    )
  }

  /**
   * Runs the simulation up to now, draws it, and queues the next frame.
   *
   * @param time - The timestamp `requestAnimationFrame` supplies.
   */
  function tick(time: number) {
    if (!visible) {
      running = false
      return
    }

    accumulator += Math.min((time - lastFrame) / 1000, MAX_FRAME_DELTA)
    lastFrame = time

    while (accumulator >= SUBSTEP) {
      step()
      accumulator -= SUBSTEP
    }

    for (const gummy of gummies) gummy.maybeNudge()

    // Nothing touched, the gummies only breathe and drift, so each is drawn
    // every other frame, and not all on the same one: at that pace the
    // difference cannot be seen, and the work is spread evenly.
    const active = busy()
    frames++
    gummies.forEach((gummy, index) => {
      if (active || (frames + index) % 2 === 0) gummy.render()
    })

    // With less motion asked for, nothing moves on its own, so once the
    // gummies have come to rest there is nothing to draw until the next touch.
    if (
      world.stillOnly &&
      !active &&
      gummies.every((gummy) => gummy.settled())
    ) {
      running = false
      return
    }

    requestAnimationFrame(tick)
  }

  /** Starts the frame loop, unless it is already going or off-screen. */
  function wake() {
    if (running || !visible) return

    running = true
    lastFrame = performance.now()
    accumulator = 0
    requestAnimationFrame(tick)
  }

  /** Reads the frame's size, and fits the gummies and their homes to it. */
  function resize() {
    // The frame's content box: its border is what the gummies bump against.
    world.ratio = Math.min(window.devicePixelRatio || 1, 2)
    world.width = frame.clientWidth
    world.height = frame.clientHeight

    const { height, width } = world
    if (width === 0 || height === 0) return

    const narrow = width < NARROW_FRAME
    const radius = narrow
      ? clamp(width * NARROW_RADIUS_RATIO, NARROW_RADIUS_MIN, NARROW_RADIUS_MAX)
      : clamp(Math.min(width, height) * RADIUS_RATIO, RADIUS_MIN, RADIUS_MAX)

    // The large gummy rests right of the copy, the medium one below and to
    // its left, the small one below and to its right. On a phone all three
    // line up in the empty band above the copy.
    const lx = narrow ? width - radius * 1.25 : width - radius * 1.9
    const ly = narrow
      ? radius * 0.95
      : clamp(height * 0.42, radius * 1.3, height - radius * 1.3)
    const homes: [number, number][] = narrow
      ? [
          [lx, ly],
          [lx - radius * 2.3, radius * 0.75],
          [lx - radius * 3.9, radius * 0.6],
        ]
      : [
          [lx, ly],
          [lx - radius * 1.75, ly + radius * 1.05],
          [lx + radius * 1.1, ly + radius * 1.5],
        ]

    // The largest gummy at rest fills the sprite; the rest share its density.
    world.density =
      SPRITE_SIZE / (radius * 2 * (1 + BAR_HALF_WIDTH) + 2 * PADDING)

    gummies.forEach((gummy, index) => {
      const size = radius * SIZES[index]
      const [hx, hy] = homes[index]
      // How far the shape actually reaches: a tip goes its cap's radius past
      // the radius across, and the slanted bars a little less up and down. A
      // home any closer to a wall would start the gummy pressed into it.
      const across = size * (1 + BAR_HALF_WIDTH) + WALL_GAP
      const upright = size * (Math.sin(Math.PI / 3) + BAR_HALF_WIDTH) + WALL_GAP
      gummy.fit(
        size,
        clamp(hx, across, width - across),
        clamp(hy, upright, height - upright)
      )
      gummy.render()
    })

    wake()
  }

  /**
   * Reads where an event landed, in the frame's own coordinates.
   *
   * @param event - A pointer event.
   * @returns The point, relative to the frame's content box.
   */
  function locate(event: PointerEvent): [number, number] {
    const rect = frame.getBoundingClientRect()
    return [
      event.clientX - rect.left - frame.clientLeft,
      event.clientY - rect.top - frame.clientTop,
    ]
  }

  /**
   * Lets go of whichever gummy this pointer holds.
   *
   * @param event - The pointer event that ends the hold.
   */
  function release(event: PointerEvent) {
    for (const gummy of gummies) gummy.release(event.pointerId)

    // A finger lifts off; a mouse stays where it is.
    if (event.pointerType !== "mouse") world.pointer.inside = false

    world.lastTouch = world.clock
  }

  resize()
  new ResizeObserver(resize).observe(frame)

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    wake()
  }).observe(frame)

  new MutationObserver(() => {
    world.primary = resolveToken(frame, "--primary")
    world.dark = document.documentElement.classList.contains("dark")
    for (const gummy of gummies) gummy.reshade()
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })

  for (const gummy of gummies) {
    gummy.hit.addEventListener("pointerdown", (event) => {
      // Stops a drag from selecting the text the gummy is sliding over.
      event.preventDefault()

      const [gx, gy] = locate(event)
      gummy.grabAt(event.pointerId, gx, gy)
      gummy.hit.setPointerCapture(event.pointerId)

      world.lastTouch = world.clock
      wake()
    })

    gummy.hit.addEventListener("pointerup", release)
    gummy.hit.addEventListener("pointercancel", release)
  }

  // The hover listeners go on the section rather than on the hit layers, so
  // the pointer already presses on a surface as it approaches from outside.
  const section = frame.closest("section")

  section?.addEventListener("pointermove", (event) => {
    const [mx, my] = locate(event)
    const { height, pointer, width } = world

    for (const gummy of gummies) {
      if (gummy.grabbed === event.pointerId) {
        gummy.hold(clamp(mx, 0, width), clamp(my, 0, height))
      }
    }

    pointer.x = mx
    pointer.y = my
    pointer.inside =
      mx > -POKE_MAX &&
      mx < width + POKE_MAX &&
      my > -POKE_MAX &&
      my < height + POKE_MAX

    world.lastTouch = world.clock
    wake()
  })

  section?.addEventListener("pointerleave", () => {
    world.pointer.inside = false
  })

  // The page has taken the touch for scrolling, so the finger is gone.
  section?.addEventListener("pointercancel", () => {
    world.pointer.inside = false
  })
}

for (const frame of document.querySelectorAll<HTMLElement>(
  "[data-hero-gummy]"
)) {
  initHeroGummies(frame)
}
