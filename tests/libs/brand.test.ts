import { describe, expect, it } from "vitest"

import { BRAND_COLORS, getMarkSvg, renderIcon } from "@/libs/brand"

import { pngSize } from "../support/png"

describe("getMarkSvg", () => {
  it("draws the mark's bars on a transparent square centred on the origin", () => {
    const svg = getMarkSvg(48)

    expect(svg).toMatch(
      /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="48" height="48" viewBox="-24 -24 48 48">/
    )
    expect(svg).not.toContain("<rect")
    expect(svg.match(/<line /g)).toHaveLength(3)
    expect(svg).toContain(`stroke="${BRAND_COLORS.primary}"`)
  })

  it("fills the square behind the mark when given a background", () => {
    expect(getMarkSvg(48, { background: "#ffffff" })).toContain(
      '<rect x="-24" y="-24" width="48" height="48" fill="#ffffff"/>'
    )
  })

  it("shrinks the mark to leave the margin around it", () => {
    const reach = (svg: string) =>
      Math.max(
        ...[...svg.matchAll(/[xy][12]="(-?[\d.]+)"/g)].map(([, value]) =>
          Math.abs(Number(value))
        )
      )

    expect(reach(getMarkSvg(100, { margin: 0.2 }))).toBeLessThan(
      reach(getMarkSvg(100))
    )
  })
})

describe("renderIcon", () => {
  it("renders a PNG of the size asked for", () => {
    expect(pngSize(renderIcon(192))).toEqual({ height: 192, width: 192 })
  })
})
