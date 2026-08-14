---
paths:
  - "src/**/*.astro"
  - "src/**/*.ts"
  - "middleware.ts"
---

# Comments

A comment explains code from a bird's-eye view: intent, and why, never a step-by-step restatement of what the
next line already says. If a comment could be deleted after reading the code once, delete it. Never add one
indiscriminately, on every function or every block out of habit; most lines need none. Keep the ones that remain
short: a comment that goes deep into implementation detail has usually drifted into restating the code.

## Functions and methods

Every exported function or method gets a doc block, `@param`/`@returns`/`@throws` where applicable (skip a tag
that doesn't apply; never write `@returns` on a function that returns nothing). The title starts with a verb,
third-person present tense, matching every title already in this codebase: `Builds`, `Puts`, `Resolves`,
`Registers`, `Narrows`, never a noun phrase. Verified pattern, from `src/libs/content.ts`:

```ts
/**
 * Builds the static paths for a page from a collection holding one entry per
 * locale.
 *
 * The default locale gets `undefined` as its route param, which is what keeps
 * it served without a prefix, and an entry whose id is not a locale produces
 * no route at all.
 *
 * @param collection - The collection to build the routes from, holding one
 *   YAML file per locale and named after it.
 *
 * @returns One path per locale, each carrying its entry as a prop.
 *
 * @throws When a locale has no entry, because the alternative is that locale
 *   quietly disappearing from the built site.
 */
```

A one-line title is enough when it already says everything worth knowing; add a description only when the title
alone leaves something genuinely unclear. Verified pattern, from `src/scripts/code-copy.ts`:

```ts
/**
 * Puts a copy button on every snippet in a post.
 */
```

## Inline comments

Outside a doc block, a `//` comment is for the rare line where the code alone doesn't explain itself: a
non-obvious constraint, a workaround, an edge case a reader would otherwise trip over. Two lines at most, and it
explains why, not what the next line does. Verified pattern, from `src/scripts/post-toc.ts`:

```ts
// The headings themselves are read, never written, and are kept out of the
// component's state: the CSP build refuses property assignments on DOM
// objects, and there is nothing to gain from making these reactive.
```

If code exists because of something found online, a PR, an issue, a changelog entry, link it with `@see` rather
than re-explaining the reasoning inline:

```ts
// @see https://github.com/withastro/astro/issues/1234
```

## Architectural comments

A comment about a design decision rather than one function follows the same bar as everywhere else: bird's-eye,
short, only where the code genuinely can't explain itself. State the decision first, then why it was made: "We
decided {choice} because {reason}," followed by further context only if the reason alone leaves something
unclear:

```ts
/**
 * We decided to cap the retry queue at three attempts because past that, a
 * stuck job is more likely a bad payload than a slow dependency, and a queue
 * that never gives up hides that difference.
 */
```

## In short

Not too many comments. The ones that exist are short, in plain language, and earn their place.
