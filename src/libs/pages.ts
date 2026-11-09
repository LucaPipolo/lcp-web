import { getEntry } from "astro:content"

import { getPostHref, getPosts } from "@/libs/blog"
import { getSettings } from "@/libs/content"
import {
  getAlternates,
  getPageSlug,
  type Locale,
  LOCALES,
  PAGES,
} from "@/libs/i18n"

export interface PageSummary {
  description?: string
  href: string
  locale: Locale
  published?: Date
  section?: string
  title: string
}

/**
 * Collects every page worth indexing, in every locale it is served in, with
 * what it calls itself and how it describes itself.
 *
 * @returns The home page, then every page, then every post, locale by locale.
 */
export async function getPageSummaries(): Promise<PageSummary[]> {
  const summaries: PageSummary[] = []

  for (const locale of LOCALES) {
    const home = await getEntry("home", locale)
    const { author } = await getSettings(locale)

    summaries.push({
      description: home?.data.metadata.description,
      href: getAlternates("/")[locale]!,
      locale,
      title: home?.data.sections.hero.subheading ?? author.name,
    })

    for (const page of PAGES) {
      const collection = page === "blog" ? "blog-index" : page
      const entry = await getEntry(collection, locale)

      if (!entry) continue

      const { data } = entry

      summaries.push({
        description:
          ("description" in data.metadata
            ? data.metadata.description
            : undefined) ?? ("intro" in data ? data.intro : undefined),
        href: getAlternates(`/${getPageSlug(page, "en")}/`)[locale]!,
        locale,
        title: data.title,
      })
    }

    const blog = await getEntry("blog-index", locale)

    for (const post of await getPosts(locale)) {
      summaries.push({
        description: post.data.metaDescription ?? post.data.description,
        href: getPostHref(post, locale),
        locale,
        published: post.data.published,
        section: blog?.data.title,
        title: post.data.title,
      })
    }
  }

  return summaries
}
