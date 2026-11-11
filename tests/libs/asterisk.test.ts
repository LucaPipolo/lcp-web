import { describe, expect, it } from "vitest"

import { asterisk, type Bar, BAR_HALF_WIDTH, BARS } from "@/libs/asterisk"

/**
 * Tells how far a bar's tip lies from the centre.
 *
 * @param bar - The bar to measure.
 *
 * @returns The distance from the origin to its end.
 */
function reachOf([, , x2, y2]: Bar): number {
  return Math.hypot(x2, y2)
}

/**
 * Tells which way a bar points.
 *
 * @param bar - The bar to measure.
 *
 * @returns Its angle in degrees, between 0 and 180.
 */
function angleOf([, , x2, y2]: Bar): number {
  return ((Math.atan2(y2, x2) * 180) / Math.PI + 180) % 180
}

describe("asterisk", () => {
  it("lays out three bars crossing at the centre", () => {
    const { bars } = asterisk(100)

    expect(bars).toHaveLength(BARS)
    for (const [x1, y1, x2, y2] of bars) {
      expect(x1 + x2).toBeCloseTo(0)
      expect(y1 + y2).toBeCloseTo(0)
    }
  })

  it("starts with a horizontal bar and spaces the bars evenly", () => {
    const angles = asterisk(100).bars.map(angleOf)

    expect(angles[0]).toBeCloseTo(0)
    expect(angles[1]).toBeCloseTo(60, 0)
    expect(angles[2]).toBeCloseTo(120, 0)
  })

  it("stops each bar short of the tip by half its width", () => {
    const { bars, strokeWidth } = asterisk(100)

    expect(strokeWidth).toBe(100 * BAR_HALF_WIDTH * 2)
    for (const bar of bars) {
      expect(reachOf(bar)).toBeCloseTo(100 - strokeWidth / 2, 1)
    }
  })

  it("turns the whole mark", () => {
    const angles = asterisk(100, { turn: 90 }).bars.map(angleOf)

    expect(angles[0]).toBeCloseTo(90)
  })

  it("thins the bars and lets them reach further", () => {
    const { bars, strokeWidth } = asterisk(100, { width: 0.5 })

    expect(strokeWidth).toBe(26)
    expect(reachOf(bars[0])).toBeCloseTo(100 - strokeWidth / 2, 1)
  })

  it("collapses to a dot when no length is left", () => {
    const { bars, strokeWidth } = asterisk(100, { length: 0 })

    for (const bar of bars) expect(reachOf(bar)).toBe(0)
    expect(strokeWidth).toBe(100 * BAR_HALF_WIDTH * 2)
  })
})
