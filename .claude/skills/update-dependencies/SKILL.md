---
name: update-dependencies
description: >-
  Updates this repo's Bun dependencies, one per commit, working through them in a fixed order. Use when asked to
  update dependencies, upgrade packages, or run a dependency update pass. Only reachable via the
  /update-dependencies slash command; never invoke this on your own.
disable-model-invocation: true
model: sonnet
---

# Updating dependencies

Updates dependencies one at a time, each in its own commit. Never batch multiple dependency updates into a
single commit.

This project runs every `bun` command through Docker, never on the host: `docker compose exec app bun ...`, run
from the checkout's own root (see `.claude/guidelines/dev-env.md`). If the container isn't running, these
commands fail outright; start it with `./scripts/up.sh` rather than falling back to the host.

## Preflight (mandatory)

Before updating anything, confirm the starting point is green. A dependency update is only meaningful if a
failure afterwards can be attributed to it.

```bash
git status --short
docker compose exec app bun run format:check
docker compose exec app bun run lint
docker compose exec app bun run build
```

- `git status --short` must be empty. If the working tree is dirty, stop and report; never mix an update with
  unrelated changes.
- If any check already fails, stop and report which one. Do not begin the update pass, and do not "fix" the
  pre-existing failure as part of it; that is a separate task with its own commit.

## Branch

Once preflight is green, create and switch to a dated branch:

```bash
git checkout -b "update/$(date +%F)"
```

`date +%F` gives `YYYY-MM-DD`, e.g. `update/2026-08-14`. If that branch already exists, an update pass already
ran today; check it out instead of creating a new one (`git checkout "update/$(date +%F)"`) and continue the
queue from there rather than starting over.

- There is no test runner in this project yet. When one is added, its command joins this list.

## Update order (mandatory)

Before updating anything, build an ordered queue of the outdated packages:

1. **Production before development.** Every package in `dependencies` is fully updated before any package in
   `devDependencies`.
2. **General before specific.** Within each group, a foundational package is updated before the packages that
   extend, configure, or plug into it.

Ecosystem groups in this project, in the order they must be updated:

| First             | Then                                                                     |
| ----------------- | ------------------------------------------------------------------------ |
| `astro`           | `@astrojs/rss`                                                           |
| `astro-icon`      | `@iconify-json/lucide`, `@iconify-json/simple-icons`                     |
| `tailwindcss`     | `@tailwindcss/vite`, `tw-animate-css`                                    |
| `typescript`      | `typescript-eslint`                                                      |
| `eslint`          | `@eslint/js`, `eslint-plugin-astro`, `eslint-plugin-jsx-a11y`, `globals` |
| `prettier`        | `prettier-plugin-astro`, `prettier-plugin-tailwindcss`                   |
| `@commitlint/cli` | `@commitlint/config-conventional`                                        |
| `husky`           | `lint-staged`                                                            |

Everything else (`@alpinejs/csp`, `@fontsource-variable/inter`, `@sentry/astro`, `@vercel/functions`,
`@vercel/speed-insights`, `clsx`, `tailwind-merge`) has no dependent in this list; update it in its normal
production/development position, in whatever order `bun outdated` lists it.

## The update pass

1. List outdated dependencies:

   ```bash
   docker compose exec app bun outdated
   ```

   Split the results into `dependencies` and `devDependencies` by reading `package.json`, then sort each group
   with the rules above. That ordered list is the queue.

2. For each package in the queue, one at a time:

   ```bash
   docker compose exec app bun update {package} --latest
   ```

   `--latest` resolves to the true latest version, ignoring the existing semver range, so it can cross a major
   boundary.

   Before crossing a major on `astro`, `tailwindcss`, `eslint`, or `typescript`, check the package's own
   changelog or release notes for breaking changes (fetch it, or search for it). A major bump that needs code
   changes here is not a dependency update: stop and report it so it can be planned as its own task.

3. Verify, in this order:

   ```bash
   docker compose exec app bun run format
   docker compose exec app bun run lint
   docker compose exec app bun run build
   ```

   - `bun run format` may rewrite files. That's expected, and those changes belong in this dependency's commit.
   - If any check fails, stop. Do not commit, and do not continue to the next package. Report the failing
     package and the output. Never work around a failure by loosening a type, disabling a rule, or pinning back
     silently.

4. Stage only what this dependency touched:

   ```bash
   git add package.json bun.lock
   ```

   If step 3 reformatted tracked files, stage them into this same commit too. Then hand off to the `git-commit`
   skill to write and make the commit; it already knows this repo's dependency-commit shape
   (`build: update dependency {name} to {version}`, resolved version from `package.json`/`bun.lock`, never the
   semver range). Never push.

5. Move to the next package and repeat steps 2 to 4.

## Boundaries

- If `bun update --latest` reports no change for a package, skip it. Never create an empty commit.
- Adding a dependency that isn't installed yet is a different task (`build: add dependency {name} {version}`),
  not this one.
- Do not squash, reorder, or amend a prior dependency commit; each stays an isolated, individually revertible
  unit (`.claude/guidelines/git.md`).
- Never push at the end of a pass. Pushing needs explicit confirmation.

## When finished

Report a summary: which packages were updated, which were skipped and why, and which were deferred as breaking
majors.
