# CLAUDE.md

This project is the personal portfolio website of Luca Pipolo, a senior full-stack web developer and team lead. It
contains Luca's experience, known stack, contact details, projects and blog posts. The content is written in three
languages: Spanish (Spain, default), English (UK), and Italian (Italy).

## Foundational Context

This is an Astro application with static output and no server adapter, deployed on Vercel. See Architecture below
for details.

- astro — 7
- typescript — 6
- tailwindcss — 4
- @alpinejs/csp — 3
- astro-icon — 1
- @sentry/astro — 10
- prettier — 3
- eslint — 10
- husky — 9
- lint-staged — 17
- commitlint — 21

## Project structure

```
src/
├── pages/[...locale]/         routes — getStaticPaths() drives locale routing
├── content.config.ts          Zod schema for every collection below
├── content/
│   ├── pages/<name>/<locale>.yaml   per-locale page copy (home, legal pages)
│   └── settings/<locale>.yaml       shared site copy — nav, footer
├── components/
│   ├── common/                 generic, reusable primitives
│   └── sections/               named page sections (Hero, Experience, Stack, SiteHeader…)
├── layouts/main.astro          shared HTML shell — header, footer, meta
├── libs/                       i18n, content loaders, templating, utils
├── scripts/                    client-side browser scripts (theme, TOC, share…)
├── styles/                     Tailwind config-in-CSS + partials
└── icons/                      hand-authored SVGs

middleware.ts                   Vercel Edge Middleware — locale negotiation
vercel.json                     Vercel HTTP response headers (CSP, HSTS, …)
scripts/                        Docker dev-environment scripts + check-csp.mjs
```

## Development environment

The dev environment is built for AI agents working in parallel: Docker plus git worktrees, one isolated container
set and HTTPS domain per worktree. See more about the Docker development workflow in @.claude/guidelines/dev-env.md

## Architecture

How Astro's content model, Alpine's CSP build, locale routing, and Vercel fit together:
@.claude/guidelines/architecture.md

## Git

When to commit, what makes a commit atomic, and how content and code commits stay separate:
@.claude/guidelines/git.md

## Docs

What `README.md` must cover, and when to update or add to it:
@.claude/guidelines/docs.md
