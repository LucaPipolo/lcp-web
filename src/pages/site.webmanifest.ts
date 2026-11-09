import { getEntry } from "astro:content"

import { BRAND_COLORS } from "@/libs/brand"
import { getSettings } from "@/libs/content"
import { DEFAULT_LOCALE } from "@/libs/i18n"

/**
 * Describes the site to a device that saves it to a home screen.
 *
 * It is a website rather than an app, so it opens in the browser like any
 * bookmark: the manifest only lends it a name, an icon and its colours.
 */
export async function GET() {
  const { author } = await getSettings(DEFAULT_LOCALE)
  const home = await getEntry("home", DEFAULT_LOCALE)

  const manifest = {
    name: author.name,
    short_name: author.name,
    description: home?.data.metadata.description,
    lang: DEFAULT_LOCALE,
    start_url: "/",
    display: "browser",
    background_color: BRAND_COLORS.background,
    theme_color: BRAND_COLORS.background,
    icons: [192, 512].map((size) => ({
      src: `/icon-${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any maskable",
    })),
  }

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { "Content-Type": "application/manifest+json" },
  })
}
