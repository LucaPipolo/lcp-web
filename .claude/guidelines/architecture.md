# Architecture

## Astro

`content.config.ts` defines every collection with a Zod schema, the single place to add a field. A page under
`src/content/pages/<name>/` needs a file for every locale (`es`, `en`, `it`) or the build throws.

## Alpine

The site aims for a maximum-grade Content-Security-Policy (see Vercel): no `unsafe-inline`, no `eval`, no
`unsafe-eval`. Alpine's default build compiles its directives through `eval`, which that policy blocks, so the
site uses Alpine's dedicated CSP build (`@alpinejs/csp`) instead, wired in `src/scripts/alpine.ts`.

Section scripts are per-component: for example, `Stack.astro` imports `@/scripts/stack` and `Experience.astro`
imports `@/scripts/experience`, each in its own `<script>` tag, so Astro only bundles a section's script onto a
page that actually renders that section. Because each is its own module with no fixed load order, `register()`
(`src/scripts/alpine.ts`) tracks which `x-data` names the rendered markup still needs and only starts Alpine once
every one of them has registered.

## Languages

Locale is a route param, not a subtree: `src/libs/i18n.ts` defines `LOCALES` (`es` default, `en`, `it`), and every
route lives under `src/pages/[...locale]/`. `getLocalizedStaticPaths()` (`src/libs/content.ts`) builds one route
per locale from a collection; the default locale's route gets no prefix. Paths are translated too (`/contacto/`,
`/en/contact/`, `/it/contatti/`): `i18n.ts` maps each page and home page section anchor to its slug per locale, a
page's route file is named after it (`[contact].astro`, `[ai_content].astro`) and takes that slug as its param.
Links are written locale-less and in English (`/contact/`, `/#experience`) and passed through
`localizeHref(href, locale)` at render time, which prefixes and translates them. Every page hands the layout its
`alternates`, its own path in each locale that has it, from which the canonical, `hreflang` links and the footer
language switcher are all built; a locale without that page gets no `hreflang` and is switched to its home page.
Request-time language negotiation happens at the edge (see Vercel).

## Discovery

`sitemap.xml`, `robots.txt`, `llms.txt` and each page's Open Graph image (`src/pages/og/`) are built from one list,
`getPageSummaries()` (`src/libs/pages.ts`), which reads the route table and the content collections. A new post
needs nothing else. A new page needs only its entry in `PAGE_SLUGS` (`i18n.ts`), which its routing requires anyway,
and a collection named after it; one without copy for a locale fails the build. The JSON-LD and Open Graph tags
each page carries come from `src/libs/structured-data.ts` and the layout.

## Vercel

`middleware.ts`, at the project root because it follows Vercel's own Edge Middleware convention rather than
Astro's `src/middleware.ts`, negotiates `Accept-Language`/a `locale` cookie ahead of the cache. `vercel.json`
declares the Content-Security-Policy and the rest of the security headers, and the permanent redirects
from paths the site no longer serves, such as each page's path from before it was translated. `bun run check:csp`
(`check-csp.mjs`) walks the built `dist/` HTML and fails the build over any inline `style` attribute or an
inline `<script>`/`<style>` whose hash isn't allowlisted in that policy.
