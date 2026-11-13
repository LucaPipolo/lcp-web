import Alpine from "@alpinejs/csp"
import * as Sentry from "@sentry/astro"

import { missingComponents, recover } from "@/libs/components"

interface Magics {
  readonly $el: HTMLElement
  $nextTick(callback: () => void): void
  readonly $refs: Record<string, HTMLElement | undefined>
}

/** Marks a page as the reload {@link recover} asked for, for this tab only. */
const RELOADED = "alpine-reloaded"

const registered = new Set<string>()

let started = false

/**
 * Hands the page over to Alpine, which happens once and never again.
 */
function start() {
  if (started) return

  started = true
  forgetReload()
  Alpine.start()
}

/**
 * Reads the markup's list of what the page needs.
 *
 * Scripts are modules, so the document is parsed before any of them run and
 * the markup is already complete when they read it.
 *
 * @returns The names of the components still missing.
 */
function missing() {
  return missingComponents(
    [...document.querySelectorAll("[x-data]")].map(
      (element) => element.getAttribute("x-data") ?? ""
    ),
    registered
  )
}

/**
 * Tells whether this page is the reload {@link recover} asked for.
 *
 * @returns Whether it is, `true` when storage is blocked too, because without a
 *   way to remember the reload a second one could loop.
 */
function reloaded() {
  try {
    return sessionStorage.getItem(RELOADED) !== null
  } catch {
    return true
  }
}

/**
 * Clears the reload mark, so a later deploy can earn the tab another one.
 */
function forgetReload() {
  try {
    sessionStorage.removeItem(RELOADED)
  } catch {
    // Nothing was stored to forget.
  }
}

/**
 * Starts Alpine without the components no script registered, so the rest of
 * the page works and the missing ones say so once, rather than through every
 * expression inside them.
 *
 * @param names - The components to leave out.
 */
function skip(names: string[]) {
  for (const name of names) {
    for (const element of document.querySelectorAll(`[x-data="${name}"]`)) {
      // `x-ignore` alone still evaluates the element's own `x-data`.
      element.removeAttribute("x-data")
      element.setAttribute("x-ignore", "")
    }
  }

  Sentry.captureMessage(`Alpine started without: ${names.join(", ")}`, {
    level: "error",
    tags: { component: names.join(",") },
  })

  start()
}

/**
 * Settles the page once it has loaded, the point by which every script that
 * was coming has run.
 */
function settle() {
  if (started) return

  const decision = recover(missing(), reloaded())

  if (decision.action === "start") return start()
  if (decision.action === "skip") return skip(decision.missing)

  try {
    sessionStorage.setItem(RELOADED, "1")
  } catch {
    // A reload that can't be remembered could loop.
    return skip(missing())
  }

  location.reload()
}

/**
 * Registers a component, and starts Alpine once the page has all of its own.
 *
 * Sections ship their own script and know nothing of each other, so the order
 * the browser runs them in is not fixed. The markup settles it instead.
 *
 * @param name - What the markup refers to the component by, in `x-data`.
 * @param factory - Builds the component's state and methods.
 */
export function register<T extends object>(
  name: string,
  factory: () => T & ThisType<Magics & T>
) {
  Alpine.data(name, factory)
  registered.add(name)

  if (missing().length === 0) start()
}

window.addEventListener("load", settle)
