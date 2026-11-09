import type { APIContext } from "astro"

import rss from "@astrojs/rss"
import { getEntry } from "astro:content"

import { getPostHref, getPostKey, getPosts } from "@/libs/blog"
import { DEFAULT_LOCALE, isLocale, LOCALES } from "@/libs/i18n"

/**
 * One feed per language, sitting beside that language's listing.
 *
 * A reader subscribes in the language they read the site in, and gets the
 * posts written in it. A single feed carrying all three would arrive as two
 * thirds noise for everyone.
 */
export function getStaticPaths() {
  return LOCALES.map((locale) => ({
    params: { locale: locale === DEFAULT_LOCALE ? undefined : locale },
    props: { locale },
  }))
}

export async function GET(context: APIContext) {
  const locale = isLocale(context.props.locale)
    ? context.props.locale
    : DEFAULT_LOCALE

  const page = await getEntry("blog-index", locale)

  if (!page) {
    throw new Error(
      `No blog page entry for the locale \`${locale}\`. Add src/content/pages/blog/${locale}.yaml.`
    )
  }

  const posts = await getPosts(locale)

  return rss({
    title: page.data.metadata.title,
    description: page.data.intro,
    site: context.site!,
    trailingSlash: true,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.published,
      link: getPostHref(post, locale),
      // A reader keys a post on its guid, and a URL-based one makes a renamed
      // slug arrive as a new post. Its folder and language never change.
      customData: `<guid isPermaLink="false">tag:lucapipolo.com,2026:blog/${getPostKey(post)}/${locale}</guid>`,
      categories: post.data.tags,
    })),
    customData: `<language>${locale}</language>`,
  })
}
