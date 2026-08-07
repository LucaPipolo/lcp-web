const PLACEHOLDER = /\{(\w+)\}/g
const AROUND_PLACEHOLDER = /(\{\w+\})/

/**
 * Fills the placeholders a content string writes as `{name}`.
 *
 * Content keeps the whole sentence rather than the pieces either side of the
 * value, because where a value belongs in a sentence is part of what a
 * translator decides.
 *
 * @param text - The string as content writes it, such as `© {year} Luca
 *   Pipolo`.
 * @param values - What to put in place of each placeholder, keyed by name.
 *
 * @returns The filled string. A placeholder with no value is left as it is
 *   rather than blanked, so a name that was mistyped shows up in the page
 *   instead of quietly leaving a hole.
 */
export function fillPlaceholders(
  text: string,
  values: Record<string, string>
): string {
  return text.replace(PLACEHOLDER, (placeholder, name) => {
    return values[name] ?? placeholder
  })
}

/**
 * Cuts a content string into the runs of text between its placeholders and the
 * placeholders themselves.
 *
 * This is the counterpart to {@link fillPlaceholders} for a placeholder that
 * stands for markup rather than for text, which a string cannot hold. The
 * caller renders each `{name}` it recognises and passes the rest through.
 *
 * @param text - The string as content writes it, such as `Made with {heart}`.
 *
 * @returns The pieces in the order the sentence puts them, placeholders
 *   included and still written as `{name}`. Empty runs are dropped, so a
 *   sentence opening or closing on a placeholder does not lead with nothing.
 */
export function splitPlaceholders(text: string): string[] {
  return text.split(AROUND_PLACEHOLDER).filter((part) => part !== "")
}
