/** The locale served at the site root */
export const DEFAULT_LOCALE = "es"

/** Every locale the site is built in */
export const LOCALES = [DEFAULT_LOCALE, "en", "it"] as const

/** Any one of {@link LOCALES}. */
export type Locale = (typeof LOCALES)[number]

/** The cookie the language switcher writes and the edge reads back. */
export const LOCALE_COOKIE = "locale"

/** How long a picked language outlives the visit that picked it, in seconds. */
export const LOCALE_MAX_AGE = 60 * 60 * 24 * 365

/**
 * The regional tag each locale formats dates with.
 */
const FORMATTING_LOCALES: Record<Locale, string> = {
  es: "es-ES",
  en: "en-GB",
  it: "it-IT",
}

/**
 * Narrows an unknown value to a supported locale.
 *
 * @param value - The value to test, usually `Astro.currentLocale`, which is
 *   typed `string | undefined`.
 *
 * @returns `true` when the value is one of {@link LOCALES}.
 */
export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  )
}

/**
 * Puts a path behind the reader's locale, so that content can name a page once
 * and have every locale link to its own copy of it.
 *
 * Only in-site pages are rewritten. An absolute URL, a `mailto:`, and a file
 * such as a PDF are all served from one place whatever the reader's language,
 * so a prefix on those would point at something that is not there.
 *
 * @param href - The path as content writes it, rooted at the site, such as
 *   `/#experience`.
 * @param locale - The reader's locale. Anything unsupported, `undefined`
 *   included, falls back to {@link DEFAULT_LOCALE}.
 *
 * @returns The path as that locale serves it. {@link DEFAULT_LOCALE} is served
 *   at the root, so its paths come back untouched.
 */
export function localizeHref(href: string, locale?: string): string {
  if (!href.startsWith("/") || /\.[a-z0-9]+$/i.test(href)) return href

  const resolved = isLocale(locale) ? locale : DEFAULT_LOCALE

  return resolved === DEFAULT_LOCALE ? href : `/${resolved}${href}`
}

/**
 * Formats a date in the reader's language.
 *
 * @param date - The date to format.
 * @param locale - The reader's locale. Anything unsupported, `undefined`
 *   included, falls back to {@link DEFAULT_LOCALE}.
 *
 * @returns The date written out in full, as `5 August 2026`.
 */
export function formatDate(date: Date, locale?: string): string {
  const resolved = isLocale(locale) ? locale : DEFAULT_LOCALE

  return new Intl.DateTimeFormat(FORMATTING_LOCALES[resolved], {
    dateStyle: "long",
  }).format(date)
}
