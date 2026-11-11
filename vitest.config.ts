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
      include: ["src/libs/template.ts"],
      reporter: ["text", "html", "clover"],
      thresholds: { perFile: { 100: true } },
    },
  },
})
