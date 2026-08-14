---
name: address-pr-comments
description: >-
  Fetches the unresolved inline review comments on a PR — the current branch's by default, or a specific one
  given as an argument (e.g. /address-pr-comments 19) — evaluates each one, and either fixes the code it flags
  (committing the fix, never pushing) or replies to it explaining in plain terms why it doesn't apply. Only
  reachable via the /address-pr-comments slash command; never invoke this on your own.
disable-model-invocation: true
context: fork
model: sonnet
arguments: [pr]
allowed-tools: Bash(gh *) Bash(git branch *)
---

# Addressing PR review comments

This currently targets the automated review left by Codex, the bot account `chatgpt-codex-connector`, which
leaves inline comments tied to a specific file and line. This skill works through the unresolved ones only; a
thread already marked resolved is left alone.

## 1. Find the PR and its unresolved review threads

```!
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
PR="$pr"
if [ -z "$PR" ]; then
  PR=$(gh pr view --json number -q .number 2>/dev/null)
fi
if [ -z "$PR" ]; then
  echo "No PR found for the current branch, and no PR number was given. Stop and ask which PR to target."
else
  HEAD_REF=$(gh pr view "$PR" --repo "$REPO" --json headRefName -q .headRefName 2>/dev/null)
  CURRENT=$(git branch --show-current)
  echo "Owner: ${REPO%/*}"
  echo "Repo name: ${REPO#*/}"
  echo "PR: $PR"
  if [ -z "$HEAD_REF" ]; then
    echo "Could not find PR #$PR in $REPO. Stop and report that."
  elif [ "$HEAD_REF" = "$CURRENT" ]; then
    echo "Head branch matches this checkout ($CURRENT). OK to fix code here."
  else
    echo "MISMATCH: PR #$PR's branch ($HEAD_REF) isn't checked out here ($CURRENT). Stop and tell the user to check out $HEAD_REF first, rather than fixing anything."
  fi
fi
```

`$pr` is the argument when `/address-pr-comments <number>` was used, and an empty string otherwise, so the
block above always resolves the right owner, repo, and PR, and always checks the head branch, whether the PR
came from the argument or from the current branch. Stop here on either message above rather than continuing to
steps 3 to 4: those read and fix the code in this checkout, so a missing PR or a branch mismatch both mean
proceeding would be wrong.

Using the owner, repo, and PR resolved above:

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            comments(first: 50) {
              nodes { databaseId author { login } body path line }
            }
          }
        }
      }
    }
  }' -f owner="<owner>" -f repo="<repo>" -F number="<PR>"
```

Keep only threads where `isResolved` is false and the first comment's `author.login` is
`chatgpt-codex-connector`.

## 2. Evaluate each one on its current merits

Read the comment against the code as it stands now, not as Codex saw it: the branch may have moved since the
review ran. Decide plainly whether the concern still holds.

## 3. If it's valid, fix it, then commit, never push

Make the code change. Then decide how to commit it, per this repo's git guidelines
(`.claude/guidelines/git.md`):

- If the fix genuinely belongs with a commit already on this branch, fix it up directly:
  `git commit --fixup=<sha>`. The target commit must already exist on the current branch; never fix up a commit
  reachable only through `main` or another branch or worktree.
- Otherwise, hand off to the `git-commit` skill to write a proper new commit.

Never push. Pushing is the user's call, not this skill's.

## 4. If it's not valid, reply, don't touch the code

Explain why in plain, human-readable language, addressed to the actual point Codex raised, not a generic
dismissal. Reply on the specific thread, not as a general PR comment:

```bash
gh api "repos/<owner>/<repo>/pulls/<PR>/comments/<databaseId>/replies" -f body="the explanation"
```

`<databaseId>` is the Codex comment's own `databaseId` from the GraphQL query in step 1, not the thread's `id`.

## 5. Leave resolving the conversation to the human

Fixing the code or replying does not mark the thread resolved. That stays a manual step in the GitHub UI.
