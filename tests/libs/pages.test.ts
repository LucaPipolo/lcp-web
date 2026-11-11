import { beforeEach, describe, expect, it, vi } from "vitest"

import { LOCALES, PAGES } from "@/libs/i18n"
import { getPageSummaries } from "@/libs/pages"

import { collections, post, resetContent } from "../support/astro-content"

vi.mock("astro:content", () => import("../support/astro-content"))

/**
 * Gives every locale the copy the site needs: a home page, settings, and a
 * page entry for each page in the route table.
 */
function fillSite(): void {
  collections.home = LOCALES.map((id) => ({
    data: {
      metadata: { description: `Home in ${id}` },
      sections: { hero: { subheading: `Developer in ${id}` } },
    },
    id,
  }))
  collections.settings = LOCALES.map((id) => ({
    data: { author: { name: "Luca Pipolo" } },
    id,
  }))

  for (const page of PAGES) {
    const collection = page === "blog" ? "blog-index" : page

    collections[collection] = LOCALES.map((id) => ({
      data: {
        metadata: { description: `${page} in ${id}` },
        title: `${page} title in ${id}`,
      },
      id,
    }))
  }

  collections.blog = []
}

/**
 * Finds the summary of one page in one locale.
 *
 * @param href - The page's path in that locale.
 *
 * @returns The summary.
 */
async function summaryAt(href: string) {
  const summary = (await getPageSummaries()).find((s) => s.href === href)

  if (!summary) throw new Error(`No summary at ${href}`)

  return summary
}

describe("getPageSummaries", () => {
  beforeEach(() => {
    resetContent()
    fillSite()
  })

  it("lists the home page and every page in every locale", async () => {
    const summaries = await getPageSummaries()

    expect(summaries).toHaveLength(LOCALES.length * (1 + PAGES.length))
    expect(summaries.filter(({ locale }) => locale === "it")).toHaveLength(
      1 + PAGES.length
    )
  })

  it("describes the home page with its own copy", async () => {
    expect(await summaryAt("/en/")).toEqual({
      alternates: { en: "/en/", es: "/", it: "/it/" },
      description: "Home in en",
      href: "/en/",
      locale: "en",
      title: "Developer in en",
    })
  })

  it("titles the home page after the author when it has no copy", async () => {
    collections.home = []

    const home = await summaryAt("/it/")

    expect(home.title).toBe("Luca Pipolo")
    expect(home.description).toBeUndefined()
  })

  it("describes a page with its own copy, under its path in each locale", async () => {
    expect(await summaryAt("/it/contatti/")).toMatchObject({
      alternates: { en: "/en/contact/", es: "/contacto/", it: "/it/contatti/" },
      description: "contact in it",
      title: "contact title in it",
    })
  })

  it("reads the blog's copy from its own collection", async () => {
    expect((await summaryAt("/blog/")).title).toBe("blog title in es")
  })

  it("falls back to a page's intro when its metadata has no description", async () => {
    collections.privacy = LOCALES.map((id) => ({
      data: { intro: `Privacy intro in ${id}`, metadata: {}, title: "Privacy" },
      id,
    }))

    expect((await summaryAt("/en/privacy/")).description).toBe(
      "Privacy intro in en"
    )
  })

  it("leaves a page without a description or an intro undescribed", async () => {
    collections.cookies = LOCALES.map((id) => ({
      data: { metadata: {}, title: "Cookies" },
      id,
    }))

    expect((await summaryAt("/en/cookies/")).description).toBeUndefined()
  })

  it("dates a page by when it was last updated", async () => {
    const updated = new Date("2026-05-01")

    collections.imprint = LOCALES.map((id) => ({
      data: { metadata: {}, title: "Imprint", updated },
      id,
    }))

    expect((await summaryAt("/en/imprint/")).modified).toEqual(updated)
    expect((await summaryAt("/en/contact/")).modified).toBeUndefined()
  })

  it("throws when a page has no copy for a locale", async () => {
    collections.security = collections.security.filter(({ id }) => id !== "it")

    await expect(getPageSummaries()).rejects.toThrow(
      "The page `security` has no copy for the locale `it`. Add src/content/pages/security/it.yaml"
    )
  })

  it("lists each post in its own language, under the blog's section", async () => {
    const published = new Date("2026-02-01")
    const updated = new Date("2026-03-01")

    collections.blog = [
      post("rift/en", { metaDescription: "Meta", published, updated }),
      post("rift/es", { published, slug: "rift-es" }),
    ]

    expect(await summaryAt("/en/blog/rift/")).toEqual({
      alternates: { en: "/en/blog/rift/", es: "/blog/rift-es/" },
      description: "Meta",
      href: "/en/blog/rift/",
      locale: "en",
      modified: updated,
      published,
      section: "blog title in en",
      title: "Title of rift/en",
    })

    const spanish = await summaryAt("/blog/rift-es/")

    expect(spanish.description).toBe("About rift/es")
    expect(spanish.modified).toEqual(published)
  })
})
