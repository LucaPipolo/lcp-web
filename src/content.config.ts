import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { z } from "astro/zod"

const home = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/pages/home" }),
  schema: z.object({
    metadata: z.object({ title: z.string() }),
  }),
})

export const collections = { home }
