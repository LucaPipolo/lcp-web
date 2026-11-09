import { glob } from "astro/loaders"
import { z } from "astro/zod"
import { defineCollection } from "astro:content"

const settings = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/settings" }),
  schema: z.object({
    author: z.object({ name: z.string() }),
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

/** One recommendation, as written on LinkedIn and translated per locale. */
const recommendation = z.object({
  initials: z.string(),
  name: z.string(),
  role: z.string(),
  text: z.string(),
  href: z.url().optional(),
  avatar: z.string().optional(),
  /** When it was written: never shown, only what the full list is sorted by. */
  date: z.coerce.date().optional(),
})

const home = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/pages/home" }),
  schema: z.object({
    metadata: z.object({
      title: z.string(),
      description: z.string(),
    }),
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

      blog: z
        .object({
          heading: z.string(),
          action: z.object({ label: z.string(), href: z.string() }),
        })
        .optional(),

      recommendations: z
        .object({
          heading: z.string(),
          action: z.object({ label: z.string(), href: z.string() }).optional(),
          quotes: z.array(recommendation),
        })
        .optional(),
    }),
  }),
})

const recommendations = defineCollection({
  loader: glob({
    pattern: "*.yaml",
    base: "./src/content/pages/recommendations",
  }),
  schema: z.object({
    metadata: z.object({ title: z.string() }),
    title: z.string(),
    intro: z.string(),
    quotes: z.array(recommendation).min(1),
  }),
})

/** A text field on the contact form: what it's called and how it guides. */
const contactField = z.object({
  label: z.string(),
  placeholder: z.string().optional(),
  hint: z.string().optional(),
})

const contact = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/pages/contact" }),
  schema: z.object({
    metadata: z.object({ title: z.string() }),
    title: z.string(),
    intro: z.string(),
    form: z.object({
      reasons: z.object({
        legend: z.string(),
        /**
         * Why someone is getting in touch. The `id` is what the server
         * receives; the `hint` replaces the message placeholder once picked.
         */
        options: z
          .array(
            z.object({
              id: z.enum(["job", "project", "collaboration", "other"]),
              label: z.string(),
              hint: z.string(),
            })
          )
          .min(1),
      }),
      name: contactField,
      email: contactField,
      message: contactField,
      /** The acknowledgement box, as HTML so it can link the policy. */
      acknowledgement: z.string(),
      submit: z.string(),
      sending: z.string(),
      /** Shown in place of the form when JavaScript isn't running. */
      noscript: z.string(),
      success: z.object({ heading: z.string(), body: z.string() }),
      /**
       * What each code the server can answer with means to a Visitor, so the
       * copy stays here rather than in the function.
       */
      errors: z.object({
        required: z.string(),
        email: z.string(),
        tooShort: z.string(),
        tooLong: z.string(),
        links: z.string(),
        acknowledgement: z.string(),
        verification: z.string(),
        rateLimited: z.string(),
        generic: z.string(),
      }),
    }),
    /** The first layer of data protection information, next to the form. */
    notice: z.object({
      heading: z.string(),
      items: z
        .array(z.object({ term: z.string(), description: z.string() }))
        .min(1),
    }),
    booking: z.object({
      heading: z.string(),
      body: z.string(),
      label: z.string(),
      href: z.url(),
    }),
  }),
})

const notFound = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/pages/not-found" }),
  schema: z.object({
    metadata: z.object({ title: z.string() }),
    eyebrow: z.string(),
    heading: z.string(),
    body: z.string(),
    pathLabel: z.string(),
    actions: z.array(
      z.object({
        label: z.string(),
        href: z.string(),
        variant: z.enum(["default", "outline", "inverted"]).optional(),
      })
    ),
    suggestions: z.object({
      heading: z.string(),
      links: z.array(
        z.object({
          label: z.string(),
          description: z.string(),
          href: z.string(),
          download: z.boolean().optional(),
        })
      ),
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
      metadata: z.object({
        title: z.string(),
        description: z.string(),
      }),
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
       * The path segment this language serves the post under, so each one
       * reads in its own words. Left out, the folder's name is used.
       */
      slug: z
        .string()
        .regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          "Use lowercase ASCII letters and digits joined by single hyphens, such as `spam-free-contact-form`."
        )
        .optional(),
      /**
       * The posts to point to after this one, by their folder's name.
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
    /** The search, tag filter and pagination over the list of posts. */
    filters: z.object({
      search: z.string(),
      searchPlaceholder: z.string(),
      tags: z.string(),
      /** How many posts match, as `{count}`, in each plural form. */
      results: z.object({ one: z.string(), other: z.string() }),
      /**
       * How many of all the posts a search or tag leaves, as `{count}` of
       * `{total}`, in each plural form `{total}` takes.
       */
      filtered: z.object({ one: z.string(), other: z.string() }),
      noResults: z.string(),
      clear: z.string(),
      pagination: z.string(),
      /** Where the Visitor is, as `{page}` of `{pages}`. */
      page: z.string(),
    }),
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
  "not-found": notFound,
  recommendations,
  contact,
}
