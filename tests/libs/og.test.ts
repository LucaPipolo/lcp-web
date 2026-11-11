import type { PageSummary } from "@/libs/pages"

import satori from "satori"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  getOgCards,
  getOgImageHref,
  OG_IMAGE_SIZE,
  renderOgCard,
} from "@/libs/og"

import { pngSize } from "../support/png"

// The real renderer runs; wrapping it lets a test read what it was asked to draw.
vi.mock("satori", async (importOriginal) => {
  const { default: satori } = await importOriginal<typeof import("satori")>()

  return { default: vi.fn(satori) }
})

/**
 * Finds the style the card's tree gave a piece of text.
 *
 * @param node - The tree, or part of it.
 * @param text - The text to look for.
 *
 * @returns Its style, or `undefined` when the tree doesn't hold it.
 */
function styleOf(
  node: unknown,
  text: string
): Record<string, unknown> | undefined {
  if (typeof node !== "object" || node === null) return undefined

  const { props } = node as {
    props: { children?: unknown; style: Record<string, unknown> }
  }

  if (props.children === text) return props.style

  for (const child of [props.children].flat()) {
    const style = styleOf(child, text)

    if (style) return style
  }
}

/**
 * Reads the tree the last card was drawn from.
 *
 * @returns The element tree handed to satori.
 */
function lastTree(): unknown {
  return vi.mocked(satori).mock.lastCall![0]
}

const summaries = vi.hoisted(() => ({ list: [] as PageSummary[] }))

vi.mock("@/libs/pages", () => ({
  getPageSummaries: async () => summaries.list,
}))

describe("getOgImageHref", () => {
  it("points a page at an image under its own path", () => {
    expect(getOgImageHref("/it/contatti/")).toBe("/og/it/contatti.png")
  })

  it("names the default locale's home page's image index", () => {
    expect(getOgImageHref("/")).toBe("/og/index.png")
  })
})

describe("getOgCards", () => {
  beforeEach(() => {
    summaries.list = []
  })

  it("titles a page's card with its title, without an eyebrow", async () => {
    summaries.list = [
      { alternates: {}, href: "/en/contact/", locale: "en", title: "Contact" },
    ]

    expect(await getOgCards()).toEqual([
      {
        eyebrow: undefined,
        href: "/en/contact/",
        locale: "en",
        title: "Contact",
      },
    ])
  })

  it("heads a post's card with its section and the date it was published", async () => {
    summaries.list = [
      {
        alternates: {},
        href: "/en/blog/rift/",
        locale: "en",
        published: new Date("2026-02-01"),
        section: "Blog",
        title: "Rift",
      },
    ]

    const [card] = await getOgCards()

    expect(card.eyebrow).toMatch(/^Blog · .*2026/)
  })

  it("heads a post outside any section with its date alone", async () => {
    summaries.list = [
      {
        alternates: {},
        href: "/en/blog/rift/",
        locale: "en",
        published: new Date("2026-02-01"),
        title: "Rift",
      },
    ]

    const [card] = await getOgCards()

    expect(card.eyebrow).toMatch(/2026/)
    expect(card.eyebrow).not.toContain("·")
  })
})

describe("renderOgCard", () => {
  it("renders a PNG at the size link previews use", async () => {
    const png = await renderOgCard(
      { href: "/en/", locale: "en", title: "Senior full-stack developer" },
      "Luca Pipolo"
    )

    expect(pngSize(png)).toEqual(OG_IMAGE_SIZE)
    expect(styleOf(lastTree(), "Senior full-stack developer")?.fontSize).toBe(
      72
    )
    expect(styleOf(lastTree(), "Luca Pipolo")).toBeDefined()
  })

  it("heads a post with its eyebrow, and sets a long title smaller to fit", async () => {
    const title = "A".repeat(80)
    const png = await renderOgCard(
      {
        eyebrow: "Blog · 1 February 2026",
        href: "/en/blog/rift/",
        locale: "en",
        title,
      },
      "Luca Pipolo"
    )

    expect(pngSize(png)).toEqual(OG_IMAGE_SIZE)
    expect(styleOf(lastTree(), "Blog · 1 February 2026")).toBeDefined()
    expect(styleOf(lastTree(), title)?.fontSize).toBe(56)
  })
})
