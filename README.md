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
scripts/                   the Docker scripts below
```

## Running this site locally

You have two ways to run this project: with [Docker](https://docs.docker.com/get-started/), or directly
with [bun](https://bun.sh/docs) installed on your system.

### Option A: with Docker

1. Install [Docker](https://docs.docker.com/get-started/) (or [OrbStack](https://docs.orbstack.dev/) as a macOS
   alternative) and make sure it's running.
2. Clone the repository:

   ```bash
   git clone git@github.com:LucaPipolo/lcp-web.git && cd lcp-web
   ```

3. Make `.test` domains resolve to your machine (I suggest using [dnsmasq](https://formulae.brew.sh/formula/dnsmasq)).
4. Run the setup script and open the site:

   ```bash
   ./scripts/setup.sh
   ```

5. Visit **https://lcp-web.test**.

The dev server is already running with hot reload with [Vite](https://vite.dev/), so any change you make is reflected
straight away; there's nothing extra to start.

> [!CAUTION]
> The Docker scripts in this repo (`scripts/*.sh`) currently only support macOS.

> [!NOTE]
> On the first run, macOS asks for your password once, to trust the SSL certificate.

#### Commands you'll use day to day

| Command              | What it does                                     |
| -------------------- | ------------------------------------------------ |
| `./scripts/up.sh`    | Start this checkout                              |
| `./scripts/down.sh`  | Stop it, and the router if nothing else uses it  |
| `./scripts/setup.sh` | Rewrite `.env`, then start. Safe to run any time |

All three accept `--verbose` (or `-v`) for full output instead of one line per step.

To run project scripts, use `docker compose exec` against the app container, from this checkout's own root:

```bash
docker compose exec app bun run dev       # dev server
docker compose exec app bun run build     # production build
docker compose exec app bun run preview   # preview the build
```

#### **Built for git worktrees**

The Docker setup is designed around [git worktrees](https://git-scm.com/docs/git-worktree): each worktree gets its own
containers, port, and domain, so they never collide.

```bash
git worktree add ../my-feature
cd ../my-feature
./scripts/setup.sh
```

That checkout is now served at **https://my-feature.lcp-web.test**, alongside `lcp-web.test` and any other worktree,
each running at the same time without conflicts. A single shared router handles HTTPS for all of them; `down.sh` only
stops that router once nothing else is using it.

This makes the project a good fit for working with multiple AI agents or an ADE like [Orca](https://www.onorca.dev/)
side by side. Each agent can work in its own worktree, with its own running instance, without stepping on the others.

I use Orca as my ADE and create a worktree there for each feature. Pointing its setup and archive scripts at this
repo's own gives every new worktree a running Docker environment automatically, with no manual step in between:

| Orca setting                                     | Value                                  |
| ------------------------------------------------ | -------------------------------------- |
| Setup script                                     | `$ORCA_WORKTREE_PATH/scripts/setup.sh` |
| When to run                                      | Run by default                         |
| Wait for setup to complete before starting agent | On                                     |
| Archive script                                   | `$ORCA_WORKTREE_PATH/scripts/down.sh`  |

Setup starts that worktree's own containers before the agent gets to work in it; archive stops them once the
worktree is gone.

Day to day I work mostly inside Orca itself, including its
[per-worktree browser](https://www.onorca.dev/docs/browser/overview): its Design Mode turns the cursor into an
element picker, hovering highlights the element under it, useful for pointing an agent at something on the page.
For manual edits I switch to [Zed](https://zed.dev/): fast to jump between worktrees, and a solid editor on its
own.

### Option B: without Docker

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
> without it running you'll need `git commit --no-verify` to commit.

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
