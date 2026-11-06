import type { SatteriProcessorOptions } from "@astrojs/markdown-satteri"

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
