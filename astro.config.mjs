// @ts-check
import { defineConfig } from "astro/config"
import tailwindcss from "@tailwindcss/vite"
import icon from "astro-icon"

import { DEFAULT_LOCALE, LOCALES } from "./src/libs/i18n.ts"

// https://astro.build/config
export default defineConfig({
  site: "https://www.lucapipolo.com",
  integrations: [icon()],
  i18n: {
    locales: [...LOCALES],
    defaultLocale: DEFAULT_LOCALE,
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
