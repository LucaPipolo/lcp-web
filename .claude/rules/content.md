---
paths:
  - "src/content/**/*.yaml"
---

# Content

## Placeholders

A string can carry `{name}` tokens, filled at render time rather than assembled from parts, so a translator keeps
the whole sentence and decides where the value sits in it. A placeholder with no matching value is left as-is
rather than blanked, so a mistyped name shows up in the page instead of quietly leaving a hole.

- `fillPlaceholders(text, values)` (`@/libs/template`) substitutes plain text: `copyright: "© {year} Luca Pipolo"`.
- `splitPlaceholders(text)` is for a placeholder that stands for markup a string can't hold. It splits the string
  into parts, and the caller renders each `{name}` it recognises: `text: "Made with {heart} and {astro}"` becomes
  a `<PixelHeart />` where `{heart}` sits and a link where `{astro}` sits (see `SiteFooterColophon.astro`).

## Per-locale pages

A page under `src/content/pages/<name>/` needs one file per locale in `LOCALES` (`es`, `en`, `it`), or the build
throws. There is no fallback between languages: add the file for every locale when adding the page.

## Legal pages

`imprint`, `privacy`, `cookies`, `security`, and `ai-content` share one schema, built by `articlePage()` in
`content.config.ts`: `title`, `updated` (a date), `updatedLabel`, `intro`, and `sections[]`, each a `heading` with
an optional `body` and/or an optional `items[]` of `{ term, description }` pairs rendered as a definition list.
