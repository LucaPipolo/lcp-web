---
paths:
  - "src/libs/**"
  - "api/**"
  - "tests/**"
  - "vitest.config.ts"
---

# Tests

Unit tests run on [Vitest](https://vitest.dev/), configured in `vitest.config.ts` through Astro's `getViteConfig()`,
so a test resolves `@/` and loads modules the way the build does.

## Where they go

`tests/` mirrors the source: `src/libs/i18n.ts` is tested in `tests/libs/i18n.test.ts`, `api/contact.ts` in
`tests/api/contact.test.ts`. Never put a test inside `api/`: Vercel deploys every file there as a function, so it
would ship as a public endpoint.

## Coverage

Every file listed in `coverage.include` is held to 100% lines, branches, functions and statements, each file on its
own. A module joins that list in the same commit that adds its tests, never before, or the run fails.

When a branch can't be reached by any input, it is dead code: remove it in its own `refactor:` commit ahead of the
tests, and check the built site is unchanged. Never silence it with an ignore comment.

A module that only holds constants gets no test; one that could only repeat the values back catches nothing.

## What a test does

- Test what the code promises, as its doc block states it: the edge cases it names are the tests to write.
- Run the real thing where it is cheap: Markdown goes through `satteri` with the site's plugins, not a hand-made
  tree. Mock only what leaves the process, such as `fetch` (`vi.stubGlobal`), environment variables
  (`vi.stubEnv`) and the database client, and undo it in `afterEach`.
- Code that reads content collections runs against `tests/support/astro-content.ts`, a stand-in for
  `astro:content` that each test fills with only the entries it needs, never against `src/content/`, which changes
  whenever the copy does. Build posts with its `post()` helper.
- Before trusting a new test, see it fail: break the code or the expectation once. A test that passes for the wrong
  reason, such as raw HTML that never reaches the plugin under test, hides the gap it was meant to close.
- Name each test as a plain sentence about behaviour: `leaves a placeholder with no value as it is`.

## Running them

```bash
docker compose exec app bun run test
docker compose exec app bun run test:coverage
```

The `pre-push` hook runs `test:coverage`, and so does CI on every push and pull request.
