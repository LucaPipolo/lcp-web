import type { APIContext } from "astro"

import { getSettings } from "@/libs/content"
import {
  getOgCards,
  getOgImageHref,
  type OgCard,
  renderOgCard,
} from "@/libs/og"

/**
 * One link preview per page and locale, at the path `getOgImageHref()` points
 * the page's `og:image` at.
 */
export async function getStaticPaths() {
  return (await getOgCards()).map((card) => ({
    params: {
      path: getOgImageHref(card.href).slice("/og/".length, -".png".length),
    },
    props: { card },
  }))
}

export async function GET({ props }: APIContext<{ card: OgCard }>) {
  const { author } = await getSettings(props.card.locale)
  const png = await renderOgCard(props.card, author.name)

  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  })
}
