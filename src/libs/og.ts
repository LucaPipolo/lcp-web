import { Resvg } from "@resvg/resvg-js"
import { readFile } from "node:fs/promises"
import satori from "satori"

import { BRAND_COLORS, getMarkSvg } from "@/libs/brand"
import { formatDate, type Locale } from "@/libs/i18n"
import { getPageSummaries } from "@/libs/pages"

export const OG_IMAGE_SIZE = { width: 1200, height: 630 }

export interface OgCard {
  eyebrow?: string
  href: string
  locale: Locale
  title: string
}

/**
 * Points at the image a page is previewed with.
 *
 * @param href - The page's path, as its locale serves it, such as
 *   `/it/contatti/`.
 *
 * @returns The image's path, such as `/og/it/contatti.png`.
 */
export function getOgImageHref(href: string): string {
  const path = href.replace(/^\/|\/$/g, "")

  return `/og/${path || "index"}.png`
}

/**
 * Collects a card for every page worth sharing, in every locale it is
 * served in.
 *
 * @returns The cards, titled with what each page heads itself with.
 */
export async function getOgCards(): Promise<OgCard[]> {
  return (await getPageSummaries()).map(
    ({ href, locale, published, section, title }) => ({
      eyebrow: published
        ? [section, formatDate(published, locale)].filter(Boolean).join(" · ")
        : undefined,
      href,
      locale,
      title,
    })
  )
}

/** Inter, the site's own face. Satori draws the bold from the variable file. */
let font: Buffer | undefined

/**
 * Renders a link preview.
 *
 * @param card - What the preview says.
 * @param signature - The author's name, along the bottom edge.
 *
 * @returns The preview as a PNG.
 */
export async function renderOgCard(
  card: OgCard,
  signature: string
): Promise<Buffer> {
  font ??= await readFile(
    "node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"
  )

  // A long post title still has to fit in three lines.
  const fontSize = card.title.length > 70 ? 56 : 72

  const text = (children: string, style: Record<string, unknown>) => ({
    type: "div",
    props: { children, style: { display: "flex", ...style } },
  })

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          // Satori sizes boxes by their content, so the padding would
          // otherwise push the card past 1200 by 630.
          boxSizing: "border-box",
          width: "100%",
          height: "100%",
          padding: 72,
          background: BRAND_COLORS.background,
          color: BRAND_COLORS.foreground,
          fontFamily: "Inter",
          borderTop: `12px solid ${BRAND_COLORS.primary}`,
        },
        children: [
          {
            type: "div",
            props: {
              style: { display: "flex", alignItems: "center", gap: 20 },
              children: [
                {
                  type: "img",
                  props: {
                    src: `data:image/svg+xml;base64,${Buffer.from(getMarkSvg(48)).toString("base64")}`,
                    width: 48,
                    height: 48,
                  },
                },
                text("lucapipolo.com", { fontSize: 32, fontWeight: 700 }),
              ],
            },
          },
          {
            type: "div",
            props: {
              style: { display: "flex", flexDirection: "column", gap: 20 },
              children: [
                ...(card.eyebrow
                  ? [
                      text(card.eyebrow, {
                        fontSize: 28,
                        color: BRAND_COLORS.muted,
                      }),
                    ]
                  : []),
                text(card.title, {
                  fontSize,
                  fontWeight: 700,
                  lineHeight: 1.15,
                  letterSpacing: -1.5,
                }),
              ],
            },
          },
          text(signature, { fontSize: 28, color: BRAND_COLORS.muted }),
        ],
      },
    },
    {
      ...OG_IMAGE_SIZE,
      fonts: [
        { name: "Inter", data: font, weight: 400, style: "normal" },
        { name: "Inter", data: font, weight: 700, style: "normal" },
      ],
    }
  )

  return new Resvg(svg).render().asPng()
}
