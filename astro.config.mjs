// @ts-check
import { defineConfig, envField } from "astro/config"
import tailwindcss from "@tailwindcss/vite"
import icon from "astro-icon"

import { DEFAULT_LOCALE, LOCALES } from "./src/libs/i18n.ts"
import {
  articleImages,
  headingIds,
  externalLinks,
  imageCaptions,
} from "./src/libs/markdown.ts"

import { satteri } from "@astrojs/markdown-satteri"

import sentry from "@sentry/astro/integration"

const SITE = "https://www.lucapipolo.com"

// https://astro.build/config
export default defineConfig({
  site: SITE,
  // Vercel redirects every path without one to its trailing-slash version
  // (`trailingSlash` in `vercel.json`), so the dev server refuses them too.
  trailingSlash: "always",
  env: {
    schema: {
      // Public by design: Cloudflare expects it in the page. Its secret
      // counterpart only ever reaches `api/contact`.
      TURNSTILE_SITE_KEY: envField.string({
        context: "client",
        access: "public",
      }),
    },
  },
  integrations: [
    icon(),
    sentry({
      project: "lcp-web",
      org: "lucapipolo",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  markdown: {
    // Shiki writes its colours into a style attribute on every token, which
    // `style-src 'self'` blocks and `check:csp` fails the build over. Prism
    // writes class names instead, and `_code.css` colours them.
    syntaxHighlight: "prism",
    processor: satteri({
      hastPlugins: [
        headingIds,
        articleImages,
        imageCaptions,
        externalLinks(SITE),
      ],
    }),
  },
  i18n: {
    locales: [...LOCALES],
    defaultLocale: DEFAULT_LOCALE,
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    build: { assetsInlineLimit: 0 },
    // Vercel only sets `VERCEL_ENV` at build time, so it is baked in here for
    // both Sentry configs to tell production, preview and local events apart.
    define: {
      "import.meta.env.SENTRY_ENVIRONMENT": JSON.stringify(
        process.env.VERCEL_ENV ?? "development"
      ),
    },
  },
})
