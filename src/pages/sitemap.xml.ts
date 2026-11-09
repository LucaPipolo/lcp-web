import type { APIContext } from "astro"

import { DEFAULT_LOCALE, LOCALES } from "@/libs/i18n"
import { getPageSummaries } from "@/libs/pages"

/**
 * Lists every page in every locale it is served in, each with links to its
 * translations, so a crawler learns the whole site and how its languages
 * pair up without having to find each page through a link.
 *
 * We decided to build this from the site's own page list rather than with
 * `@astrojs/sitemap` because its i18n option pairs translations by the path
 * left once the locale prefix is stripped, and each locale words its paths
 * differently here (`/contacto/`, `/en/contact/`).
 */
export async function GET(context: APIContext) {
  const absolute = (href: string) => new URL(href, context.site).href

  const urls = (await getPageSummaries()).map(
    ({ alternates, href, modified }) => {
      const links = LOCALES.flatMap((locale) => {
        const translation = alternates[locale]
        return translation
          ? [
              `<xhtml:link rel="alternate" hreflang="${locale}" href="${absolute(translation)}"/>`,
            ]
          : []
      })
      const fallback = alternates[DEFAULT_LOCALE]

      if (fallback) {
        links.push(
          `<xhtml:link rel="alternate" hreflang="x-default" href="${absolute(fallback)}"/>`
        )
      }

      return [
        "  <url>",
        `    <loc>${absolute(href)}</loc>`,
        ...(modified
          ? [`    <lastmod>${modified.toISOString().slice(0, 10)}</lastmod>`]
          : []),
        ...links.map((link) => `    ${link}`),
        "  </url>",
      ].join("\n")
    }
  )

  // Crawlers skip the stylesheet. It is CSS rather than XSL, which browsers
  // are dropping support for, and lets a person read the sitemap too.
  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<?xml-stylesheet type="text/css" href="/sitemap.css"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...urls,
    "</urlset>",
    "",
  ].join("\n")

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  })
}
