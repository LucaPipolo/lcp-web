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
per locale from a collection; the default locale's route gets no prefix. Links are written locale-less and passed
through `localizeHref(href, locale)` at render time. Request-time language negotiation happens at the edge (see
Vercel).

## Vercel

`middleware.ts`, at the project root because it follows Vercel's own Edge Middleware convention rather than
Astro's `src/middleware.ts`, negotiates `Accept-Language`/a `locale` cookie ahead of the cache. `vercel.json`
declares the Content-Security-Policy and the rest of the security headers. `bun run check:csp`
(`scripts/check-csp.mjs`) walks the built `dist/` HTML and fails the build over any inline `style` attribute or an
inline `<script>`/`<style>` whose hash isn't allowlisted in that policy.
