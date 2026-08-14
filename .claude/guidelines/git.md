# Git

Never commit directly to `main` unless the user says so explicitly for that task.

**This overrides the default habit of asking before every commit.** While executing an approved task, commit
each atomic unit of work as it is completed, with no confirmation checkpoint per commit. This applies to
committing only: pushing, force-pushing, amending, resetting, rebasing, and every other destructive or
shared-state operation still need explicit confirmation.

A commit is atomic when checking it out alone leaves the app in a working state (the build passes, nothing
references a helper or a field that does not exist yet) and it stands for one complete, self-contained change:
never a whole feature bundled into one commit, never split so finely that a commit carries no value on its own.
Changes that depend on each other belong in the same commit; unrelated changes belong in separate ones.

Content (`src/content/**/*.yaml`) and code are always separate commits, never mixed in one. A Zod schema
validates every locale's file, so a new field cannot land in one commit and its schema in a later one without
breaking the build in between: ship the code first with the field optional, then the content for all three
locales, then, only if it must become mandatory, a follow-up commit that tightens the schema now that the values
exist. If a change genuinely cannot be split this way, stop and ask rather than bundling code and content
together.

If a later change genuinely belongs with a commit already made in this task, and that commit has not been
pushed, fix it up with `git commit --fixup=<sha>` instead of folding it into the next commit. Fixup only ever
targets a commit that already exists on the current branch: never a commit reachable only through `main` or
another branch or worktree. Never amend, never rewrite history, never run an interactive autosquash rebase;
squashing is the user's call.
