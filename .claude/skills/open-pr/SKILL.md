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

If the branch name matches `update/YYYY-MM-DD` (the `update-dependencies` skill's naming), this is a
dependency-update PR: use the title and body in step 3a below instead of writing them from scratch, then skip
straight to step 6. Otherwise continue to step 4, whatever the commits look like.

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

A deferred package (a major bump needing code changes, reported instead of committed — see
`update-dependencies`'s Boundaries) leaves no trace in git: nothing was committed for it, so it appears in no
commit and no diff. Its only source is the `update-dependencies` summary from an update pass run earlier in
this same session. Take each package's name, versions, and reason from that summary; never infer a deferral
from the commits or the diff, and never guess one.

If that summary isn't in this session's context — `/open-pr` run in a fresh session, or on a branch someone
else pushed — omit the section entirely and say nothing about deferrals. That is the correct outcome, not a
failure; there is no persisted record to go looking for.

When the summary does report a deferral, append:

```

## Deferred

- `{name}` {old version} → {new version} — {one-line reason it was deferred}
```

One bullet per deferred package the summary names, in the order it names them.

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
