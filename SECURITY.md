# Security policy

This repository is the source of [lucapipolo.com][site]. Most of the site is
static, but its contact form stores the messages people send, and the proof of
the privacy notice they were shown, in a [Neon] database. Reports of anything
that could expose that data, or weaken the site's Content-Security-Policy, are
very welcome.

## Supported versions

Only the site as currently deployed from `main` receives security fixes. There
are no releases or older versions to patch.

## Reporting a vulnerability

Do not open a public issue. Report it privately instead:

- through [GitHub's private vulnerability reporting][report], or
- by email to [dev@lucapipolo.com](mailto:dev@lucapipolo.com).

Include:

- what an attacker could do, and under which conditions,
- the steps to reproduce it, with the URL or request involved,
- the browser and its version, if the issue happens client-side.

You will get an acknowledgement, then updates as the fix progresses. Once it is
deployed, the vulnerability is disclosed in a
[GitHub security advisory][advisories], crediting you unless you prefer
otherwise.

## Scope

In scope:

- the pages served at [lucapipolo.com][site] and their client-side scripts,
- the Vercel Functions in `api/`: the contact form, the daily data cleanup and
  the privacy notice sender,
- how contact messages and their records are stored, kept and deleted,
- the Content-Security-Policy and other headers in `vercel.json`, and the locale
  negotiation in `middleware.ts`,
- the CI workflows in `.github/workflows/`.

Out of scope, so report it to the project concerned instead:

- vulnerabilities in [Vercel], Neon, [Brevo], [Cloudflare Turnstile][turnstile]
  or other services and dependencies, unless the site's use of them causes the
  issue,
- findings from automated scanners with no demonstrated impact,
- denial of service through traffic volume, and social engineering.

[advisories]: https://github.com/LucaPipolo/lcp-web/security/advisories
[Brevo]: https://www.brevo.com/
[Neon]: https://neon.tech/
[report]: https://github.com/LucaPipolo/lcp-web/security/advisories/new
[site]: https://www.lucapipolo.com
[turnstile]: https://www.cloudflare.com/application-services/products/turnstile/
[Vercel]: https://vercel.com/
