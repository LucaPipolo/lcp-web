# Development environment

## Rules

- Always run project scripts and the dev server through Docker. Never run them on the host.
- Never verify a change via `localhost:4321`; that is not where the site is served from.
- Verify a change against the current checkout's own domain instead (see Domains).
- Never hardcode a container name such as `lcp-web-app-1`. Each worktree has its own Compose project, so run
  commands from that checkout's own root and let Compose resolve it.

## Domains

The domain is derived from the checkout's own root directory name, not from where that checkout lives on disk.

- Main checkout (the one holding `.git`, not a worktree): `https://lcp-web.test`
- Any other worktree, named `<dir-name>` (its root directory's own basename, non-alphanumeric characters replaced
  with `-`): `https://<dir-name>.lcp-web.test`

If unsure which checkout you are in, run `basename "$(git rev-parse --show-toplevel)"` and use that as `<dir-name>`,
or read `BASE_DOMAIN`/`COMPOSE_PROJECT_NAME` from that checkout's own `.env`.

## Commands

Run these from the checkout's own root.

| Command       | Use                                                                              |
| ------------- | -------------------------------------------------------------------------------- |
| `rift setup`  | First run in this checkout, or after editing `.env`. Writes `.env`, then starts. |
| `rift up`     | Start this checkout.                                                             |
| `rift down`   | Stop it. Other checkouts and the shared router keep running.                     |
| `rift status` | See the apps registered with the router.                                         |
| `rift doctor` | Diagnose setup problems.                                                         |

Add `-v` for full output. `rift setup` also requires `.test` domains resolving locally and Docker running; a
failure at that step is usually a one-time host-level DNS/certificate issue, not a Rift bug.

```bash
docker compose exec app bun run dev|build|preview|test|test:coverage|lint|format|format:check|check:type|check:audit|check:csp
```

## Git hooks

Husky's `pre-commit` (lint-staged), `commit-msg` (commitlint) and `pre-push` (tests with coverage) hooks run
inside the container. If it is not running, either start it first or skip them with `git commit --no-verify` or
`git push --no-verify`.
