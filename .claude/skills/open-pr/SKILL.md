---
name: open-pr
description: >-
  Opens a GitHub pull request for the current branch against `main`, generating the title and body from its
  commits and diff to match this repo's exact PR template (a Context bullet list plus a numbered Verification
  Plan). Only reachable via the /open-pr slash command; never invoke this on your own.
disable-model-invocation: true
model: sonnet
allowed-tools: Bash(git status *) Bash(git log *) Bash(git diff *)
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

## 3. Write the title

A short, imperative, sentence-case phrase, no trailing period, summarizing the branch as a whole rather than
restating one commit: `Add legal pages`, `Enforce Content-Security-Policy`, `Add Vercel Speed Insights`. Not
prefixed with a Conventional Commits type; that convention is for commits, not PR titles.

## 4. Write the body

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

## 5. Open it

```bash
gh pr create --base main --title "the title" --body "the body"
```
