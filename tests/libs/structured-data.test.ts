import { beforeEach, describe, expect, it, vi } from "vitest"

import { LOCALES } from "@/libs/i18n"
import {
  getBreadcrumbNode,
  getPostNode,
  getSiteNodeId,
  getStructuredData,
  type SchemaNode,
} from "@/libs/structured-data"

import { collections, post, resetContent } from "../support/astro-content"

vi.mock("astro:content", () => import("../support/astro-content"))

const SITE = new URL("https://www.lucapipolo.com")

const SECTIONS = {
  experience: {
    roles: [{ company: "somoscuatro", companyHref: "https://somoscuatro.es" }],
  },
  hero: { subheading: "Senior full-stack developer" },
  stack: {
    tabs: [
      { groups: [{ items: [{ name: "Astro" }, { name: "TypeScript" }] }] },
      { groups: [{ items: [{ name: "TypeScript" }, { name: "Laravel" }] }] },
    ],
  },
}

/**
 * Gives every locale settings and a home page with the given sections.
 *
 * @param sections - The home page's sections, or nothing for no home copy.
 */
function fillSite(sections?: object): void {
  collections.settings = LOCALES.map((id) => ({
    data: {
      author: { name: "Luca Pipolo" },
      socialLinks: [
        { href: "https://github.com/LucaPipolo" },
        { href: "https://www.linkedin.com/in/lucapipolo/?locale=en_US" },
        { href: "mailto:hello@example.com" },
      ],
    },
    id,
  }))
  collections.home = sections
    ? LOCALES.map((id) => ({ data: { sections }, id }))
    : []
}

/**
 * Builds a page's JSON-LD and reads its graph back.
 *
 * @param options - What to describe, over a plain English web page.
 *
 * @returns The graph's nodes.
 */
async function graphFor(
  options: Partial<Parameters<typeof getStructuredData>[0]> = {}
): Promise<SchemaNode[]> {
  const json = await getStructuredData({
    locale: "en",
    site: SITE,
    title: "Contact",
    type: "WebPage",
    url: "https://www.lucapipolo.com/en/contact/",
    ...options,
  })

  return JSON.parse(json)["@graph"]
}

describe("getSiteNodeId", () => {
  it("names a node at the site's root", () => {
    expect(getSiteNodeId(SITE, "person")).toBe(
      "https://www.lucapipolo.com/#person"
    )
  })
})

describe("getStructuredData", () => {
  beforeEach(() => {
    resetContent()
    fillSite(SECTIONS)
  })

  it("describes the site, its author and the page", async () => {
    const [website, person, page] = await graphFor({
      description: "Write to me",
    })

    expect(website).toEqual({
      "@id": "https://www.lucapipolo.com/#website",
      "@type": "WebSite",
      inLanguage: ["es", "en", "it"],
      name: "Luca Pipolo",
      publisher: { "@id": "https://www.lucapipolo.com/#person" },
      url: "https://www.lucapipolo.com/",
    })
    expect(person).toEqual({
      "@id": "https://www.lucapipolo.com/#person",
      "@type": "Person",
      jobTitle: "Senior full-stack developer",
      knowsAbout: ["Astro", "TypeScript", "Laravel"],
      name: "Luca Pipolo",
      sameAs: [
        "https://github.com/LucaPipolo",
        "https://www.linkedin.com/in/lucapipolo/",
      ],
      url: "https://www.lucapipolo.com/en/",
      worksFor: {
        "@type": "Organization",
        name: "somoscuatro",
        url: "https://somoscuatro.es",
      },
    })
    expect(page).toEqual({
      "@id": "https://www.lucapipolo.com/en/contact/#webpage",
      "@type": "WebPage",
      description: "Write to me",
      inLanguage: "en",
      isPartOf: { "@id": "https://www.lucapipolo.com/#website" },
      name: "Contact",
      url: "https://www.lucapipolo.com/en/contact/",
    })
  })

  it("points a profile page at its author", async () => {
    const [, , page] = await graphFor({ type: "ProfilePage" })

    expect(page.mainEntity).toEqual({
      "@id": "https://www.lucapipolo.com/#person",
    })
  })

  it("adds the nodes a page brings, after its own", async () => {
    const extra = { "@type": "Thing" }

    expect((await graphFor({ nodes: [extra] })).at(-1)).toEqual(extra)
  })

  it("leaves out what the copy does not say", async () => {
    fillSite()

    const [, person, page] = await graphFor()

    expect(person).not.toHaveProperty("jobTitle")
    expect(person).not.toHaveProperty("worksFor")
    expect(person).not.toHaveProperty("knowsAbout")
    expect(page).not.toHaveProperty("description")
    expect(page).not.toHaveProperty("mainEntity")
  })

  it("names an employer without a link when it has none", async () => {
    fillSite({
      ...SECTIONS,
      experience: { roles: [{ company: "Freelance" }] },
      stack: { tabs: [] },
    })

    const [, person] = await graphFor()

    expect(person.worksFor).toEqual({
      "@type": "Organization",
      name: "Freelance",
    })
    expect(person).not.toHaveProperty("knowsAbout")
  })

  it("reads the default locale's copy for an unsupported one", async () => {
    const [, person, page] = await graphFor({ locale: "fr" })

    expect(person.url).toBe("https://www.lucapipolo.com/")
    expect(page.inLanguage).toBe("fr")
  })

  it("escapes markup, so a string cannot close the script it sits in", async () => {
    const json = await getStructuredData({
      locale: "en",
      site: SITE,
      title: "</script><script>alert(1)</script>",
      type: "WebPage",
      url: "https://www.lucapipolo.com/en/",
    })

    expect(json).not.toContain("<")
    expect(JSON.parse(json)["@graph"][2].name).toBe(
      "</script><script>alert(1)</script>"
    )
  })
})

describe("getPostNode", () => {
  const url = "https://www.lucapipolo.com/en/blog/rift/"

  it("describes a post, dated by its last update", () => {
    const node = getPostNode(
      post("rift/en", {
        published: new Date("2026-02-01T00:00:00Z"),
        tags: ["docker", "php"],
        updated: new Date("2026-03-01T00:00:00Z"),
      }),
      url,
      SITE
    )

    expect(node).toEqual({
      "@id": `${url}#article`,
      "@type": "BlogPosting",
      author: { "@id": "https://www.lucapipolo.com/#person" },
      dateModified: "2026-03-01T00:00:00.000Z",
      datePublished: "2026-02-01T00:00:00.000Z",
      description: "About rift/en",
      headline: "Title of rift/en",
      keywords: "docker, php",
      mainEntityOfPage: { "@id": `${url}#webpage` },
      publisher: { "@id": "https://www.lucapipolo.com/#person" },
    })
  })

  it("dates a post never updated by when it was published, without keywords if untagged", () => {
    const node = getPostNode(
      post("rift/en", { published: new Date("2026-02-01T00:00:00Z") }),
      url,
      SITE
    )

    expect(node.dateModified).toBe("2026-02-01T00:00:00.000Z")
    expect(node).not.toHaveProperty("keywords")
  })
})

describe("getBreadcrumbNode", () => {
  it("lists each step, numbered from the home page", () => {
    expect(
      getBreadcrumbNode(
        [
          { href: "/en/", name: "Home" },
          { href: "/en/blog/", name: "Blog" },
        ],
        SITE
      )
    ).toEqual({
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          item: "https://www.lucapipolo.com/en/",
          name: "Home",
          position: 1,
        },
        {
          "@type": "ListItem",
          item: "https://www.lucapipolo.com/en/blog/",
          name: "Blog",
          position: 2,
        },
      ],
    })
  })
})
