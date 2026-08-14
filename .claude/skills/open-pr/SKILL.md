---
name: open-pr
description: >-
  Opens a GitHub pull request for the current branch against `main`, generating the title and body from its
  commits and diff to match this repo's exact PR template (a Context bullet list plus a numbered Verification
  Plan).
when_to_use: >-
  Once the current branch's commits are pushed and ready for review. Only reachable via the /open-pr slash
  command; never invoke this on your own.
disable-model-invocation: true
model: sonnet
allowed-tools: Bash(git status *) Bash(git log *) Bash(git diff *) Bash(git show *)
---

# Opening a PR

## 1. Check the branch is pushed

- Status: !`git status -sb`

If the branch has no upstream, or has local commits the remote doesn't have yet, stop and ask the user to push
before continuing. Never push, and never force-push, on their behalf; that stays a manual, confirmed step even
though this skill itself was invoked manually.

## 2. Read what the branch actually did

- Commits: !`git log main..HEAD --oneline`
- Diff stat: !`git diff main...HEAD --stat`

Read the diff itself for anything the commit subjects don't make obvious.

## 3. Detect a dependency-update branch

If the branch name matches `update/YYYY-MM-DD` (the `update-dependencies` skill's naming) or every commit on it
follows `build: update dependency {name} to {version}`, this is a dependency-update PR: use the title and body
in step 3a below instead of writing them from scratch, then skip straight to step 6. Otherwise continue to
step 4.

### 3a. Dependency-update title and body

**Title:** `Run {date} updates`, where `{date}` is the `YYYY-MM-DD` from the branch name (e.g.
`Run 2026-08-14 updates`).

**Body:**

```
## Updated

| Package | From | To |
|---|---|---|
| `{name}` | {old version} | {new version} |
...
```

One row per commit, in commit order. For each commit, read its diff (`git show {sha} -- package.json`) to get
the exact old and new version numbers for that package; never the semver range.

If any package was deferred during the update pass (a major bump needing code changes, reported instead of
committed — see `update-dependencies`'s Boundaries), append:

```

## Deferred

- `{name}` {old version} → {new version} — {one-line reason it was deferred}
```

One bullet per deferred package. Omit this section entirely when nothing was deferred.

Skip step 5 below and open the PR with this title and body.

## 4. Write the title

A short, imperative, sentence-case phrase, no trailing period, summarizing the branch as a whole rather than
restating one commit: `Add legal pages`, `Enforce Content-Security-Policy`, `Add Vercel Speed Insights`. Not
prefixed with a Conventional Commits type; that convention is for commits, not PR titles.

## 5. Write the body

Exactly this template. Never add a section beyond these two:

```
## Context

- {what changed, one bullet per distinct piece, each a complete sentence starting with a present-tense verb}

## Verification Plan

1. {a concrete, specific manual step a reviewer would take to confirm the change works}
2. ...
```

- **Context** bullets describe what was added or changed, not why: "Adds a `Content-Security-Policy` header
  locking the site down to same-origin scripts...", "Adds two reusable components used by it: `SectionHeading`,
  with an optional actions slot, and `CardGrid`." Reference the real file, component, and collection names from
  the diff, not vague summaries.
- **Verification Plan** steps are concrete and actionable, phrased as instructions: "Open the homepage and
  confirm the section renders below the hero", "Load each locale and confirm the heading... are translated."
  Cover every locale when the change touches content, every affected page when it touches a shared component, and
  any edge case the diff suggests (a missing field, a narrow viewport, a deliberately triggered failure).

## 6. Open it

```bash
gh pr create --base main --title "the title" --body "the body"
```
