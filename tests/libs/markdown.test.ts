import { type HastPluginInput, markdownToHtml } from "satteri"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  ARTICLE_IMAGE_SIZES,
  articleImages,
  externalLinks,
  headingIds,
  imageCaptions,
} from "@/libs/markdown"

const SITE = "https://www.lucapipolo.com"

/**
 * Renders Markdown through the same engine and plugins the build uses.
 *
 * @param markdown - The source to render.
 * @param before - Plugins to run ahead of the site's own.
 *
 * @returns The rendered HTML.
 */
async function render(
  markdown: string,
  before: HastPluginInput[] = []
): Promise<string> {
  const { html } = await markdownToHtml(markdown, {
    hastPlugins: [
      ...before,
      headingIds,
      articleImages,
      imageCaptions,
      externalLinks(SITE),
    ],
  })

  return html
}

describe("headingIds", () => {
  it("drops the accents from a heading's id", async () => {
    expect(await render("## Añadir un formulario")).toContain(
      '<h2 id="anadir-un-formulario">'
    )
  })

  it("keeps two headings with the same text apart", async () => {
    const html = await render("## Intro\n\n## Intro")

    expect(html).toContain('<h2 id="intro">')
    expect(html).toContain('<h2 id="intro-1">')
  })

  it("keeps an id an earlier plugin gave the heading", async () => {
    const earlier: HastPluginInput = {
      name: "earlier-id",
      element: {
        filter: ["h2"],
        visit(node, ctx) {
          ctx.setProperty(node, "id", "custom")
        },
      },
    }

    expect(await render("## Intro", [earlier])).toContain('<h2 id="custom">')
  })
})

describe("articleImages", () => {
  it("gives a raster image the widths and sizes it is drawn at", async () => {
    const html = await render("![Photo](./photo.png)")

    expect(html).toContain('widths="480 720 1080 1440"')
    expect(html).toContain(`sizes="${ARTICLE_IMAGE_SIZES}"`)
  })

  it("leaves a vector image alone", async () => {
    expect(await render("![Logo](./logo.svg)")).toBe(
      '<p><img src="./logo.svg" alt="Logo"></p>\n'
    )
  })
})

describe("imageCaptions", () => {
  it("turns a titled image alone in its paragraph into a captioned figure", async () => {
    const html = await render('![Alt](./a.png "A caption")')

    expect(html).toMatch(
      /^<figure><img src="\.\/a\.png" alt="Alt" [^>]*><figcaption>A caption<\/figcaption><\/figure>/
    )
    expect(html).not.toContain("title=")
  })

  it("leaves an image sharing its paragraph with text alone", async () => {
    const html = await render('Text ![Alt](./b.png "Not alone")')

    expect(html).toMatch(/^<p>Text <img /)
    expect(html).toContain('title="Not alone"')
  })

  it("leaves an image without a real title alone", async () => {
    expect(await render('![Alt](./c.png "  ")')).toMatch(/^<p><img /)
    expect(await render("![Alt](./d.png)")).toMatch(/^<p><img /)
  })

  it("leaves a paragraph without an image alone", async () => {
    expect(await render("Just text")).toBe("<p>Just text</p>\n")
  })
})

describe("externalLinks", () => {
  it("opens a link that leaves the site in a new tab, marked with an icon", async () => {
    const html = await render("[GitHub](https://github.com/LucaPipolo)")

    expect(html).toContain('target="_blank" rel="noopener noreferrer"')
    expect(html).toContain(
      '⁠<svg aria-hidden="true" class="external-link-icon" viewBox="0 0 24 24"'
    )
  })

  it("leaves the site's own links alone", async () => {
    expect(await render("[contact](/contact/)")).toBe(
      '<p><a href="/contact/">contact</a></p>\n'
    )
    expect(await render(`[self](${SITE}/x)`)).toBe(
      `<p><a href="${SITE}/x">self</a></p>\n`
    )
  })
})

describe("externalLinks with a different icon set", () => {
  afterEach(() => {
    vi.doUnmock("@iconify-json/lucide")
    vi.resetModules()
  })

  /**
   * Loads the plugins against a stand-in for the icon set.
   *
   * @param icons - What the icon set exports as `icons`.
   *
   * @returns The `externalLinks` plugin factory, built on that set.
   */
  async function withIcons(icons: object) {
    vi.resetModules()
    vi.doMock("@iconify-json/lucide", () => ({ icons }))

    return (await import("@/libs/markdown")).externalLinks
  }

  it("throws when the icon set no longer has the icon", async () => {
    const plugin = await withIcons({ icons: {} })

    expect(() => plugin(SITE)).toThrow("no `external-link` icon")
  })

  it("draws the icon 24 units square when nothing gives it a size", async () => {
    const plugin = await withIcons({
      icons: { "external-link": { body: "<path/>" } },
    })

    const { html } = await markdownToHtml("[GitHub](https://github.com)", {
      hastPlugins: [plugin(SITE)],
    })

    expect(html).toContain('viewBox="0 0 24 24"')
  })
})
