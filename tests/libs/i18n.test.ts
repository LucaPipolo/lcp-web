import { describe, expect, it } from "vitest"

import {
  DEFAULT_LOCALE,
  formatDate,
  getAlternates,
  getAnchor,
  getOpenGraphLocale,
  getPageSlug,
  isLocale,
  localizeHref,
  translateAnchor,
} from "@/libs/i18n"

describe("isLocale", () => {
  it("accepts every supported locale", () => {
    expect(isLocale("es")).toBe(true)
    expect(isLocale("en")).toBe(true)
    expect(isLocale("it")).toBe(true)
  })

  it("rejects anything else", () => {
    expect(isLocale("fr")).toBe(false)
    expect(isLocale(undefined)).toBe(false)
    expect(isLocale(42)).toBe(false)
  })
})

describe("getPageSlug", () => {
  it("reads the segment a page is served under in each locale", () => {
    expect(getPageSlug("contact", "es")).toBe("contacto")
    expect(getPageSlug("contact", "en")).toBe("contact")
    expect(getPageSlug("contact", "it")).toBe("contatti")
  })
})

describe("getAnchor", () => {
  it("reads a section's id in the given locale", () => {
    expect(getAnchor("experience", "it")).toBe("esperienza")
  })

  it("falls back to the default locale", () => {
    expect(getAnchor("experience")).toBe("experiencia")
    expect(getAnchor("experience", "fr")).toBe("experiencia")
  })
})

describe("translateAnchor", () => {
  it("translates an id read in any locale", () => {
    expect(translateAnchor("esperienza", "en")).toBe("experience")
    expect(translateAnchor("experiencia", "it")).toBe("esperienza")
  })

  it("returns undefined for an id that names no section", () => {
    expect(translateAnchor("a-post-heading", "en")).toBeUndefined()
  })
})

describe("localizeHref", () => {
  it("serves the default locale at the root, with no prefix", () => {
    expect(DEFAULT_LOCALE).toBe("es")
    expect(localizeHref("/contact/", "es")).toBe("/contacto/")
  })

  it("prefixes the other locales and translates the page", () => {
    expect(localizeHref("/contact/", "en")).toBe("/en/contact/")
    expect(localizeHref("/contact/", "it")).toBe("/it/contatti/")
  })

  it("localizes the home page", () => {
    expect(localizeHref("/", "es")).toBe("/")
    expect(localizeHref("/", "it")).toBe("/it/")
  })

  it("keeps a segment it has no translation for", () => {
    expect(localizeHref("/blog/my-post/", "it")).toBe("/it/blog/my-post/")
    expect(localizeHref("/unknown/", "en")).toBe("/en/unknown/")
  })

  it("translates a home page section's anchor", () => {
    expect(localizeHref("/#experience", "es")).toBe("/#experiencia")
    expect(localizeHref("/#experience", "it")).toBe("/it/#esperienza")
  })

  it("keeps an anchor that names no section", () => {
    expect(localizeHref("/blog/post/#intro", "en")).toBe("/en/blog/post/#intro")
  })

  it("keeps the query string", () => {
    expect(localizeHref("/contact/?reason=job", "it")).toBe(
      "/it/contatti/?reason=job"
    )
    expect(localizeHref("/contact/?reason=job#form", "en")).toBe(
      "/en/contact/?reason=job#form"
    )
  })

  it("leaves what is served in one place for every language alone", () => {
    expect(localizeHref("https://github.com", "it")).toBe("https://github.com")
    expect(localizeHref("mailto:hello@example.com", "it")).toBe(
      "mailto:hello@example.com"
    )
    expect(localizeHref("/cv/luca-pipolo.pdf", "it")).toBe(
      "/cv/luca-pipolo.pdf"
    )
  })

  it("falls back to the default locale", () => {
    expect(localizeHref("/contact/")).toBe("/contacto/")
    expect(localizeHref("/contact/", "fr")).toBe("/contacto/")
  })
})

describe("getAlternates", () => {
  it("lists a page's path in every locale", () => {
    expect(getAlternates("/contact/")).toEqual({
      en: "/en/contact/",
      es: "/contacto/",
      it: "/it/contatti/",
    })
  })
})

describe("getOpenGraphLocale", () => {
  it("names each locale with its region", () => {
    expect(getOpenGraphLocale("es")).toBe("es_ES")
    expect(getOpenGraphLocale("en")).toBe("en_GB")
    expect(getOpenGraphLocale("it")).toBe("it_IT")
  })
})

describe("formatDate", () => {
  const date = new Date(2026, 7, 5)

  it("formats a date as day, month and year", () => {
    expect(formatDate(date, "es")).toBe("05/08/2026")
    expect(formatDate(date, "en")).toBe("05/08/2026")
    expect(formatDate(date, "it")).toBe("05/08/2026")
  })

  it("falls back to the default locale", () => {
    expect(formatDate(date)).toBe(formatDate(date, DEFAULT_LOCALE))
    expect(formatDate(date, "fr")).toBe(formatDate(date, DEFAULT_LOCALE))
  })
})
