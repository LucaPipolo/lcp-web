/**
 * What to do once the page has loaded: start Alpine, reload to fetch a
 * component's script again, or start without the components still missing.
 */
export type Recovery =
  | { action: "reload" }
  | { action: "skip"; missing: string[] }
  | { action: "start" }

/**
 * Weighs the components the markup names against those registered.
 *
 * @param needed - Every `x-data` name on the page, repeats included.
 * @param registered - The names whose script has registered them.
 *
 * @returns The names still missing, each once, in the order the page needs
 *   them.
 */
export function missingComponents(
  needed: Iterable<string>,
  registered: ReadonlySet<string>
): string[] {
  return [...new Set(needed)].filter((name) => !registered.has(name))
}

/**
 * Settles what the page does when it has loaded and components are missing.
 *
 * A component's script only goes missing when the page and its scripts come
 * from different deployments, which Vercel does for a few seconds while a
 * deploy goes live. A reload fetches them from the same one again, but only
 * once: a second miss is no longer that window, and reloading again would
 * loop.
 *
 * @param missing - The components no script has registered.
 * @param reloaded - Whether this page is already the reload.
 *
 * @returns What to do.
 */
export function recover(missing: string[], reloaded: boolean): Recovery {
  if (missing.length === 0) return { action: "start" }
  if (!reloaded) return { action: "reload" }

  return { action: "skip", missing }
}
