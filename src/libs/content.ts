import type { CollectionKey } from "astro:content"

import { getCollection, getEntry } from "astro:content"

import { DEFAULT_LOCALE, isLocale, LOCALES } from "@/libs/i18n"

/**
 * Builds the static paths for a page from a collection holding one entry per
 * locale.
 *
 * The default locale gets `undefined` as its route param, which is what keeps
 * it served without a prefix, and an entry whose id is not a locale produces
 * no route at all.
 *
 * @param collection - The collection to build the routes from, holding one
 *   YAML file per locale and named after it.
 *
 * @returns One path per locale, each carrying its entry as a prop.
 *
 * @throws When a locale has no entry, because the alternative is that locale
 *   quietly disappearing from the built site.
 */
export async function getLocalizedStaticPaths<C extends CollectionKey>(
  collection: C
) {
  const entries = (await getCollection(collection)).filter((entry) =>
    isLocale(entry.id)
  )

  for (const locale of LOCALES) {
    if (!entries.some((entry) => entry.id === locale)) {
      throw new Error(
        `The \`${collection}\` collection has no entry for the locale \`${locale}\`. Add its \`${locale}.yaml\` file.`
      )
    }
  }

  return entries.map((entry) => ({
    params: { locale: entry.id === DEFAULT_LOCALE ? undefined : entry.id },
    props: { entry },
  }))
}

/**
 * Reads the values shared across the site, so that a nested component can get
 * one without having it threaded down through props.
 *
 * @param locale - The reader's locale, usually `Astro.currentLocale`. Anything
 *   unsupported, `undefined` included, falls back to {@link DEFAULT_LOCALE}.
 *
 * @returns The settings entry for that locale.
 *
 * @throws When a supported locale has no file, because a shared value that
 *   silently renders empty is harder to notice than a build that fails.
 */
export async function getSettings(locale?: string) {
  const resolved = isLocale(locale) ? locale : DEFAULT_LOCALE
  const entry = await getEntry("settings", resolved)

  if (!entry) {
    throw new Error(
      `No settings entry for the locale \`${resolved}\`. Add src/content/settings/${resolved}.yaml.`
    )
  }

  return entry.data
}
