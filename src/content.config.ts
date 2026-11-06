import { glob } from "astro/loaders"
import { z } from "astro/zod"
import { defineCollection } from "astro:content"

const settings = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/settings" }),
  schema: z.object({
    socialLinks: z.array(
      z.object({
        platform: z.enum(["github", "linkedin", "email"]),
        href: z.string(),
        label: z.string(),
        handle: z.string(),
      })
    ),
    header: z.object({
      themeToggleLabel: z.string(),
      menuLabel: z.string(),
      nav: z.array(z.object({ label: z.string(), href: z.string() })),
    }),
    blog: z.object({
      readingTime: z.string(),
      published: z.string(),
      updated: z.string(),
      tableOfContents: z.string(),
      share: z.string(),
      shareOn: z.string(),
      copyLink: z.string(),
      copiedLink: z.string(),
      copyCode: z.string(),
      copiedCode: z.string(),
      previous: z.string(),
      next: z.string(),
      feed: z.string(),
      related: z.string(),
    }),
    footer: z.object({
      tagline: z.string(),
      action: z.object({ label: z.string(), href: z.string() }),
      columns: z
        .array(
          z.object({
            label: z.string(),
            links: z.array(
              z.object({
                label: z.string(),
                href: z.string(),
                download: z.boolean().optional(),
              })
            ),
          })
        )
        .optional(),
      colophon: z.object({
        text: z.string(),
        repo: z.string(),
      }),
      copyright: z.string(),
    }),
  }),
})

const home = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/pages/home" }),
  schema: z.object({
    metadata: z.object({ title: z.string() }),
    sections: z.object({
      hero: z.object({
        badge: z
          .object({
            stem: z.string(),
            tails: z.array(z.string()).min(1),
          })
          .optional(),
        heading: z.string(),
        subheading: z.string(),
        body: z.string(),
        actions: z.array(
          z.object({
            label: z.string(),
            href: z.string(),
            variant: z.enum(["default", "outline", "inverted"]).optional(),
            download: z.boolean().optional(),
          })
        ),
      }),

      experience: z
        .object({
          heading: z.string(),
          roles: z.array(
            z.object({
              period: z.string(),
              title: z.string(),
              company: z.string(),
              companyHref: z.url().optional(),
              place: z.string(),
              bullets: z.array(z.string()),
              skills: z.array(z.string()).optional(),
            })
          ),
        })
        .optional(),

      stack: z
        .object({
          heading: z.string(),
          tabs: z.array(
            z.object({
              id: z.string(),
              label: z.string(),
              groups: z.array(
                z.object({
                  label: z.string(),
                  items: z.array(
                    z.object({
                      name: z.string(),
                      slug: z.string().optional(),
                    })
                  ),
                })
              ),
            })
          ),
        })
        .optional(),

      recommendations: z
        .object({
          heading: z.string(),
          action: z.object({ label: z.string(), href: z.string() }).optional(),
          quotes: z.array(
            z.object({
              initials: z.string(),
              name: z.string(),
              role: z.string(),
              text: z.string(),
              href: z.url().optional(),
              avatar: z.string().optional(),
            })
          ),
        })
        .optional(),
    }),
  }),
})

/**
 * Builds a collection for a page that reads as one article: a heading, a
 * revision date and a run of sections, each prose, a definition list, or both.
 *
 * @param directory - The folder under `src/content/pages` holding one YAML
 *   file per locale, named after it.
 *
 * @returns The collection, with nothing optional: a page that renders in one
 *   language and not another has to fail the build rather than ship.
 */
function articlePage(directory: string) {
  return defineCollection({
    loader: glob({
      pattern: "*.yaml",
      base: `./src/content/pages/${directory}`,
    }),
    schema: z.object({
      metadata: z.object({ title: z.string() }),
      title: z.string(),
      updated: z.coerce.date(),
      updatedLabel: z.string(),
      intro: z.string(),
      sections: z.array(
        z.object({
          heading: z.string(),
          body: z.string().optional(),
          items: z
            .array(z.object({ term: z.string(), description: z.string() }))
            .optional(),
        })
      ),
    }),
  })
}

/**
 * The posts, one Markdown file per locale a post is written in, kept in a
 * folder named after the slug it is served under.
 *
 * A post that only exists in one language is the normal case rather than a
 * mistake, so nothing here asks for the full set: the listing for a locale is
 * built from whatever was written in it, and the rest stays unseen.
 */
const blog = defineCollection({
  loader: glob({
    pattern: "*/*.md",
    base: "./src/content/blog",
    // The path is the contract: the folder names the post, the file names the
    // language. Slugifying it would let `Strict CSP/EN.md` resolve, and then
    // the id would no longer say where the file is.
    generateId: ({ entry }) => entry.replace(/\.md$/, ""),
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      published: z.coerce.date(),
      updated: z.coerce.date().optional(),
      tags: z.array(z.string()).default([]),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      draft: z.boolean().default(false),
      /**
       * The posts to point to after this one, by slug (their folder's name).
       * Left out, the posts sharing the most tags are pointed to instead.
       */
      related: z.array(z.string()).optional(),
    }),
})

const blogIndex = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/pages/blog" }),
  schema: z.object({
    metadata: z.object({ title: z.string() }),
    title: z.string(),
    intro: z.string(),
    empty: z.string(),
    /** How a post's own title is written out in the browser's title bar. */
    postTitle: z.string(),
  }),
})

const imprint = articlePage("imprint")
const privacy = articlePage("privacy")
const cookies = articlePage("cookies")
const security = articlePage("security")
const aiContent = articlePage("ai-content")

export const collections = {
  settings,
  home,
  blog,
  "blog-index": blogIndex,
  imprint,
  privacy,
  cookies,
  security,
  "ai-content": aiContent,
}
