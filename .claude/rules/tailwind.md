---
paths:
  - "src/**/*.astro"
  - "src/styles/**/*.css"
---

# Tailwind CSS

## Values

Before writing an arbitrary value (`w-[16px]`), check for an existing token instead, in this order:

1. This project's own `@theme` extensions: the fluid type scale in `_typography.css` (`--text-2xs`
   through `--text-9xl`), the spacing and width tokens in `_layout.css` (`--spacing-gutter`,
   `--spacing-header`, `--max-width-prose`, `--max-width-article`), and the palette in `_colors.css`.
2. Tailwind's own built-in scale.

An arbitrary value is for something with no scale equivalent at all, such as a `ch` unit or a sub-pixel
`outline-offset`, not a substitute for a scale step that already exists under a different name.

## Colors

Never reach for a raw palette color (`text-gray-500`) or a literal hex/oklch value in a component. Use the
semantic role aliases only: `background`, `foreground`, `primary`, `muted`, `muted-foreground`, `border`
(`_colors.css`). Dark mode is `@custom-variant dark`, toggled by adding or removing `.dark` on `<html>`; a
component never branches on the theme itself.

## Custom utilities

A pattern repeated across components becomes a named `@utility` in the relevant `src/styles/_*.css` partial
(`rise-in`, `corner-mark`, `long-form`, `rich-text`, `duotone`...) rather than the same class chain copied into
every caller.

## Conditional classes

- `class:list` for a component's own internal conditional classes, when there is no caller-supplied `class` to
  merge.
- `cn()` (`@/libs/utils`, clsx + tailwind-merge) when the component takes a `class` prop and a caller's classes
  need to win over its own.

## Config

There is no `tailwind.config.*`; everything is configured in CSS through `@theme` blocks in `src/styles/*.css`,
assembled by `global.css`. Class order is not worth hand-sorting: `prettier-plugin-tailwindcss` does it on save.
