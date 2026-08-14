---
paths:
  - "README.md"
---

# Human docs

`README.md` is a developer's guide to this repository: someone reading the code, setting it up locally, or
forking it. It is not the place for architecture notes, AI-tooling context, or anything that belongs in
`CLAUDE.md` or `.claude/`; those serve a different reader, and the two documents are meant to drift apart, not
mirror each other.

## What it covers

- What the project is, plainly stated, for a reader who doesn't know it yet.
- The tech stack.
- The project structure.
- How to run it locally.
- The AI tooling this repo ships and expects a human to reach for directly: skills invoked manually as slash
  commands (not the ones Claude reaches for on its own), and any MCP server configured for this project
  specifically.

Anything beyond this list needs a reason to exist here rather than in `CLAUDE.md` or in the code itself.

## Voice

Plain facts, the same standard as the site's own copy: no invented colour, no marketing adjectives ("powerful",
"seamless", "blazing fast"), no "why choose this project" framing, no badges, no emoji, no demo GIFs. This is a
developer's reference, not a landing page; state what's true and let a reader evaluating whether to run or fork
this decide for themselves. Explain the why behind a constraint when it saves the reader from guessing, the same
as everywhere else in this project. Verified pattern, already in this file:

> Syntax highlighting uses Prism rather than Shiki, because Shiki writes its colours into `style` attributes and
> the site's `style-src 'self'` policy blocks those, and `bun run check:csp` fails the build over one.

Never use an em dash (—) or an en dash (–). Rewrite the sentence instead.

## Structure

- No `#` title. GitHub renders the repository name as the page heading already; a duplicate first-level heading
  is dead weight.
- Organize by what a reader is actually trying to do (`Running this site locally`, `Writing a post`), not by
  feature list or category.
- A warning or a caveat worth a reader's attention becomes a GitHub admonition, `> [!CAUTION]` or `> [!NOTE]`,
  not bold text buried in a paragraph.
- A sequence a reader follows once, such as install, clone, run, is a numbered list. A reference a reader scans,
  such as which command does what, is a table.
- Every command, filename, and path is inline code, and copy-pasteable as written: a reader should never have to
  guess what to substitute. A multi-line example is a fenced code block with a language tag (`bash`, `yaml`); a
  directory layout is a fenced block with none.
- Every mention of a technology, tool, named pattern, or architecture (Astro, Docker, a git hook, TDD) links to
  it: its official site for a technology or tool, a real reference (MDN, a language spec, a well-known write-up)
  for a pattern or architecture. A reader should never have to leave to search for what something is.
- The `Tech stack` list names each technology as it's actually known (`TypeScript`, not `typescript`), never a
  package identifier, and never a version number; that belongs in `CLAUDE.md`, not here. List only what a reader
  evaluating the project would recognize as the stack, not every dev-tooling dependency (a linter, a formatter,
  a git hook runner).

## What stays out

- No comment inside a code block explaining what the line above it already shows.
- No exhaustive option or config reference; that duplicates what the file itself already documents, such as a
  schema or a config file's own comments. Link to the file instead of restating it.
- Nothing that only matters to an AI agent working in this repo. That belongs in `CLAUDE.md` instead.
- No badge, no screenshot, no demo GIF, no acknowledgments section. None of that serves a developer deciding
  whether to run or fork this.
