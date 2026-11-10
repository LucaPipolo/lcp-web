import type { APIContext } from "astro"

import { getPostHref, getPosts, type PostIndexEntry } from "@/libs/blog"
import { DEFAULT_LOCALE, isLocale, LOCALES } from "@/libs/i18n"

/**
 * One list per language, fetched by the command palette the first time it
 * opens, rather than written into every page whether the palette is opened
 * or not.
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

  const posts = await getPosts(locale)

  const entries: PostIndexEntry[] = posts.map((post) => ({
    href: getPostHref(post, locale),
    tags: post.data.tags,
    title: post.data.title,
  }))

  return Response.json(entries)
}
