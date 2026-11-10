/**
 * Puts text in the form a search compares: lower case, and with its accents
 * taken off, so that `cache` finds `caché` and the other way round.
 *
 * @param text - What to normalise.
 *
 * @returns The comparable form.
 */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
}
