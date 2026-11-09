import type { SatteriProcessorOptions } from "@astrojs/markdown-satteri"

import { icons } from "@iconify-json/lucide"
import Slugger from "github-slugger"

type HastPlugin = NonNullable<SatteriProcessorOptions["hastPlugins"]>[number]

/**
 * How wide an image in a post is drawn: the article's own column from the
 * medium breakpoint up, the whole screen below it.
 */
export const ARTICLE_IMAGE_SIZES = "(min-width: 48rem) 43rem, 100vw"

/**
 * The widths a post's images are generated at, covering that column at one
 * and two device pixels a CSS pixel. Astro skips any wider than the source.
 */
export const ARTICLE_IMAGE_WIDTHS = [480, 720, 1080, 1440]

/**
 * Gives every heading in a post an id with its accents dropped, so a link to
 * a section reads `#anadir-un-formulario` rather than `#a%C3%B1adir-…` once
 * it is copied or shared.
 *
 * Runs ahead of Astro's own heading step, which keeps an id a heading already
 * has, so the table of contents links to the same id. The slugging is Astro's
 * own, so a heading with no accent keeps the id it always had.
 */
export const headingIds: HastPlugin = () => {
  const slugger = new Slugger()

  return {
    name: "ascii-heading-ids",
    element: {
      filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
      visit(node, ctx) {
        if (typeof node.properties?.id === "string") return

        const text = ctx
          .textContent(node)
          .normalize("NFD")
          .replace(/\p{Mn}/gu, "")

        ctx.setProperty(node, "id", slugger.slug(text))
      },
    },
  }
}

/**
 * Hands each raster image in a post the widths and sizes it is drawn at, which
 * is what turns Astro's single optimised file into a `srcset`.
 *
 * Runs ahead of Astro's own image step, which passes every property an image
 * carries on to `getImage()`. A vector image is left alone: it is already
 * sharp at any size.
 */
export const articleImages: HastPlugin = {
  name: "article-images",
  element: {
    filter: ["img"],
    visit(node, ctx) {
      const src = node.properties?.src

      if (typeof src !== "string" || /\.svg$/i.test(src)) return

      ctx.setProperty(node, "widths", ARTICLE_IMAGE_WIDTHS)
      ctx.setProperty(node, "sizes", ARTICLE_IMAGE_SIZES)
    },
  },
}

/**
 * Turns an image standing alone in its paragraph, and given a title, into a
 * figure captioned with that title: `![Alt text](./image.png "Caption")`.
 *
 * The title is what Markdown already has for this, so a post stays plain
 * Markdown, and it moves to the caption rather than also becoming a tooltip.
 */
export const imageCaptions: HastPlugin = {
  name: "image-captions",
  element: {
    filter: ["p"],
    visit(node, ctx) {
      const content = node.children.filter(
        (child) => child.type !== "text" || child.value.trim() !== ""
      )

      const [image] = content

      if (
        content.length !== 1 ||
        image.type !== "element" ||
        image.tagName !== "img"
      ) {
        return
      }

      const { title, ...properties } = image.properties ?? {}

      if (typeof title !== "string" || title.trim() === "") return

      ctx.replaceNode(node, {
        children: [
          { ...image, properties },
          {
            children: [{ type: "text", value: title }],
            properties: {},
            tagName: "figcaption",
            type: "element",
          },
        ],
        properties: {},
        tagName: "figure",
        type: "element",
      })
    },
  },
}

/**
 * Strips the `www.` a host may or may not be written with.
 *
 * @param host - A hostname.
 *
 * @returns The same host without its `www.`.
 */
function bareHost(host: string): string {
  return host.replace(/^www\./, "")
}

/**
 * Marks every link that leaves the site with Lucide's external-link icon, the
 * one the site's own components use, and opens it the way they open theirs: in
 * a new tab, with no access back to this one.
 *
 * The icon comes from the icon set itself rather than a copy of its markup,
 * and is joined to the link's last word so it never wraps onto a line alone.
 *
 * @param site - The site's own address, whose links are not external.
 *
 * @returns The plugin.
 *
 * @throws When the icon set no longer has the icon, rather than leaving every
 *   external link quietly unmarked.
 */
export function externalLinks(site: string): HastPlugin {
  const own = bareHost(new URL(site).hostname)
  const icon = icons.icons["external-link"]

  if (!icon) {
    throw new Error(
      "@iconify-json/lucide has no `external-link` icon. Update the name in externalLinks() in src/libs/markdown.ts."
    )
  }

  const size = `0 0 ${icon.width ?? icons.width ?? 24} ${icon.height ?? icons.height ?? 24}`
  const svg = `<svg aria-hidden="true" class="external-link-icon" viewBox="${size}" xmlns="http://www.w3.org/2000/svg">${icon.body}</svg>`

  return {
    name: "external-links",
    element: {
      filter: ["a"],
      visit(node, ctx) {
        const href = node.properties?.href

        if (typeof href !== "string" || !/^https?:\/\//i.test(href)) return

        if (bareHost(new URL(href).hostname) === own) return

        ctx.setProperty(node, "target", "_blank")
        ctx.setProperty(node, "rel", "noopener noreferrer")
        // U+2060, a word joiner: no line break between the text and its icon.
        ctx.appendChild(node, { type: "raw", value: `\u2060${svg}` })
      },
    },
  }
}
