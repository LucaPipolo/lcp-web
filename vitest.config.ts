/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config"

export default getViteConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      /**
       * We decided to list each module as its tests land, rather than cover all
       * of `src/libs` and `api` at once, because every file listed is held to
       * 100% and an unlisted one would fail the whole run until it is tested.
       */
      include: [
        "src/libs/asterisk.ts",
        "src/libs/blog.ts",
        "src/libs/brand.ts",
        "src/libs/consent.ts",
        "src/libs/contact.ts",
        "src/libs/content.ts",
        "src/libs/email.ts",
        "src/libs/i18n.ts",
        "src/libs/links.ts",
        "src/libs/markdown.ts",
        "src/libs/notice.ts",
        "src/libs/og.ts",
        "src/libs/pages.ts",
        "src/libs/search.ts",
        "src/libs/storage.ts",
        "src/libs/structured-data.ts",
        "src/libs/template.ts",
        "src/libs/utils.ts",
      ],
      reporter: ["text", "html", "clover"],
      thresholds: { perFile: { 100: true } },
    },
  },
})
