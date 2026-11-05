import { asterisk, type Bar, MARK_WEIGHT } from "@/libs/asterisk"

/**
 * The poses the spinner cycles through, shared by the hero's status line and
 * the favicon so the two can never drift apart.
 *
 * The mark blooms from a dot through thin-armed stars to the full asterisk
 * and folds back, the way Claude Code's own spinner does, turning a little
 * each frame. The arms stay slender until the last step, or a half-grown mark
 * reads as a blob rather than a star. A full cycle
 * turns it 60°, which its symmetry makes indistinguishable from not turning,
 * so the loop has no seam.
 */
const BLOOM = [
  { length: 0.2, width: 0.62 },
  { length: 0.55, width: 0.42 },
  { length: 0.78, width: 0.52 },
  { length: 0.92, width: 0.72 },
  { length: 1, width: 1 },
]

const CYCLE = [...BLOOM, ...BLOOM.slice(1, -1).reverse()]

export const SPINNER_FRAMES = CYCLE.map((pose, index) => ({
  ...pose,
  turn: (index * 60) / CYCLE.length,
}))

/** The frame the spinner rests on, when it is not turning: the full mark. */
export const SPINNER_REST = BLOOM.length - 1

/** How long each frame is held, in milliseconds. */
export const SPINNER_INTERVAL = 110

/**
 * Lays one spinner frame out.
 *
 * @param frame - An index into {@link SPINNER_FRAMES}.
 * @param radius - How far a tip reaches at full bloom.
 *
 * @returns The bars' centre lines, and the stroke width to draw them with.
 */
export function spinnerFrame(
  frame: number,
  radius: number
): { bars: Bar[]; strokeWidth: number } {
  const pose = SPINNER_FRAMES[frame]
  return asterisk(radius, { ...pose, width: pose.width * MARK_WEIGHT })
}
