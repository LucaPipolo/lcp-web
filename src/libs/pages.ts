import { getEntry } from "astro:content"

import {
  getPostAlternates,
  getPostHref,
  getPostLocale,
  getPosts,
} from "@/libs/blog"
import { getSettings } from "@/libs/content"
import {
  type Alternates,
  getAlternates,
  getPageSlug,
  type Locale,
  LOCALES,
  PAGES,
} from "@/libs/i18n"

export interface PageSummary {
  alternates: Alternates
  description?: string
  href: string
  locale: Locale
  modified?: Date
  published?: Date
  section?: string
  title: string
}

/**
 * Collects every page worth indexing, in every locale it is served in, with
 * what it calls itself, how it describes itself and where its translations
 * are.
 *
 * Everything the site publishes about its own pages, the sitemap, `llms.txt`
 * and the link previews, reads from here, so registering a page in the route
 * table in `i18n.ts` is all it takes to have it listed in all of them.
 *
 * @returns The home page, then every page, then every post, locale by locale.
 *
 * @throws When a page in the route table has no copy for a locale, because a
 *   page left out of the sitemap is one nobody notices is missing.
 */
export async function getPageSummaries(): Promise<PageSummary[]> {
  const summaries: PageSummary[] = []
  const posts = (
    await Promise.all(LOCALES.map((locale) => getPosts(locale)))
  ).flat()

  for (const locale of LOCALES) {
    const home = await getEntry("home", locale)
    const { author } = await getSettings(locale)
    const homeAlternates = getAlternates("/")

    summaries.push({
      alternates: homeAlternates,
      description: home?.data.metadata.description,
      href: homeAlternates[locale]!,
      locale,
      title: home?.data.sections.hero.subheading ?? author.name,
    })

    for (const page of PAGES) {
      const collection = page === "blog" ? "blog-index" : page
      const entry = await getEntry(collection, locale)

      if (!entry) {
        throw new Error(
          `The page \`${page}\` has no copy for the locale \`${locale}\`. Add src/content/pages/${collection}/${locale}.yaml, or name the page after its collection in getPageSummaries().`
        )
      }

      const { data } = entry
      const alternates = getAlternates(`/${getPageSlug(page, "en")}/`)

      summaries.push({
        alternates,
        description:
          ("description" in data.metadata
            ? data.metadata.description
            : undefined) ?? ("intro" in data ? data.intro : undefined),
        href: alternates[locale]!,
        locale,
        modified: "updated" in data ? data.updated : undefined,
        title: data.title,
      })
    }

    const blog = await getEntry("blog-index", locale)

    for (const post of posts.filter((post) => getPostLocale(post) === locale)) {
      summaries.push({
        alternates: getPostAlternates(post, posts),
        description: post.data.metaDescription ?? post.data.description,
        href: getPostHref(post, locale),
        locale,
        modified: post.data.updated ?? post.data.published,
        published: post.data.published,
        section: blog?.data.title,
        title: post.data.title,
      })
    }
  }

  return summaries
}
