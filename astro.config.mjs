// @ts-check
import { defineConfig } from "astro/config"
import tailwindcss from "@tailwindcss/vite"

import { DEFAULT_LOCALE, LOCALES } from "./src/libs/i18n.ts"

// https://astro.build/config
export default defineConfig({
  i18n: {
    locales: [...LOCALES],
    defaultLocale: DEFAULT_LOCALE,
    routing: {
      prefixDefaultLocale: false,
    },
  },
  redirects: {
    [`/${DEFAULT_LOCALE}`]: "/",
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
