import type { APIContext } from "astro"

import { getEntry } from "astro:content"

import {
  getPostAlternates,
  getPostKey,
  getPostLocale,
  getPosts,
} from "@/libs/blog"
import {
  type Alternates,
  DEFAULT_LOCALE,
  getAlternates,
  getPageSlug,
  type Locale,
  LOCALES,
  PAGES,
} from "@/libs/i18n"

/** The pages whose copy records when it last changed. */
const DATED = ["ai-content", "cookies", "imprint", "privacy", "security"]

/** One page, as every locale that has it serves it. */
interface Group {
  alternates: Alternates
  /** When each locale's copy last changed, where that is known. */
  modified: Partial<Record<Locale, Date>>
}

/**
 * Collects every page worth indexing, one group per page.
 *
 * We decided to build this from the site's own alternates rather than with
 * `@astrojs/sitemap` because its i18n option pairs translations by the path
 * left once the locale prefix is stripped, and each locale words its paths
 * differently here (`/contacto/`, `/en/contact/`).
 */
async function getGroups(): Promise<Group[]> {
  const groups: Group[] = [{ alternates: getAlternates("/"), modified: {} }]

  for (const page of PAGES) {
    const modified: Group["modified"] = {}

    if (DATED.includes(page)) {
      for (const locale of LOCALES) {
        const entry = await getEntry(
          page as "ai-content" | "cookies" | "imprint" | "privacy" | "security",
          locale
        )
        if (entry) modified[locale] = entry.data.updated
      }
    }

    groups.push({
      alternates: getAlternates(`/${getPageSlug(page, "en")}/`),
      modified,
    })
  }

  const posts = (
    await Promise.all(LOCALES.map((locale) => getPosts(locale)))
  ).flat()

  for (const key of new Set(posts.map(getPostKey))) {
    const translations = posts.filter((post) => getPostKey(post) === key)
    const modified: Group["modified"] = {}

    for (const post of translations) {
      const locale = getPostLocale(post)
      if (locale) modified[locale] = post.data.updated ?? post.data.published
    }

    groups.push({
      alternates: getPostAlternates(translations[0], posts),
      modified,
    })
  }

  return groups
}

/**
 * Lists every page in every locale it is served in, each with links to its
 * translations, so a crawler learns the whole site and how its languages
 * pair up without having to find each page through a link.
 */
export async function GET(context: APIContext) {
  const absolute = (href: string) => new URL(href, context.site).href
  const urls: string[] = []

  for (const { alternates, modified } of await getGroups()) {
    const links = LOCALES.flatMap((locale) => {
      const href = alternates[locale]
      return href
        ? [
            `<xhtml:link rel="alternate" hreflang="${locale}" href="${absolute(href)}"/>`,
          ]
        : []
    })
    const fallback = alternates[DEFAULT_LOCALE]

    if (fallback) {
      links.push(
        `<xhtml:link rel="alternate" hreflang="x-default" href="${absolute(fallback)}"/>`
      )
    }

    for (const locale of LOCALES) {
      const href = alternates[locale]
      if (!href) continue

      const lastmod = modified[locale]

      urls.push(
        [
          "  <url>",
          `    <loc>${absolute(href)}</loc>`,
          ...(lastmod
            ? [`    <lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>`]
            : []),
          ...links.map((link) => `    ${link}`),
          "  </url>",
        ].join("\n")
      )
    }
  }

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
