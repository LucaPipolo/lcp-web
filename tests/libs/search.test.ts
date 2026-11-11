import { describe, expect, it } from "vitest"

import { normalize } from "@/libs/search"

describe("normalize", () => {
  it("takes accents off, so either spelling finds the other", () => {
    expect(normalize("caché")).toBe(normalize("cache"))
    expect(normalize("España")).toBe("espana")
  })

  it("lower-cases the text", () => {
    expect(normalize("Astro")).toBe("astro")
  })

  it("trims the surrounding whitespace", () => {
    expect(normalize("  astro  ")).toBe("astro")
  })
})
