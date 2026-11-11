/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config"

export default getViteConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/libs/**", "api/**"],
      /**
       * We decided to leave out the modules that only hold constants, because
       * a test could only repeat their values back. Any other file there is
       * held to 100% from the moment it lands.
       */
      exclude: ["src/libs/button.ts", "src/libs/theme-storage.ts"],
      reporter: ["text", "html", "clover"],
      thresholds: { perFile: { 100: true } },
    },
  },
})
