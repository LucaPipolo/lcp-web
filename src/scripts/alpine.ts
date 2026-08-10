import Alpine from "@alpinejs/csp"

interface Magics {
  readonly $el: HTMLElement
  readonly $refs: Record<string, HTMLElement | undefined>
  $nextTick(callback: () => void): void
}

const registered = new Set<string>()

let started = false

/**
 * Hands the page over to Alpine, which happens once and never again.
 *
 * Whoever completes the registry gets here first. `load` is the way out of a
 * name nobody registers: Alpine reports it, rather than the page sitting inert
 * with no clue as to why.
 */
function start() {
  if (started) return

  started = true
  Alpine.start()
}

/**
 * Weighs the markup against the registry.
 *
 * Scripts are modules, so the document is parsed before any of them run and
 * the markup can be read as the full list of what the page needs.
 *
 * @returns Whether an `x-data` still names a component nothing has registered.
 */
function waiting() {
  return [...document.querySelectorAll("[x-data]")].some(
    (element) => !registered.has(element.getAttribute("x-data") ?? "")
  )
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
  factory: () => T & ThisType<T & Magics>
) {
  Alpine.data(name, factory)
  registered.add(name)

  if (!waiting()) start()
}

window.addEventListener("load", start)
