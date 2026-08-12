// @ts-check
import { defineConfig } from "astro/config"
import tailwindcss from "@tailwindcss/vite"
import icon from "astro-icon"

import { DEFAULT_LOCALE, LOCALES } from "./src/libs/i18n.ts"

import sentry from "@sentry/astro"

// https://astro.build/config
export default defineConfig({
  site: "https://www.lucapipolo.com",
  integrations: [
    icon(),
    sentry({
      project: "lcp-web",
      org: "lucapipolo",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
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
  },
})
