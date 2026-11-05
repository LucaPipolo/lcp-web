/**
 * The asterisk is the site's mark: the gummy in the hero, the wordmark's full
 * stop, the badge's spinner and the favicon are all drawn from these numbers,
 * so none of them can drift from the others.
 *
 * It is three rounded bars crossing at the centre, the first one horizontal.
 */
export const BARS = 3

/** Half a bar's width, as a fraction of how far a tip reaches. */
export const BAR_HALF_WIDTH = 0.26

/**
 * How thick the mark's bars are next to the gummy's, which is drawn as a body
 * and can carry more weight than a glyph set beside text.
 */
export const MARK_WEIGHT = 0.7

/** One bar, as the centre line its rounded stroke is drawn along. */
export type Bar = [x1: number, y1: number, x2: number, y2: number]

interface Pose {
  /** How far the tips reach, as a fraction of the full radius. */
  length?: number
  /** How far the whole mark is turned, in degrees. */
  turn?: number
  /** How thick the bars are, as a fraction of their full width. */
  width?: number
}

/**
 * Lays an asterisk out as strokes with round caps, centred on the origin.
 *
 * A stroke's caps reach half its width past its ends, so each bar's centre
 * line stops that far short of the tip. A pose with no length left is a dot.
 *
 * @param radius - How far a tip reaches at full length.
 * @param pose - How bloomed and turned the mark is.
 *
 * @returns The bars' centre lines, and the stroke width to draw them with.
 */
export function asterisk(
  radius: number,
  { length = 1, turn = 0, width = 1 }: Pose = {}
): { bars: Bar[]; strokeWidth: number } {
  const half = radius * BAR_HALF_WIDTH * width
  const reach = Math.max(0, radius * length - half)
  const bars: Bar[] = []

  for (let bar = 0; bar < BARS; bar++) {
    const angle = ((turn + (bar * 180) / BARS) * Math.PI) / 180
    const dx = Math.round(Math.cos(angle) * reach * 100) / 100
    const dy = Math.round(Math.sin(angle) * reach * 100) / 100
    bars.push([-dx, -dy, dx, dy])
  }

  return { bars, strokeWidth: Math.round(half * 200) / 100 }
}
