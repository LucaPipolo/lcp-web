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
 * The path segment each page is served under, per locale.
 *
 * Keyed by the English segment, which is also how content names a page
 * (`/contact/`), so that a link is written once and every locale reads it in
 * its own words. Kept in code rather than content because
 * {@link localizeHref} runs synchronously in every component that renders a
 * link.
 */
const PAGE_SLUGS = {
  "ai-content": { es: "contenido-ia", en: "ai-content", it: "contenuti-ia" },
  blog: { es: "blog", en: "blog", it: "blog" },
  contact: { es: "contacto", en: "contact", it: "contatti" },
  cookies: { es: "cookies", en: "cookies", it: "cookie" },
  imprint: { es: "aviso-legal", en: "imprint", it: "note-legali" },
  privacy: { es: "privacidad", en: "privacy", it: "privacy" },
  recommendations: {
    es: "recomendaciones",
    en: "recommendations",
    it: "raccomandazioni",
  },
  security: { es: "seguridad", en: "security", it: "sicurezza" },
} as const satisfies Record<string, Record<Locale, string>>

/** A page served under its own segment, named by its English one. */
export type Page = keyof typeof PAGE_SLUGS

export const PAGES = Object.keys(PAGE_SLUGS) as Page[]

/**
 * The id each linkable home page section carries, per locale, keyed by the
 * English one the same way {@link PAGE_SLUGS} is.
 */
const ANCHORS = {
  blog: { es: "blog", en: "blog", it: "blog" },
  experience: { es: "experiencia", en: "experience", it: "esperienza" },
  recommendations: {
    es: "recomendaciones",
    en: "recommendations",
    it: "raccomandazioni",
  },
  stack: { es: "stack", en: "stack", it: "stack" },
} as const satisfies Record<string, Record<Locale, string>>

/** A home page section a link can jump to, named by its English id. */
export type Anchor = keyof typeof ANCHORS

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

function isPage(value: string): value is Page {
  return Object.hasOwn(PAGE_SLUGS, value)
}

function isAnchor(value: string): value is Anchor {
  return Object.hasOwn(ANCHORS, value)
}

/**
 * Reads the segment a page is served under in one locale.
 *
 * @param page - The page, by its English segment.
 * @param locale - The locale to read it in.
 *
 * @returns The segment, without slashes.
 */
export function getPageSlug(page: Page, locale: Locale): string {
  return PAGE_SLUGS[page][locale]
}

/**
 * Reads the id a home page section carries in one locale.
 *
 * @param anchor - The section, by its English id.
 * @param locale - The reader's locale. Anything unsupported, `undefined`
 *   included, falls back to {@link DEFAULT_LOCALE}.
 *
 * @returns The id, without the `#`.
 */
export function getAnchor(anchor: Anchor, locale?: string): string {
  return ANCHORS[anchor][isLocale(locale) ? locale : DEFAULT_LOCALE]
}

/**
 * Translates a home page section's id, whichever locale it was read in.
 *
 * @param id - The id, without the `#`, such as `esperienza`.
 * @param locale - The locale to translate it into.
 *
 * @returns The id that locale gives the same section, or `undefined` for an
 *   id that names none, such as a post's heading.
 */
export function translateAnchor(
  id: string,
  locale: Locale
): string | undefined {
  const anchor = (Object.keys(ANCHORS) as Anchor[]).find((key) =>
    Object.values<string>(ANCHORS[key]).includes(id)
  )

  return anchor && ANCHORS[anchor][locale]
}

/**
 * Puts a path behind the reader's locale and into its words, so that content
 * can name a page once and have every locale link to its own copy of it.
 *
 * Only in-site pages are rewritten. An absolute URL, a `mailto:`, and a file
 * such as a PDF are all served from one place whatever the reader's language,
 * so a prefix on those would point at something that is not there.
 *
 * @param href - The path as content writes it, rooted at the site and in
 *   English, such as `/contact/` or `/#experience`. A first segment or a hash
 *   the site has no translation for is kept as written.
 * @param locale - The reader's locale. Anything unsupported, `undefined`
 *   included, falls back to {@link DEFAULT_LOCALE}.
 *
 * @returns The path as that locale serves it, such as `/it/contatti/`.
 *   {@link DEFAULT_LOCALE} is served at the root, so its paths get no prefix.
 */
export function localizeHref(href: string, locale?: string): string {
  if (!href.startsWith("/") || /\.[a-z0-9]+$/i.test(href)) return href

  const resolved = isLocale(locale) ? locale : DEFAULT_LOCALE

  const [rest, hash] = href.split("#", 2)
  const [path, query] = rest.split("?", 2)
  const [, first, ...others] = path.split("/")

  const segment = isPage(first) ? getPageSlug(first, resolved) : first
  const translated = ["", segment, ...others].join("/")

  const localized =
    resolved === DEFAULT_LOCALE ? translated : `/${resolved}${translated}`

  return [
    localized,
    query === undefined ? "" : `?${query}`,
    hash === undefined
      ? ""
      : `#${isAnchor(hash) ? getAnchor(hash, resolved) : hash}`,
  ].join("")
}

/** Where one page is served in each locale that has it. */
export type Alternates = Partial<Record<Locale, string>>

/**
 * Lists where a page is served in every locale, for a page every locale has.
 *
 * @param href - The page as content writes it, such as `/contact/`.
 *
 * @returns Its path in each locale, as {@link localizeHref} builds it.
 */
export function getAlternates(href: string): Alternates {
  return Object.fromEntries(
    LOCALES.map((locale) => [locale, localizeHref(href, locale)])
  )
}

/**
 * Names a locale with its region, as Open Graph's `og:locale` expects.
 *
 * @param locale - The locale to name.
 *
 * @returns The language and region joined by an underscore, as `es_ES`.
 */
export function getOpenGraphLocale(locale: Locale): string {
  return FORMATTING_LOCALES[locale].replace("-", "_")
}

/**
 * Formats a date in the reader's language.
 *
 * @param date - The date to format.
 * @param locale - The reader's locale. Anything unsupported, `undefined`
 *   included, falls back to {@link DEFAULT_LOCALE}.
 *
 * @returns The date as day, month and four-digit year, as `05/08/2026`.
 */
export function formatDate(date: Date, locale?: string): string {
  const resolved = isLocale(locale) ? locale : DEFAULT_LOCALE

  return new Intl.DateTimeFormat(FORMATTING_LOCALES[resolved], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}
