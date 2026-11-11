import { beforeEach, describe, expect, it, vi } from "vitest"

import { getLocalizedStaticPaths, getSettings } from "@/libs/content"

import { collections, resetContent } from "../support/astro-content"

vi.mock("astro:content", () => import("../support/astro-content"))

/**
 * Fills a collection with one entry per locale.
 *
 * @param name - The collection.
 * @param ids - The entries' ids, usually locales.
 */
function fill(name: string, ids: string[]): void {
  collections[name] = ids.map((id) => ({ data: { id }, id }))
}

describe("getLocalizedStaticPaths", () => {
  beforeEach(resetContent)

  it("builds one route per locale, the default one without a prefix", async () => {
    fill("home", ["es", "en", "it"])

    const paths = await getLocalizedStaticPaths("home")

    expect(paths.map(({ params }) => params)).toEqual([
      { locale: undefined },
      { locale: "en" },
      { locale: "it" },
    ])
    expect(paths[1].props.entry.id).toBe("en")
  })

  it("skips an entry whose id is not a locale", async () => {
    fill("home", ["es", "en", "it", "fr"])

    expect(await getLocalizedStaticPaths("home")).toHaveLength(3)
  })

  it("gives a page its segment in each locale", async () => {
    fill("contact", ["es", "en", "it"])

    const paths = await getLocalizedStaticPaths("contact", "contact")

    expect(paths.map(({ params }) => params)).toEqual([
      { contact: "contacto", locale: undefined },
      { contact: "contact", locale: "en" },
      { contact: "contatti", locale: "it" },
    ])
  })

  it("names the param after the page, with a hyphen as an underscore", async () => {
    fill("ai-content", ["es", "en", "it"])

    const [paths] = await getLocalizedStaticPaths("ai-content", "ai-content")

    expect(paths.params).toEqual({
      ai_content: "contenido-ia",
      locale: undefined,
    })
  })

  it("throws when a locale has no entry", async () => {
    fill("home", ["es", "en"])

    await expect(getLocalizedStaticPaths("home")).rejects.toThrow(
      "The `home` collection has no entry for the locale `it`. Add its `it.yaml` file."
    )
  })
})

describe("getSettings", () => {
  beforeEach(() => {
    resetContent()
    fill("settings", ["es", "en", "it"])
  })

  it("reads the settings of the given locale", async () => {
    expect(await getSettings("it")).toEqual({ id: "it" })
  })

  it("falls back to the default locale", async () => {
    expect(await getSettings()).toEqual({ id: "es" })
    expect(await getSettings("fr")).toEqual({ id: "es" })
  })

  it("throws when a locale has no settings", async () => {
    fill("settings", ["es"])

    await expect(getSettings("en")).rejects.toThrow(
      "No settings entry for the locale `en`. Add src/content/settings/en.yaml."
    )
  })
})
