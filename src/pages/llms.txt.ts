import type { APIContext } from "astro"

import { getSettings } from "@/libs/content"
import { LOCALES } from "@/libs/i18n"
import { getPageSummaries } from "@/libs/pages"

const SUMMARY_LOCALE = "en"

/**
 * Names a language in its own words, as a reader of it would: `Italiano`.
 *
 * @param locale - The language to name.
 *
 * @returns Its name, capitalised for a heading.
 */
function getLanguageName(locale: string): string {
  const name = new Intl.DisplayNames([locale], { type: "language" }).of(locale)

  return name ? name[0].toLocaleUpperCase(locale) + name.slice(1) : locale
}

/**
 * Lists every page for language models, following the llms.txt proposal: who
 * the site is about, then every page in every language with one line on what
 * it covers.
 *
 * @see https://llmstxt.org
 */
export async function GET(context: APIContext) {
  const { author } = await getSettings(SUMMARY_LOCALE)
  const summaries = await getPageSummaries()
  const absolute = (href: string) => new URL(href, context.site).href

  const summary = summaries.find(
    (page) =>
      page.locale === SUMMARY_LOCALE && page.href === `/${SUMMARY_LOCALE}/`
  )

  const sections = LOCALES.map((locale) => {
    const links = summaries
      .filter((page) => page.locale === locale)
      .map(
        ({ description, href, title }) =>
          `- [${title}](${absolute(href)})${description ? `: ${description}` : ""}`
      )

    return [`## ${getLanguageName(locale)}`, "", ...links].join("\n")
  })

  const text = [
    `# ${author.name}`,
    "",
    ...(summary?.description ? [`> ${summary.description}`, ""] : []),
    sections.join("\n\n"),
    "",
  ].join("\n")

  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
