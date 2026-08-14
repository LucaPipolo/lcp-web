---
name: git-commit
description: >-
  Writes, validates, and creates the commit for changes already staged in this repo, following its exact
  commit conventions.
when_to_use: >-
  Reach for this every time changes are staged and ready to commit here, not only when explicitly asked to
  word a message.
user-invocable: false
model: haiku
allowed-tools: Bash(git diff *) Bash(git log *)
---

# Writing a commit

By the time this skill runs, the commit boundary has already been decided: the right files are staged, and they
represent one atomic, self-contained change. This skill does not decide what belongs in the commit or when to
commit; it writes the message, validates it, and makes the commit.

## 1. What's staged

- Staged stat: !`git diff --staged --stat`
- Staged diff: !`git diff --staged`
- Recent history, for subject style: !`git log --oneline -10`

If the staged stat above is empty, there is nothing to commit; stop and report that rather than continuing.

## 2. Pick the type

The type enum is the standard Conventional Commits set, plus two additions configured in `commitlint.config.js`:

- `content`: website copy and translations. Touches `src/content/**/*.yaml`, or an asset referenced by content
  (a CV, an image). Real examples from this repo: `content: add legal pages`, `content: update resumes`,
  `content: add section Experience to homepage`.
- `ai`: AI tooling and configuration. Touches `CLAUDE.md` or anything under `.claude/`.
- Standard types (`feat`, `fix`, `refactor`, `style`, `docs`, `build`, `chore`...) for everything else.

`content`, `ai`, and standard-type changes never mix in one commit. If the staged diff spans more than one of
these categories, stop and report that instead of picking one and hoping: the commit boundary was drawn wrong
upstream of this skill, and only the caller can fix that.

### Dependency commits

One dependency per commit, never batched, never mixing add/remove/update:

```
build: add dependency {name} {version}
build: remove dependency {name}
build: update dependency {name} to {version}
```

Verified against this repo's own history: `build: add dependency @sentry/astro 10.70.0`,
`build: remove dependency tailwind-clamp`.

### Tooling setup

`build: setup {tool}` is for wiring in a new tool or dependency: `build: setup Husky`, `build: setup ESLint`. A
"setup" commit that is actually building a capability on top of an already-installed tool, such as a
design-token layer or an animation set, is `feat`, not `build`: `feat: setup Tailwind CSS animations`.

## 3. Write the subject

Conventional Commits, no scope, ever: `feat: add hero section`, never `feat(hero): add hero section`.
Aim for roughly 50 characters; this repo doesn't hard-enforce that length, and real subjects run up to ~60
characters when the subject genuinely needs it, but don't pad to fill space.

## 4. Decide whether it needs a body

Default to no body. Add one only when the reason behind the change is genuinely not obvious from the diff and
the subject line, such as a workaround for a specific upstream bug. Never add a body that just restates what the
diff already shows.

**Always add a trailer identifying the tool and model**, regardless of whether the commit has a body otherwise:

```
Co-Authored-By: Claude Code <noreply@anthropic.com>
Model: <this session's model short name> (<this session's model id>)
```

`Co-Authored-By` always names the harness, `Claude Code`, not the model tier. The `Model` placeholder comes from
the session actually running this commit, e.g. `Sonnet (claude-sonnet-5)` — never a stale or guessed value, and
never copied from an example in this file. Don't add a reasoning-effort or token-usage field: neither is
reliably available to this skill, and a fabricated or session-cumulative number would misrepresent the commit.
Skip both trailer lines on a `git commit --fixup=<sha>` commit — its message is auto-derived from the target
commit's subject and gets squashed away later, so there's nothing to attribute.

## 5. Validate before committing

This project runs everything through Docker, never the host:

```bash
printf 'feat: add the hero section\n\nCo-Authored-By: Claude Code <noreply@anthropic.com>\nModel: <model short name> (<model id>)\n' | docker compose exec -T app bunx commitlint
```

Substitute this session's actual model short name and id for the `Model` placeholder. Run this with the actual
message you drafted, trailer included — `footer-leading-blank` requires the blank line before it, and
`footer-max-line-length` caps each trailer line at 100 characters, which is why the tool and the model are on
separate lines rather than crammed into one. If it's rejected, fix the message and check again rather than
committing anyway.

If the container isn't running, `docker compose exec` fails outright rather than falling back to the host.
Report that clearly (name the container, point at `./scripts/up.sh`) rather than trying to route around it.

## 6. Commit

```bash
git commit -m "the subject" -m "the body, if there is one" \
  -m "Co-Authored-By: Claude Code <noreply@anthropic.com>
Model: <model short name> (<model id>)"
```

Substitute this session's actual model short name and id for the `Model` placeholder, e.g. `Sonnet
(claude-sonnet-5)`. Each `-m` becomes its own paragraph, separated by a blank line, so the trailer stays a
distinct footer block regardless of whether there's a body. Omit the trailer entirely on a `--fixup` commit
(step 4).

The repo's own `pre-commit` hook (lint-staged: `eslint --fix` + `prettier --write` on staged `.ts`/`.astro`,
`prettier --write` alone on the rest) and `commit-msg` hook (commitlint again, this time for real) still run at
commit time, inside the same container. A `pre-commit` failure usually means the staged diff had a lint error
the commitlint check in step 5 couldn't have caught; report what failed rather than force-committing around it.
