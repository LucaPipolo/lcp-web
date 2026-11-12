# Contributing

This guide covers how I work on this project, from local development and code conventions to testing, pull requests and
deployment. It also documents the AI tools I use and the server-side services that need occasional maintenance.

For an overview of the website and the quickest way to get it running, start with the [README](README.md).

## Running this site locally

I normally use [Rift](https://github.com/LucaPipolo/rift), as described in the [README](README.md#running-locally). You
can also run the project directly with Docker Compose or Bun.

### With Docker Compose

The project's `compose.yaml` works without Rift, although you'll need to configure a few values that Rift normally
handles for you.

1. Install [Docker](https://docs.docker.com/get-started/), or [OrbStack](https://docs.orbstack.dev/) on macOS, and make
   sure it's running.

2. Clone the repository:

   ```bash
   git clone git@github.com:LucaPipolo/lcp-web.git && cd lcp-web
   ```

3. Create an `.env` file:

   ```bash
   cp .env.example .env
   ```

   Set the following values:

   - `GIT_COMMON_DIR`: the absolute path returned by `git rev-parse --path-format=absolute --git-common-dir`.
   - `ASTRO_DEV_HMR_CLIENT_PORT`: the same value as `APP_PORT`, which defaults to `4321`. This lets hot module
     replacement work without the HTTPS router.

4. Create the Docker network expected by `compose.yaml`. Its name comes from `ROUTER_NAME`, which defaults to
   `rift-router`. You only need to create it once:

   ```bash
   docker network create rift-router
   ```

5. Start the containers:

   ```bash
   docker compose up --build
   ```

6. Open **http://localhost:4321**.

This runs the Vite development server directly over HTTP, without Rift's shared HTTPS router. The Compose configuration
still connects to the router network so it can be used with either setup.

When you're finished, stop the containers with `docker compose down`.

> [!NOTE]
> If you want to run several checkouts using Docker Compose directly, give each one a different `COMPOSE_PROJECT_NAME`
> and `APP_PORT` in its `.env` file. Without Rift, these values aren't assigned automatically.

### Without Docker

If you'd rather run everything directly on your machine, all you need is [Bun](https://bun.sh/docs/installation).

Clone the repository, install the dependencies and start the development server:

```bash
git clone git@github.com:LucaPipolo/lcp-web.git && cd lcp-web
bun install
bun run dev
```

The site will be available at **http://localhost:4321**. You'll get the same development server and hot reloading, but
without the Docker environment or local HTTPS.

> [!CAUTION]
> The repository's [Git hooks](#git-hooks-and-ci) run commands inside the Docker container. If you're working without
> Docker, you'll need to use `git commit --no-verify` and `git push --no-verify`, or run the equivalent checks manually.
> The hooks work normally with Rift or Docker Compose.

### Project scripts

When using Rift or Docker Compose, run project scripts inside the application container from the root of the current
checkout:

```bash
docker compose exec app bun run <script>
```

| Script          | What it does                                                           |
| --------------- | ---------------------------------------------------------------------- |
| `dev`           | Start the development server                                           |
| `build`         | Build the website and check the generated output against the CSP       |
| `preview`       | Serve the production build locally                                     |
| `test`          | Run the unit tests                                                     |
| `test:coverage` | Run the tests and enforce 100% coverage                                |
| `lint`          | Run ESLint                                                             |
| `format`        | Apply automatic fixes with ESLint and Prettier                         |
| `format:check`  | Check lint and formatting without changing files                       |
| `check:type`    | Run `astro check`                                                      |
| `check:audit`   | Check dependencies for known vulnerabilities                           |
| `check:csp`     | Check the generated output for scripts and styles that violate the CSP |

## Project structure

The application lives mainly in `src/`, while Vercel Functions, maintenance scripts and development configuration are
kept at the repository root.

```text
src/
├── pages/[...locale]/                Routes for each language
├── pages/*.xml.ts, *.txt.ts          Sitemap, robots.txt and llms.txt
├── pages/og/                         Generated social preview images
├── pages/[icon].png.ts               Generated home screen icons
├── pages/site.webmanifest.ts         Web app manifest
├── content/                          Pages, settings and blog posts
├── components/
│   ├── common/                       Shared UI components
│   └── sections/                     Page sections
├── layouts/main.astro                Shared HTML layout
├── libs/                             i18n, content loaders and utilities
├── scripts/                          Browser-side JavaScript
├── styles/                           Tailwind CSS and stylesheets
├── types/                            Type declarations for dependencies
└── icons/                            Custom SVG icons

api/contact.ts                        Contact form endpoint
api/cleanup.ts                        Scheduled deletion of expired data
api/notify.ts                         Privacy notice delivery
scripts/notify.ts                     CLI for sending privacy notices
tests/                                Vitest unit tests
vitest.config.ts                       Test and coverage configuration
notices/                               Privacy notice templates and records
patches/                               Temporary fixes for dependencies
middleware.ts                          Locale negotiation ahead of the cache
vercel.json                            Security headers, redirects and cron jobs
rift.yaml                              Rift development configuration
compose.yaml                           Development containers
check-csp.mjs                          Build-time CSP validation
.github/workflows/                     CI, security checks and preview cleanup
SECURITY.md                            Vulnerability reporting instructions
```

Tests live outside `api/` because Vercel deploys every file in that directory as a function. Keeping test files there
would create unwanted endpoints.

## Tests and coverage

Unit tests use [Vitest](https://vitest.dev/) and live in `tests/`, following the structure of `src/libs/` and `api/`.

Every module containing application logic in those directories must have **100% unit test coverage** from the moment
it's introduced. Modules that only export constants are excluded, with the exceptions listed explicitly in
`vitest.config.ts`.

Run the full suite with coverage using:

```bash
docker compose exec app bun run test:coverage
```

The command also generates an HTML coverage report in `coverage/`, which is useful when you need to see which branches
or statements are missing tests.

## Code style

Formatting and linting are handled automatically, so there's no need to spend time debating individual formatting
choices.

- [Prettier](https://prettier.io/) handles formatting. The project uses double quotes, no semicolons and an 80-column
  print width. The [Astro plugin](https://github.com/withastro/prettier-plugin-astro) formats `.astro` files, while
  the [Tailwind CSS plugin](https://github.com/tailwindlabs/prettier-plugin-tailwindcss) sorts utility classes. The
  remaining options are in `.prettierrc`.
- [ESLint](https://eslint.org/) checks JavaScript, TypeScript and Astro code, including accessibility
  rules. [typescript-eslint](https://typescript-eslint.io/) provides the TypeScript rules,
  while [Perfectionist](https://perfectionist.dev/) keeps imports organised into groups. The grouping conventions are
  documented in `eslint.config.js`.
- [EditorConfig](https://editorconfig.org/) keeps indentation and line endings consistent across editors.

Comments should explain decisions, assumptions or behaviour that isn't obvious from the code. Avoid comments that simply
repeat what the next line does.

To apply automatic fixes, run:

```bash
docker compose exec app bun run format
```

To run the same non-modifying checks used by CI:

```bash
docker compose exec app bun run format:check
```

## Branches, commits and pull requests

Create branches from `main` and name them using `<type>/<short-description>`, for example `feat/keyboard-a11y` or
`ci/preview-cleanup`.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/), enforced
by [commitlint](https://commitlint.js.org/):

```text
<type>: <description>
```

Alongside the standard commit types, this repository uses two additional ones:

- `ai` for AI-related configuration, such as `CLAUDE.md`, agent instructions or skills.
- `content` for changes to the site's written content under `src/content/`.

Commit scopes aren't used. Write `feat: add a contact form`, rather than `feat(contact): add a contact form`.

### Keeping commits independent

Each commit should represent one coherent change and leave the project in a working state. If someone checks it out on
its own, the site should build and the tests should pass.

Keep code and content changes in separate commits. When introducing a new field in a content collection, first add it as
an optional field in `src/content.config.ts`. Add the corresponding content for all three languages in a separate
commit.

If you need to correct an earlier commit on the same branch, use `git commit --fixup=<sha>` rather than amending it.

### Pull requests

Pull requests target `main` and use a plain, sentence-case title. For example, `Add legal pages` rather than
`feat: add legal pages`.

The description should contain two sections:

- **Context:** What changed and why.
- **Verification Plan:** Numbered steps a reviewer can follow to check the implementation.

Pull requests are merged using rebase, preserving the individual commits on `main`.

I use a few [Claude Code skills](https://code.claude.com/docs/en/skills) to keep this process consistent:

| Skill                       | Purpose                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `git-commit`                | Reviews staged changes, writes a Conventional Commit message and validates it. Claude uses it automatically when committing            |
| `/open-pr`                  | Opens a pull request with the title and description format used by this repository                                                     |
| `/address-pr-comments [PR]` | Reviews unresolved comments, makes relevant changes and replies where needed. Uses the current branch's PR unless a number is provided |

> [!NOTE]
> I currently work alone on this project and use [ChatGPT Codex](https://chatgpt.com/codex) to review pull requests. For
> that reason, `/address-pr-comments` is configured specifically for the Codex bot account. It could be extended to
> support other reviewers.

## Git hooks and CI

[Husky](https://typicode.github.io/husky/) manages
three [Git hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks), which run inside the application container.

| Hook         | Checks                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| `pre-commit` | [lint-staged](https://github.com/lint-staged/lint-staged), running ESLint and Prettier on staged files |
| `commit-msg` | Commit message validation with commitlint                                                              |
| `pre-push`   | The complete test suite with coverage enforcement                                                      |

If the container isn't running, the hook fails rather than silently skipping its checks. Start the environment with
`rift up` before committing or pushing. If necessary, hooks can be bypassed with `--no-verify`, although you should run
the relevant checks manually.

Every pull request also runs a set of [GitHub Actions](https://docs.github.com/en/actions) workflows:

| Workflow        | What it checks                                                                 |
| --------------- | ------------------------------------------------------------------------------ |
| Build           | Production build and CSP validation                                            |
| Tests           | Complete test suite with 100% coverage                                         |
| Types           | `check:type`                                                                   |
| Lint            | `format:check`                                                                 |
| Audit           | Known dependency vulnerabilities, also checked on a schedule                   |
| CodeQL          | [CodeQL](https://codeql.github.com/) security analysis, also run on a schedule |
| Commitlint      | Every commit message in the pull request                                       |
| Preview cleanup | Removes preview deployments when a pull request is closed                      |

Preview cleanup is a maintenance workflow rather than a validation check.

## Working in parallel

The development environment is designed around [Git worktrees](https://git-scm.com/docs/git-worktree). With Rift, each
worktree has its own containers, port and local HTTPS domain, so you can run several branches without conflicts.

To create another working copy:

```bash
git worktree add -b my-feature ../my-feature
cd ../my-feature
rift setup
```

The new worktree will be available at **https://my-feature.lcp-web.test**, alongside the main checkout at
**https://lcp-web.test**.

Stopping it with `rift down` only affects that worktree. The shared router and any other running environments remain
available.

This is particularly useful when working with several AI agents or an Agent Development Environment (ADE) such
as [Orca](https://www.onorca.dev/). Each agent can work on a separate branch with its own running website, without
interfering with another agent's files or development server.

### Orca and Rift

I use Orca to manage parallel work. Each task gets its own worktree, and Rift handles the development environment.

These are the settings I use:

| Orca setting                                     | Value                                    |
| ------------------------------------------------ | ---------------------------------------- |
| Setup script                                     | `cd "$ORCA_WORKTREE_PATH" && rift setup` |
| When to run                                      | Run by default                           |
| Wait for setup to complete before starting agent | On                                       |
| Archive script                                   | `cd "$ORCA_WORKTREE_PATH" && rift down`  |

Make sure `rift` is available on the `PATH` used by these scripts. Orca runs the setup script before the agent starts
working, so the development environment is ready when the task begins. When the worktree is archived, its containers are
stopped.

Most of my day-to-day work happens inside Orca, including using
its [per-worktree browser](https://www.onorca.dev/docs/browser/overview). Design Mode lets me point to elements on the
page, which is useful when explaining visual changes to an agent. For manual editing, I use [Zed](https://zed.dev/),
particularly when I need to move quickly between worktrees.

## AI tooling

I use AI agents throughout development, often running several in parallel on different tasks. Each agent works in an
isolated environment with its own checkout, which makes it easier to review changes and avoid conflicts.

The setup includes:

- **[Docker Sandboxes](https://docs.docker.com/ai/sandboxes/)** to isolate agents from the host machine.
- **Git worktrees and Rift** to give each agent its own running development environment, as described
  in [Working in parallel](#working-in-parallel).
- **[Claude Code](https://claude.com/product/claude-code)** with Sonnet, Opus and Fable. I normally use Sonnet as the
  main model and Opus for [`/advisor`](https://code.claude.com/docs/en/advisor), which provides a second opinion before
  committing to an approach.
  Anthropic's [model selection guide](https://platform.claude.com/docs/en/about-claude/models/choosing-a-model) explains
  the trade-offs between its models.
- **[OpenCode](https://opencode.ai/)** with [DeepSeek](https://www.deepseek.com/), [Kimi](https://www.kimi.com/) and
  [GPT-6.1 Sol](https://openai.com/) from OpenAI.
- **[Ollama](https://ollama.com/)** running a local [Qwen](https://qwen.ai/) model for smaller tasks that don't need a
  hosted model.

### Recording AI-assisted work

Commits created with AI assistance include a `Co-Authored-By: Claude Code <noreply@anthropic.com>` trailer and a
`Model: <name> (<id>)` line identifying the model involved. You can see examples in `git log`.

I keep this information in the commit history because I want to know which tools and models contributed to a change. It
helps me evaluate how well different workflows work over time.

I'd also like to record token usage per commit, so I can compare the cost of different approaches. That isn't
implemented yet because I want to wait until the tools expose the necessary information reliably.

### Agent skills

In addition to the [commit and pull request skills](#branches-commits-and-pull-requests), I have one skill that I invoke
manually:

| Skill                  | Purpose                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `/update-dependencies` | Updates Bun dependencies one at a time, creating a separate commit for each update |

> [!NOTE]
> `/update-dependencies` has `disable-model-invocation: true` in its frontmatter, so agents don't run it automatically.
> I may eventually schedule it through a cloud agent or a weekly cron job, but haven't set that up. A live `/loop`
> wouldn't be suitable because it only runs while the session remains open.

### MCP servers

The project also includes several [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers. Their
configuration lives in `.mcp.json`, which is committed to the repository so every worktree uses the same setup.

| Server                                               | Purpose                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| [Vercel](https://vercel.com/docs/mcp/vercel-mcp)     | Deployments, domains, project configuration and logs                            |
| [Astro documentation](https://mcp.docs.astro.build/) | Access to current Astro documentation                                           |
| [Sentry](https://mcp.sentry.dev/)                    | Application errors, issues and traces                                           |
| [Context7](https://context7.com/)                    | Current documentation for other libraries, including Tailwind CSS and Alpine.js |

Vercel and Sentry require OAuth authentication the first time you connect.

## Deploying and operating

The website itself deploys through Vercel. The contact form and its supporting functions need a few additional services
and environment variables.

### The contact form

The form submits requests to `api/contact.ts`, a [Vercel Function](https://vercel.com/docs/functions) that validates the
submission, verifies the [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) token, saves the message
and a record of the privacy information shown to the sender, and delivers the message
through [Brevo](https://developers.brevo.com/).

Configure the following environment variables in the Vercel project for Production and Preview, except where noted:

| Variable                                     | Purpose                                                                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Turnstile widget credentials. Preview environments use Cloudflare's test keys                                               |
| `BREVO_API_KEY`                              | Brevo API key with permission to send transactional emails. It must be an API key starting with `xkeysib-`, not an SMTP key |
| `CONTACT_TO_EMAIL`                           | Address that receives contact form messages                                                                                 |
| `DB_MESSAGES_DATABASE_URL`                   | Neon connection string for the message database, configured through Vercel's Neon integration with the `DB_MESSAGES` prefix |
| `DB_CONSENT_DATABASE_URL`                    | Neon connection string for the separate privacy record database, using the `DB_CONSENT` prefix                              |
| `CONSENT_IP_HASH_SECRET`                     | Secret used to calculate keyed hashes of senders' IP addresses                                                              |
| `CRON_SECRET`                                | Secret used to authenticate scheduled requests to `api/cleanup.ts`                                                          |
| `PRIVACY_NOTICE_SECRET`                      | Secret required to send privacy notices. Needed in Production                                                               |

Both databases create their tables on first use, so new preview branches don't need a separate migration step.

#### Preview database cleanup

Each preview deployment can create a Neon database branch. These branches remain available until their associated
deployments are deleted, and Neon's plans limit how many branches you can have.

The workflow in `.github/workflows/preview-cleanup.yml` removes preview deployments associated with a branch when its
pull request closes.

To use it, create a [Vercel access token](https://vercel.com/account/settings/tokens) scoped to the relevant team and
save it as the GitHub Actions secret `VERCEL_TOKEN`, under **Settings → Secrets and variables → Actions**.

#### Deleting expired data

The scheduled function `api/cleanup.ts` runs once a day through a [Vercel Cron Job](https://vercel.com/docs/cron-jobs),
configured under `crons` in `vercel.json`.

It deletes contact messages older than 12 months and privacy records older than three years, matching the retention
periods described in the website's privacy policy. Both periods are configured in `RETENTION`, in `src/libs/storage.ts`.

Cron jobs run only on the production deployment.

> [!CAUTION]
> Vercel's bot protection may challenge automated requests, including scheduled calls to the cleanup endpoint. After the
> first production deployment, open **Settings → Cron Jobs** and check that the latest run returned `200`.
>
> If it returned `429`, the firewall blocked the request and expired records won't be deleted until the problem is
> resolved. On the Hobby plan, where custom bypass rules aren't available, switch the bot protection ruleset to log-only
> mode under **Firewall**.

> [!NOTE]
> Functions in `api/` are compiled individually and run as ES modules on Node.js. Relative imports need their `.js`
> extension, for example `../src/libs/contact.js`. Bun resolves extensionless imports locally, so an incorrect import may
> work during development and fail after deployment.

### Notifying people about privacy policy changes

Not every change to the privacy policy requires an email. Corrections and wording improvements generally only need an
updated version date. If a change materially affects how previously collected data is handled, such as a new controller,
a new purpose or a change to international data transfers, the people affected may need to be informed directly.

The [European data protection guidelines on transparency](https://www.edpb.europa.eu/system/files/2023-09/wp260rev01_en.pdf)
provide guidance on when and how to communicate these changes.

The notification system uses `api/notify.ts` to email people whose contact form messages are still retained. Each
address receives one email per run, in the language originally used to contact me. The `Reply-To` header is set to
`CONTACT_TO_EMAIL`.

Every sending run creates a record in the `notices` table of the privacy record database. It stores when the notice was
sent, which privacy policy version it concerned and how many recipients it reached, without storing their email
addresses in that record.

Notices are sent manually using `bun run notify`. The local script prepares the request, while Vercel handles database
access and delivery through Brevo. This keeps the database credentials and Brevo API key on the server.

#### One-time setup

Before sending the first notice, configure two secrets.

1. Generate a random secret:

   ```bash
   openssl rand -hex 32
   ```

   Add it to the Vercel project as `PRIVACY_NOTICE_SECRET`, marked as Sensitive and available to Production and Preview.

2. Vercel's bot protection challenges requests that don't originate from a browser, including the notification script.
   Open **Settings → Deployment Protection → Protection Bypass for Automation**, create a bypass secret and copy it.

   This allows the script to get past Vercel's bot protection and preview authentication. The `api/notify.ts` endpoint
   still checks `PRIVACY_NOTICE_SECRET`, so the bypass alone isn't enough to send notices.

3. Store both secrets in your password manager. You'll export them into your shell when sending a notice.

#### Sending a notice

**1. Prepare the content**

Copy `notices/example.yaml` to a new file named after the change, for example:

```text
notices/2027-03-01-new-controller.yaml
```

Write the subject and message in Spanish, English and Italian. The greeting, link to the privacy policy, explanation of
why the recipient is being contacted and instructions for exercising their rights are added automatically from
`src/content/emails/notice/`.

**2. Publish the updated privacy policy**

Make sure the updated policy is live before sending the notice, so recipients can read the version you're referring to.

**3. Check the recipients**

Export the two secrets into your shell and run the script without any flags:

```bash
export PRIVACY_NOTICE_SECRET=...
export VERCEL_AUTOMATION_BYPASS_SECRET=...

docker compose exec -e PRIVACY_NOTICE_SECRET -e VERCEL_AUTOMATION_BYPASS_SECRET \
  app bun run notify notices/2027-03-01-new-controller.yaml
```

This reports how many people would receive the notice. No emails are sent.

**4. Send a test**

Send all three language versions to your own inbox and check their content, formatting and links:

```bash
docker compose exec -e PRIVACY_NOTICE_SECRET -e VERCEL_AUTOMATION_BYPASS_SECRET \
  app bun run notify notices/2027-03-01-new-controller.yaml --test
```

**5. Send the notice**

Once everything looks correct, send the notice to the recipients:

```bash
docker compose exec -e PRIVACY_NOTICE_SECRET -e VERCEL_AUTOMATION_BYPASS_SECRET \
  app bun run notify notices/2027-03-01-new-controller.yaml --send
```

The response reports how many emails were accepted and how many failed.

If Brevo rejects an email on the first attempt, the function waits briefly and retries once with the same idempotency
key. This helps avoid duplicate deliveries if the first request was accepted but its response wasn't received. Any
remaining failures can be investigated in the Vercel function logs.

Each run is also subject to Vercel's maximum function duration, which is five minutes on the Hobby plan. With the
current implementation, that's enough for roughly 80 recipients even if every email needs a retry.

**6. Commit the notice file**

Commit the YAML file after sending so the repository retains a copy of the notice and its content.

> [!CAUTION]
> `--send` sends the notice to all eligible recipients every time you run it. It doesn't prevent a later run from
> sending the same notice again. Only execute it once per notice.

#### Testing against a preview deployment

You can test the notification process against a preview deployment, where the Neon branch contains only test messages.

Set `NOTIFY_URL` to the preview deployment's `/api/notify/` endpoint and pass it into the container using
`-e NOTIFY_URL`.

The same [Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation)
secret works with preview deployments.

## Reporting bugs

If you find a security vulnerability, follow [SECURITY.md](SECURITY.md) and don't create a public issue.

For other bugs, [open a GitHub issue](https://github.com/LucaPipolo/lcp-web/issues). Include the affected URL, what you
did, what you expected to happen and your browser and version. If you can reproduce the problem consistently, include
the steps.
