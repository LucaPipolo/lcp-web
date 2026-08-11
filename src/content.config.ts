import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { z } from "astro/zod"

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

export const collections = { settings, home }
