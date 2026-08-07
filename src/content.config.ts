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
