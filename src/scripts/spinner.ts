/**
 * The frames the spinner cycles through, shared by the hero's status line and
 * the favicon so the two can never drift apart.
 */
export const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

/** How long each frame is held, in milliseconds. */
export const SPINNER_INTERVAL = 80

/**
 * Decodes which dots a braille pattern character raises.
 *
 * A braille pattern is `U+2800` plus a bitmask, one bit per dot, numbered down
 * the left column first and then down the right, with the two bottom dots
 * last. Decoding the character rather than hardcoding the shapes means the
 * favicon draws whatever the hero prints, including any frame added later.
 *
 * @param frame - One character from {@link SPINNER_FRAMES}.
 *
 * @returns The raised dots as `[column, row]` pairs, in a grid two wide and
 *   four tall.
 */
export function brailleDots(frame: string): [number, number][] {
  const bits = (frame.codePointAt(0) ?? 0x2800) - 0x2800

  const positions: [number, number][] = [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
    [0, 3],
    [1, 3],
  ]

  return positions.filter((_, index) => bits & (1 << index))
}
