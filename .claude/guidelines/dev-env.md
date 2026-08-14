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

| Command              | Use                                                                              |
| -------------------- | -------------------------------------------------------------------------------- |
| `./scripts/setup.sh` | First run in this checkout, or after editing `.env`. Writes `.env`, then starts. |
| `./scripts/up.sh`    | Start this checkout.                                                             |
| `./scripts/down.sh`  | Stop it, and the shared router once nothing else uses it.                        |

All three accept `--verbose`/`-v` for full output. `setup.sh` also requires `.test` domains resolving locally and
Docker running; a failure at that step is usually a one-time host-level DNS/certificate issue, not a script bug.

```bash
docker compose exec app bun run dev|build|preview|lint|format|format:check|check:csp
```

## Git hooks

Husky's `pre-commit` (lint-staged) and `commit-msg` (commitlint) hooks run inside the container. If it is not
running, either start it first or commit with `git commit --no-verify`.
