[![Build][badge-build]][workflow-build]
[![Tests][badge-tests]][workflow-tests]
[![Types][badge-types]][workflow-types]
[![Lint][badge-lint]][workflow-lint]
[![CodeQL][badge-codeql]][workflow-codeql]
[![Audit][badge-audit]][workflow-audit]

Source code for [lucapipolo.com](https://www.lucapipolo.com), my personal website and portfolio, built
with [Astro](https://astro.build/) and deployed on [Vercel](https://vercel.com/).

## Features

- **Three languages.** Every page is available in Spanish, English and Italian, with translated URLs such as
  `/contacto/`, `/en/contact/` and `/it/contatti/`. On their first visit, visitors are directed to a language based on
  their browser preferences.
- **Portfolio and blog.** The homepage covers my experience, technical stack and recommendations. Blog posts include a
  table of contents, sharing links and copyable code blocks.
- **Contact form.** Protected against spam
  with [Cloudflare Turnstile](https://www.cloudflare.com/application-services/products/turnstile/), with the option to
  book a video call instead.
- **Privacy and data retention.** Contact messages are kept for 12 months, while records of the privacy information
  shown to visitors are kept for three years. Both are deleted automatically when their retention periods expire. I can
  also notify previous contacts, in their original language, if a significant change to the privacy policy affects their
  data. The setup is documented in [Deploying and operating](CONTRIBUTING.md#deploying-and-operating).
- **Strict security headers.**
  The [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) doesn't allow inline
  scripts, inline styles or `eval`. The build also checks the generated pages for violations.
- **Accessibility and navigation.** Light and dark themes, keyboard navigation and a command palette.
- **SEO and metadata.** A sitemap, `robots.txt`, `llms.txt`, structured data and social preview images, all generated at
  build time.
- **Automated checks.** Modules containing application logic must reach 100% unit test coverage. Pull requests are also
  checked for type errors, lint, formatting, CSP violations and known vulnerabilities.
  See [Tests and coverage](CONTRIBUTING.md#tests-and-coverage) and [Git hooks and CI](CONTRIBUTING.md#git-hooks-and-ci).
- **Parallel development with AI agents.** I work with several AI agents at once, each in its own Git worktree and
  development environment. The site includes a disclosure about AI-assisted development,
  while [AI tooling](CONTRIBUTING.md#ai-tooling) documents the tools and models I use.

## Tech stack

- [Astro](https://astro.build/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Alpine.js](https://alpinejs.dev/)
- [Vercel Functions](https://vercel.com/docs/functions)
- [Neon](https://neon.tech/)
- [Brevo](https://www.brevo.com/)
- [Cloudflare Turnstile](https://www.cloudflare.com/application-services/products/turnstile/)
- [Sentry](https://sentry.io/)
- [Vercel Web Analytics](https://vercel.com/docs/analytics) and [Speed Insights](https://vercel.com/docs/speed-insights)

## Running locally

I use [Rift](https://github.com/LucaPipolo/rift) to manage the local development environment. It runs the site in Docker
with HTTPS and gives every [Git worktree](https://git-scm.com/docs/git-worktree) its own containers and domain, so
several checkouts can run at once.

To get started:

1. Install [Rift](https://github.com/LucaPipolo/rift#install) and [Docker](https://docs.docker.com/get-started/), and
   make sure Docker is running.
2. Configure your machine to resolve `.test` domains locally, for example
   with [dnsmasq](https://formulae.brew.sh/formula/dnsmasq).
3. Clone the repository and run the setup:

   ```bash
   git clone git@github.com:LucaPipolo/lcp-web.git && cd lcp-web
   rift setup
   ```

4. Open **https://lcp-web.test**.

Rift starts the containers and configures the local environment. The [Vite](https://vite.dev/) development server
handles hot reloading, so changes appear in the browser without restarting anything.

> [!NOTE]
> On the first run, your system will ask for your password to trust the local HTTPS certificate.

You can also run the project with plain [Docker Compose](https://docs.docker.com/compose/) or without Docker. Both
options are covered in [CONTRIBUTING.md](CONTRIBUTING.md#running-this-site-locally).

If you're working with multiple worktrees, see [Working in parallel](CONTRIBUTING.md#working-in-parallel)
and [Rift's README](https://github.com/LucaPipolo/rift#why-use-rift).

## Everyday commands

Run these from the root of the checkout you're working in:

| Command       | What it does                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `rift up`     | Start the current checkout                                                                               |
| `rift down`   | Stop the current checkout without affecting other worktrees or the shared router                         |
| `rift setup`  | Generate `.env` and start the environment. Use it for a new worktree or after changing its configuration |
| `rift status` | Show the applications registered with the router                                                         |
| `rift doctor` | Check the environment for configuration problems                                                         |

Add `-v` to a command, such as `rift up -v`, to see the full output.

Project scripts, including tests and checks, run inside the application container. You'll find the available scripts and
instructions in [CONTRIBUTING.md](CONTRIBUTING.md#running-this-site-locally).

## Security

The contact form stores personal data, so please report anything that could expose that information or weaken the site's
security, including its Content Security Policy.

**Don't open a public issue for security vulnerabilities.**
Use [GitHub's private vulnerability reporting](https://github.com/LucaPipolo/lcp-web/security/advisories/new) or contact
me as described in [SECURITY.md](SECURITY.md), which also explains what's in scope.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding conventions, tests and pull request guidelines.

## License

[MIT](./LICENSE.md)

[badge-build]: https://img.shields.io/github/actions/workflow/status/LucaPipolo/lcp-web/build.yml?branch=main&label=build&style=flat-square&logo=githubactions&logoColor=white
[badge-tests]: https://img.shields.io/github/actions/workflow/status/LucaPipolo/lcp-web/tests.yml?branch=main&label=tests&style=flat-square&logo=githubactions&logoColor=white
[badge-types]: https://img.shields.io/github/actions/workflow/status/LucaPipolo/lcp-web/types.yml?branch=main&label=types&style=flat-square&logo=githubactions&logoColor=white
[badge-lint]: https://img.shields.io/github/actions/workflow/status/LucaPipolo/lcp-web/lint.yml?branch=main&label=lint&style=flat-square&logo=githubactions&logoColor=white
[badge-codeql]: https://img.shields.io/github/actions/workflow/status/LucaPipolo/lcp-web/codeql.yml?branch=main&label=codeql&style=flat-square&logo=githubactions&logoColor=white
[badge-audit]: https://img.shields.io/github/actions/workflow/status/LucaPipolo/lcp-web/audit.yml?branch=main&label=audit&style=flat-square&logo=githubactions&logoColor=white
[workflow-build]: https://github.com/LucaPipolo/lcp-web/actions/workflows/build.yml
[workflow-tests]: https://github.com/LucaPipolo/lcp-web/actions/workflows/tests.yml
[workflow-types]: https://github.com/LucaPipolo/lcp-web/actions/workflows/types.yml
[workflow-lint]: https://github.com/LucaPipolo/lcp-web/actions/workflows/lint.yml
[workflow-codeql]: https://github.com/LucaPipolo/lcp-web/actions/workflows/codeql.yml
[workflow-audit]: https://github.com/LucaPipolo/lcp-web/actions/workflows/audit.yml
