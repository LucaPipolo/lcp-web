---
paths:
  - "src/**/*.astro"
---

# Astro

## Components

Props configure. Slots render. A prop carries a variant, an attribute, or a small piece of config (`href`, `size`,
`variant`, `class`, `slug`...). Renderable content, however small, always arrives through a slot. No component
accepts markup or children through a prop.

### Slots

- A component with more than one distinct content region names each slot (`header`, `body`, `footer`,
  `socialLinks`...). A component that wraps exactly one thing uses the default slot.
- A required slot is checked in the frontmatter and throws if missing:

  ```ts
  if (!Astro.slots.has("heading")) {
    throw new Error("<HeroHeader> requires a `heading` slot.")
  }
  ```

  The message names the component in angle brackets and, for one slot, names it in backticks. When several slots
  share the same shape, loop instead of repeating the check:

  ```ts
  for (const slot of ["date", "readingTime"]) {
    if (!Astro.slots.has(slot)) {
      throw new Error(`<PostMeta> requires a \`${slot}\` slot.`)
    }
  }
  ```

- An optional slot is guarded with `Astro.slots.has()`, with the wrapper markup inside the guard, so an unfilled
  slot leaves nothing in the DOM.
- `Astro.slots.render()` reads a slot's rendered HTML to decide whether to show it (trims to check for
  whitespace-only content) or to reuse it elsewhere in the same file. A slot is otherwise only ever passed straight
  through as `<slot name="x" />`.

### Calling a composed component

- A child component placed into a parent's slot carries `slot="name"` on itself.
- A plain value goes in `<Fragment slot="name">`; prose containing inline markup uses `set:html`.
- Mapping an array into a slot puts `slot="name"` on each item; several items can share one slot name.

### `src/components/common/` vs `src/components/sections/`

- `common/` holds small, generic primitives. These typically extend `HTMLAttributes<T>` from `astro/types`, spread
  `...rest` to forward standard HTML attributes, and take a `class` prop merged with `cn()` (`@/libs/utils`) so a
  caller's classes win over the component's own.
- `sections/` holds one folder per page section. The folder's root file (e.g. `Hero.astro`) is the section itself;
  each part lives in its own file in the same folder, prefixed with the section's name (`HeroHeader.astro`,
  `PostMeta.astro`, `StackItem.astro`). Most take no props; when one does, it is a small config value or a `class`
  override, never renderable content.

### Naming

- Slot names are camelCase (`socialLinks`, not `social-links`).
- `.astro` component files are PascalCase; files under `src/pages/` stay lowercase, because they are URLs.
- No barrel files: import each component directly, never through an `index.ts`.

### No framework islands

This project has no React, or any other UI framework, and no `client:*` directive anywhere. All interactivity is
either Alpine (`@alpinejs/csp`, wired through `src/scripts/alpine.ts`) or a plain script in `src/scripts/`.
Structure and composition stay in `.astro`.

## Icons

Icons are never their own `.astro` component. They come from `astro-icon`'s `<Icon name="pack:name" />`
(`astro-icon/components`):

- `lucide:<name>` for interface icons (Iconify set `@iconify-json/lucide`).
- `simple-icons:<name>` for brand marks (Iconify set `@iconify-json/simple-icons`).
- `local:<name>` for a hand-authored SVG in `src/icons/`, used only when a mark exists in neither Iconify set.

## Content

Copy comes from the YAML content collections, never a hardcoded string. A component that needs a value shared
across the site reads it through `getSettings(Astro.currentLocale)` (`@/libs/content`), rather than having it
threaded down through props.
