import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"

import js from "@eslint/js"
import astro from "eslint-plugin-astro"
import perfectionist from "eslint-plugin-perfectionist"
import globals from "globals"
import tseslint from "typescript-eslint"
import { defineConfig, globalIgnores } from "eslint/config"

const COMPONENTS_DIR = join(import.meta.dirname, "src/components")
const SECTIONS_DIR = join(COMPONENTS_DIR, "sections")

/**
 * One import group per component directory, so every section's components sit
 * in their own block. Read from disk rather than listed here, so adding a
 * section directory gives it its own block with no change to this file.
 */
const sectionGroups = existsSync(SECTIONS_DIR)
  ? readdirSync(SECTIONS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .map((name) => ({
        groupName: `components-${name}`,
        pattern: `^@/components/sections/${name}/`,
      }))
  : []

const componentGroups = [
  { groupName: "components-common", pattern: "^@/components/common/" },
  ...sectionGroups,
]

// Groups matching a path alias, ordered from the shell inwards.
const aliasGroups = [
  { groupName: "layouts", pattern: "^@/layouts/" },
  ...componentGroups,
  { groupName: "components", pattern: "^@/components/" },
  { groupName: "libs", pattern: "^@/libs/" },
  { groupName: "scripts", pattern: "^@/scripts/" },
]

export default defineConfig([
  globalIgnores(["dist", ".astro", "coverage"]),
  {
    files: ["**/*.{ts,astro}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.browser,
    },
  },
  astro.configs.recommended,
  astro.configs["jsx-a11y-recommended"],
  {
    ...perfectionist.configs["recommended-natural"],
    files: ["**/*.{ts,astro}"],
  },
  {
    files: ["**/*.{ts,astro}"],
    rules: {
      "perfectionist/sort-modules": "off",
      "perfectionist/sort-union-types": [
        "error",
        { type: "natural", groups: ["unknown", "nullish"] },
      ],
      "perfectionist/sort-objects": "off",
      "perfectionist/sort-imports": [
        "error",
        {
          type: "natural",
          tsconfig: { rootDir: "." },
          newlinesBetween: 1,
          groups: [
            ["value-side-effect", "value-side-effect-style"],
            "type-import",
            ["value-builtin", "value-external"],
            ...aliasGroups.map((group) => group.groupName),
            "value-internal",
            ["value-parent", "value-sibling", "value-index"],
            "value-style",
            "unknown",
          ],
          customGroups: aliasGroups.map(({ groupName, pattern }) => ({
            groupName,
            modifiers: ["value"],
            elementNamePattern: pattern,
          })),
        },
      ],
    },
  },
])
