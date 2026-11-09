import { Resvg } from "@resvg/resvg-js"

import { asterisk } from "@/libs/asterisk"

/**
 * The palette's light theme, in sRGB, for images drawn at build time: their
 * renderer reads no `oklch()`. Converted from `src/styles/_colors.css`.
 */
export const BRAND_COLORS = {
  background: "#ffffff",
  darkBackground: "#0a0a0a",
  foreground: "#0a0a0a",
  muted: "#737373",
  primary: "#e11d48",
}

/**
 * Draws the site's mark, as the favicon and the hero draw it.
 *
 * @param size - The drawing's width and height, in pixels.
 * @param options.background - A colour to fill the square behind the mark
 *   with. Left out, the square stays transparent.
 * @param options.margin - How much room to leave around the mark, as a
 *   fraction of the size.
 *
 * @returns The mark as an SVG document.
 */
export function getMarkSvg(
  size: number,
  { background, margin = 0 }: { background?: string; margin?: number } = {}
): string {
  const half = size / 2
  const { bars, strokeWidth } = asterisk(half - size * margin)
  const lines = bars
    .map(
      ([x1, y1, x2, y2]) =>
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${BRAND_COLORS.primary}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`
    )
    .join("")
  const fill = background
    ? `<rect x="${-half}" y="${-half}" width="${size}" height="${size}" fill="${background}"/>`
    : ""

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-half} ${-half} ${size} ${size}">${fill}${lines}</svg>`
}

/**
 * Draws the mark as an app icon: on the page's background, with room around
 * it for the rounded corners and circles that home screens crop icons to.
 *
 * @param size - The icon's width and height, in pixels.
 *
 * @returns The icon as a PNG.
 */
export function renderIcon(size: number): Buffer {
  // A maskable icon keeps what matters inside the middle 80%.
  const svg = getMarkSvg(size, {
    background: BRAND_COLORS.background,
    margin: 0.22,
  })

  return new Resvg(svg).render().asPng()
}
