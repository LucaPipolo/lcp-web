---
paths:
  - "src/**/*.ts"
  - "middleware.ts"
---

# TypeScript conventions

## Errors

A function that can fail throws a plain `Error` whose message names the exact fix, not just what went wrong:

```ts
throw new Error(
  `No settings entry for the locale \`${resolved}\`. Add src/content/settings/${resolved}.yaml.`
)
```
