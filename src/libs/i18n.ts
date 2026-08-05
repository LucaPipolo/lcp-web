/** The locale served at the site root */
export const DEFAULT_LOCALE = "es"

/** Every locale the site is built in */
export const LOCALES = [DEFAULT_LOCALE, "en", "it"] as const

/** Any one of {@link LOCALES}. */
export type Locale = (typeof LOCALES)[number]

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
