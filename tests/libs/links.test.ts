import { describe, expect, it } from "vitest"

import { isExternalHref } from "@/libs/links"

const SITE = "https://www.lucapipolo.com"

describe("isExternalHref", () => {
  it("treats a link to another host as external", () => {
    expect(isExternalHref("https://github.com/LucaPipolo", SITE)).toBe(true)
    expect(isExternalHref("http://example.com", SITE)).toBe(true)
  })

  it("treats a link to the site itself as internal, with or without www", () => {
    expect(isExternalHref("https://www.lucapipolo.com/blog/", SITE)).toBe(false)
    expect(isExternalHref("https://lucapipolo.com/blog/", SITE)).toBe(false)
  })

  it("treats a relative link as internal", () => {
    expect(isExternalHref("/contact/", SITE)).toBe(false)
    expect(isExternalHref("#experience", SITE)).toBe(false)
  })

  it("treats a link that is not over the web as internal", () => {
    expect(isExternalHref("mailto:hello@example.com", SITE)).toBe(false)
  })

  it("matches the scheme regardless of case", () => {
    expect(isExternalHref("HTTPS://github.com", SITE)).toBe(true)
  })
})
