[![Build][badge-build]][workflow-build]
[![Types][badge-types]][workflow-types]
[![Lint][badge-lint]][workflow-lint]

This is the source for [Luca Pipolo's personal portfolio website](https://www.lucapipolo.com), statically built
with [Astro](https://astro.build/).

## Tech stack

- [Astro](https://astro.build/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Alpine.js](https://alpinejs.dev/)
- [Vercel Functions](https://vercel.com/docs/functions)
- [Neon](https://neon.tech/) (Postgres)
- [Brevo](https://www.brevo.com/) (email)
- [Cloudflare Turnstile](https://www.cloudflare.com/application-services/products/turnstile/)
- [Sentry](https://sentry.io/)
- [Vercel Web Analytics](https://vercel.com/docs/analytics) and [Speed Insights](https://vercel.com/docs/speed-insights)

## Project structure

```
src/
├── pages/[...locale]/    routes, one tree per locale
├── pages/*.xml.ts, *.txt.ts  sitemap, robots.txt and llms.txt, one for the whole site
├── pages/og/               a link preview image for every page, drawn at build time
├── pages/[icon].png.ts, site.webmanifest.ts  home screen icons and the web manifest
├── content/               content collections: pages, settings, blog posts
├── components/
│   ├── common/            generic, reusable primitives
│   └── sections/          named page sections (Hero, Blog, Post, SiteHeader...)
├── layouts/main.astro     shared HTML shell
├── libs/                  i18n, content loaders, templating, utils
├── scripts/               client-side browser scripts
├── styles/                Tailwind config in CSS, plus partials
├── types/                 type declarations for packages that ship none
└── icons/                 hand-authored SVGs

api/contact.ts             contact form endpoint, a Vercel Function
api/cleanup.ts             daily deletion of expired contact data, a Vercel Cron Job
api/notify.ts              privacy notices to people who wrote, sent by hand
scripts/notify.ts          triggers api/notify from your machine
notices/                   privacy notices sent by hand, plus a template
patches/                   fixes to dependencies, applied by bun install until upstream ships them
middleware.ts              locale negotiation, at the edge
vercel.json                security headers and redirects
rift.yaml                  local dev environment, read by Rift
compose.yaml               dev containers
check-csp.mjs              build-time CSP check
.github/workflows/         CI: lint, type check, build and commit messages on every push
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
docker compose exec app bun run dev        # dev server
docker compose exec app bun run build      # production build
docker compose exec app bun run preview    # preview the build
docker compose exec app bun run lint       # run ESLint
docker compose exec app bun run check:type # run astro check
docker compose exec app bun run format     # run ESLint + Prettier fix
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

## Deploying the contact form

The contact form posts to `api/contact.ts`, a Vercel Function that checks
[Turnstile](https://developers.cloudflare.com/turnstile/), stores the message and a record of the privacy notice the
sender was shown, and emails it through [Brevo](https://developers.brevo.com/). It needs these variables in the
Vercel project, for Production and Preview:

| Variable                                     | What it is                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | The Turnstile widget's keys. Preview uses Cloudflare's test keys, which always pass.            |
| `BREVO_API_KEY`                              | A Brevo API key (`xkeysib-`, not an SMTP key) allowed to send transactional email.              |
| `CONTACT_TO_EMAIL`                           | The inbox messages are delivered to.                                                            |
| `DB_MESSAGES_DATABASE_URL`                   | The Neon database messages are kept in. Set by Vercel's Neon integration, prefix `DB_MESSAGES`. |
| `DB_CONSENT_DATABASE_URL`                    | The separate Neon database proof records are kept in, prefix `DB_CONSENT`.                      |
| `CONSENT_IP_HASH_SECRET`                     | A random string the sender's IP address is hashed with before it's stored.                      |
| `CRON_SECRET`                                | A random string Vercel sends with each run of `api/cleanup.ts`, so only Vercel can trigger it.  |
| `PRIVACY_NOTICE_SECRET`                      | A random string `bun run notify` must send, so only you can email people. Production only.      |

Both databases create their table on first use, so a new preview branch needs no migration.

`api/cleanup.ts` runs once a day as a [Vercel Cron Job](https://vercel.com/docs/cron-jobs) (`crons` in
`vercel.json`) and deletes messages older than 12 months and proof records older than 3 years, the periods the
privacy policy promises. Both are set in `RETENTION` (`src/libs/storage.ts`). Cron jobs only run on the production
deployment.

> [!CAUTION]
> Vercel's bot protection challenges requests that don't come from a browser. After the first deploy to production,
> open **Settings → Cron Jobs** and check the job's last run answered `200`. If it answered `429`, the bot protection
> blocked it and nothing is ever deleted until that's fixed. Hobby has no custom bypass rules, so the way out is
> switching the bot protection ruleset to log only, under **Firewall**.

> [!NOTE]
> `api/` is compiled file by file and run as an ES module on Node, not bundled, so a relative import there needs
> its `.js` extension (`../src/libs/contact.js`). Bun resolves it without one, so a missing extension only fails
> once deployed.

## Notifying people of a privacy policy change

Rewording the privacy policy only needs its "last updated" date changed. A material change to how the data people
already sent is handled (a new controller, a new purpose, data moving outside the EU) has to be told to them
directly, under the
[EDPB's transparency guidelines](https://www.edpb.europa.eu/system/files/2023-09/wp260rev01_en.pdf). `api/notify.ts`
emails everyone whose contact form message is still kept, once per address, in the language they wrote in, with
`Reply-To` set to `CONTACT_TO_EMAIL`. Each run that sends leaves a row in the `notices` table of the consent database
(when, which policy version, how many it reached), with no addresses.

It's triggered by hand with `bun run notify`. Vercel never hands out the database and Brevo keys, so the sending
happens on Vercel and the script only carries the notice and two secrets.

### Once, before the first notice

1. Generate a secret with `openssl rand -hex 32`, and add it in Vercel as `PRIVACY_NOTICE_SECRET` (Sensitive,
   Production and Preview).
2. Vercel's bot protection challenges any request that isn't a browser, which the script isn't. In Vercel, open
   **Settings → Deployment Protection → Protection Bypass for Automation**, add a secret and copy it. It lets the
   script past the bot protection, and past Vercel Authentication on previews, on every plan. The endpoint still
   refuses any request without `PRIVACY_NOTICE_SECRET`.
3. Keep both secrets in a password manager. You'll export them in your shell each time you send.

### Each time

1. Copy `notices/example.yaml` to a file named after the change, such as `notices/2027-03-01-new-controller.yaml`,
   and write the subject and body in Spanish, English and Italian. The greeting, the link to the privacy policy, how
   to object and why the recipient is getting it come from `src/content/emails/notice/`.
2. Publish the updated privacy policy first, so the link in the email shows the new version.
3. Export both secrets in your shell, then count who would get it. Nothing is sent:

   ```bash
   export PRIVACY_NOTICE_SECRET=...
   export VERCEL_AUTOMATION_BYPASS_SECRET=...
   docker compose exec -e PRIVACY_NOTICE_SECRET -e VERCEL_AUTOMATION_BYPASS_SECRET \
     app bun run notify notices/2027-03-01-new-controller.yaml
   ```

4. Send the three language versions to your own inbox and read them:

   ```bash
   docker compose exec -e PRIVACY_NOTICE_SECRET -e VERCEL_AUTOMATION_BYPASS_SECRET \
     app bun run notify notices/2027-03-01-new-controller.yaml --test
   ```

5. Send it to everyone, once:

   ```bash
   docker compose exec -e PRIVACY_NOTICE_SECRET -e VERCEL_AUTOMATION_BYPASS_SECRET \
     app bun run notify notices/2027-03-01-new-controller.yaml --send
   ```

   The answer reports how many it reached and how many failed. Each email is retried once if Brevo doesn't take it
   the first time, under the same key, so a retry never delivers it twice; a failure after that is in the
   function's logs in Vercel. A run is limited to Vercel's maximum function duration (5 minutes on Hobby), enough for
   about 80 recipients even if every email needs its retry.

6. Commit the notice file, so the repository keeps what was sent and when.

> [!CAUTION]
> `--send` emails everyone, every time it runs. Run it once per notice.

> [!NOTE]
> To try it on a preview deployment, whose database branch only holds test messages, also set `NOTIFY_URL` to the
> preview's `/api/notify/` address and pass it with `-e NOTIFY_URL`. The same
> [Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation)
> secret works for previews too.

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

[badge-build]: https://img.shields.io/github/actions/workflow/status/LucaPipolo/lcp-web/build.yml?branch=main&label=build&style=flat-square&logo=githubactions&logoColor=white
[badge-types]: https://img.shields.io/github/actions/workflow/status/LucaPipolo/lcp-web/types.yml?branch=main&label=types&style=flat-square&logo=githubactions&logoColor=white
[badge-lint]: https://img.shields.io/github/actions/workflow/status/LucaPipolo/lcp-web/lint.yml?branch=main&label=lint&style=flat-square&logo=githubactions&logoColor=white
[workflow-build]: https://github.com/LucaPipolo/lcp-web/actions/workflows/build.yml
[workflow-types]: https://github.com/LucaPipolo/lcp-web/actions/workflows/types.yml
[workflow-lint]: https://github.com/LucaPipolo/lcp-web/actions/workflows/lint.yml
