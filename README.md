This is the source for [Luca Pipolo's personal portfolio website](https://www.lucapipolo.com), statically built
with [Astro](https://astro.build/).

## Tech stack

- [Astro](https://astro.build/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Alpine.js](https://alpinejs.dev/)
- [Sentry](https://sentry.io/)

## Project structure

```
src/
├── pages/[...locale]/    routes, one tree per locale
├── content/               content collections: pages, settings, blog posts
├── components/
│   ├── common/            generic, reusable primitives
│   └── sections/          named page sections (Hero, Blog, Post, SiteHeader...)
├── layouts/main.astro     shared HTML shell
├── libs/                  i18n, content loaders, templating, utils
├── scripts/               client-side browser scripts
├── styles/                Tailwind config in CSS, plus partials
└── icons/                 hand-authored SVGs

middleware.ts              locale negotiation, at the edge
vercel.json                security headers
rift.yaml                  local dev environment, read by Rift
compose.yaml               dev containers
check-csp.mjs              build-time CSP check
```

## Running this site locally

There are three ways to run this project: with [Rift](https://github.com/LucaPipolo/rift), with plain
[Docker Compose](https://docs.docker.com/compose/), or directly with [bun](https://bun.sh/docs).

### Option A: with Rift

[Rift](https://github.com/LucaPipolo/rift) is how I run this project day to day. It gives every checkout its own
containers, host port, and HTTPS domain, all served through one shared Caddy router.

1. Install [Rift](https://github.com/LucaPipolo/rift#install) and [Docker](https://docs.docker.com/get-started/) (or
   [OrbStack](https://docs.orbstack.dev/) as a macOS alternative), and make sure Docker is running.
2. Clone the repository:

   ```bash
   git clone git@github.com:LucaPipolo/lcp-web.git && cd lcp-web
   ```

3. Make `.test` domains resolve to your machine (I suggest using [dnsmasq](https://formulae.brew.sh/formula/dnsmasq)).
4. Run Rift's setup and open the site:

   ```bash
   rift setup
   ```

5. Visit **https://lcp-web.test**.

`rift setup` writes this checkout's `.env`, starts its containers, and prints the URL. The dev server runs with hot
reload using [Vite](https://vite.dev/), so any change is reflected straight away; there's nothing extra to start.

> [!NOTE]
> On the first run, the system asks for your password once, to trust the local HTTPS certificate. The same
> certificate authority is shared across Rift projects.

#### Commands you'll use day to day

| Command       | What it does                                                               |
| ------------- | -------------------------------------------------------------------------- |
| `rift up`     | Start this checkout                                                        |
| `rift down`   | Stop it; other checkouts and the shared router keep running                |
| `rift setup`  | Write `.env`, then start. Use in a new worktree or after changing settings |
| `rift status` | See the apps registered with the router                                    |
| `rift doctor` | Diagnose setup problems                                                    |

Add `-v` (for example, `rift up -v`) for full output instead of one line per step.

To run project scripts, use `docker compose exec` against the app container, from this checkout's own root:

```bash
docker compose exec app bun run dev       # dev server
docker compose exec app bun run build     # production build
docker compose exec app bun run preview   # preview the build
docker compose exec app bun run lint      # run ESLint
docker compose exec app bun run format    # run ESLint + Prettier fix
```

#### **Built for git worktrees**

`rift.yaml` is designed around [git worktrees](https://git-scm.com/docs/git-worktree): each worktree gets its own
containers, port, and domain, so they never collide.

```bash
git worktree add -b my-feature ../my-feature
cd ../my-feature
rift setup
```

That checkout is now served at **https://my-feature.lcp-web.test**, alongside `lcp-web.test` and any other worktree,
each running at the same time without conflicts. `rift down` stops only that checkout; the shared router stays up for
the others.

This makes the project a good fit for working with multiple AI agents or an ADE like [Orca](https://www.onorca.dev/)
side by side. Each agent can work in its own worktree, with its own running instance, without stepping on the others.

I use Orca as my ADE and create a worktree there for each feature. Pointing its setup and archive scripts at Rift
gives every new worktree a running environment automatically, with no manual step in between:

| Orca setting                                     | Value                                    |
| ------------------------------------------------ | ---------------------------------------- |
| Setup script                                     | `cd "$ORCA_WORKTREE_PATH" && rift setup` |
| When to run                                      | Run by default                           |
| Wait for setup to complete before starting agent | On                                       |
| Archive script                                   | `cd "$ORCA_WORKTREE_PATH" && rift down`  |

Make sure `rift` is on the `PATH` those scripts see. Setup starts that worktree's own containers before the agent
gets to work in it; archive stops them once the worktree is gone.

Day to day I work mostly inside Orca itself, including its
[per-worktree browser](https://www.onorca.dev/docs/browser/overview): its Design Mode turns the cursor into an
element picker, hovering highlights the element under it, useful for pointing an agent at something on the page.
For manual edits I switch to [Zed](https://zed.dev/): fast to jump between worktrees, and a solid editor on its
own.

### Option B: with Docker Compose

If you would rather not install Rift, the same `compose.yaml` runs directly with Docker Compose. You set the values
Rift would otherwise derive:

1. Install [Docker](https://docs.docker.com/get-started/) (or [OrbStack](https://docs.orbstack.dev/) as a macOS
   alternative) and make sure it's running.
2. Clone the repository:

   ```bash
   git clone git@github.com:LucaPipolo/lcp-web.git && cd lcp-web
   ```

3. Create this checkout's `.env`:

   ```bash
   cp .env.example .env
   ```

   Then set two values in it:

   - `GIT_COMMON_DIR` to the absolute path printed by
     `git rev-parse --path-format=absolute --git-common-dir`.
   - `ASTRO_DEV_HMR_CLIENT_PORT` to `APP_PORT` (`4321` by default), so hot reload works without the HTTPS router.

4. Create the external network `compose.yaml` expects, once (skip it if it already exists). Its name is
   `ROUTER_NAME`, `rift-router` by default:

   ```bash
   docker network create rift-router
   ```

5. Start the stack:

   ```bash
   docker compose up --build
   ```

6. Visit **http://localhost:4321**.

This path skips the shared HTTPS router, so the site is served straight from the Vite dev server over HTTP. The
compose file still joins the router network so both options can share the same file. To stop it, run
`docker compose down`.

> [!NOTE]
> Running more than one checkout this way? Give each its own `COMPOSE_PROJECT_NAME` and `APP_PORT` in `.env`;
> nothing derives them for you.

### Option C: without Docker

1. Install [bun](https://bun.sh/docs/installation).
2. Clone the repository:

   ```bash
   git clone git@github.com:LucaPipolo/lcp-web.git && cd lcp-web
   ```

3. Install dependencies and start the dev server:

   ```bash
   bun install && bun run dev
   ```

This serves the site at `localhost:4321` with no HTTPS, but it is otherwise identical to Option A.

> [!CAUTION]
> The [git hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks) run inside the Docker container, so
> without it you'll need `git commit --no-verify` to commit. Options A and B both run it.

## AI tooling

This repo is set up to work with [Claude Code](https://claude.com/product/claude-code). This section covers the
parts meant to be reached for by hand, not the ones Claude uses on its own.

I run this repo on Sonnet as the base model, and set [`/advisor`](https://code.claude.com/docs/en/advisor), a
second opinion consulted before committing to an approach, to Opus rather than have Sonnet review itself. Anthropic's own
[guide to choosing a model](https://platform.claude.com/docs/en/about-claude/models/choosing-a-model) covers that
trade-off.

Commits made with AI assistance carry a `Co-Authored-By: Claude Code <noreply@anthropic.com>` trailer, plus a
`Model: <name> (<id>)` line naming what actually did the work (see `git log`). I want that visible rather than
folded into ordinary authorship: recording which model helped is how I track and improve how I use these tools
over time. The next thing I want there is a token count per commit, so the cost side is visible too, once the
tooling reliably exposes that.

### Skills

| Skill                       | What it does                                                                                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/open-pr`                  | Opens a GitHub PR for the current branch, writing the title and body to match this repo's template.                                                              |
| `/address-pr-comments [PR]` | Works through a PR's unresolved review comments: fixes what's valid, replies to what isn't. Defaults to the current branch's PR, or targets the given PR number. |
| `/update-dependencies`      | Updates this repo's Bun dependencies one at a time, each in its own commit.                                                                                      |

> [!NOTE]
> I review PRs with [ChatGPT Codex](https://chatgpt.com/codex), not a human teammate, since I work alone on this
> project. `/address-pr-comments` only handles Codex's own bot account for that reason; extending it to other
> reviewers would be straightforward.

> [!NOTE]
> `/update-dependencies` is deliberately not left runnable on its own (`disable-model-invocation: true` in its
> frontmatter). Wiring it into a scheduled cloud agent, a weekly cron run rather than a live `/loop` (which only
> polls while a session stays open), would be straightforward. I just haven't set it up yet.

### MCP servers

Configured in `.mcp.json`, committed so every checkout gets them:

| Server                                           | What it's for                                                                                                                     |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| [Vercel](https://vercel.com/docs/mcp/vercel-mcp) | Deployments, project and domain info, logs, for this project's own account                                                        |
| [Astro docs](https://mcp.docs.astro.build/)      | Up to date Astro documentation lookup                                                                                             |
| [Sentry](https://mcp.sentry.dev/)                | This project's error reports, issues, and traces                                                                                  |
| [Context7](https://context7.com/)                | Up to date documentation lookup for any library, including Tailwind CSS and Alpine.js, which have no official server of their own |

> [!NOTE]
> Vercel and Sentry authenticate through OAuth on first connection.

## License

[MIT](./LICENSE.md)
