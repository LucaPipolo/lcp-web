import { next } from "@vercel/functions"

import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_MAX_AGE,
} from "./src/libs/i18n"

export const config = { matcher: ["/", "/es", "/es/:path*"] }

const PREFIX = `/${DEFAULT_LOCALE}`

const COOKIE = new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`)

/**
 * Picks the best language the site is built in out of an `Accept-Language`
 * header, honouring its weights and disregarding its regions.
 *
 * @param header - The request's `Accept-Language`, absent on many clients.
 *
 * @returns A supported locale, or `undefined` when none was asked for.
 */
function negotiate(header: string | null) {
  if (!header) return undefined

  return header
    .split(",")
    .map((entry) => {
      const [tag, ...parameters] = entry.trim().split(";")
      const weight = parameters
        .find((parameter) => parameter.trim().startsWith("q="))
        ?.split("=")[1]

      // An entry without a weight is the most wanted one, not the least.
      return {
        language: tag.split("-")[0].toLowerCase(),
        quality: weight === undefined ? 1 : Number(weight),
      }
    })
    .filter(({ quality }) => Number.isFinite(quality) && quality > 0)
    .sort((a, b) => b.quality - a.quality)
    .find(({ language }) => isLocale(language))?.language
}

/**
 * Asks the deployment whether it serves a path.
 *
 * The edge holds no list of the site's pages, and one hard-coded here would go
 * stale the first time a page is added.
 *
 * @param request - The incoming request, for its origin.
 * @param path - The path to look for.
 *
 * @returns Whether the path is worth redirecting to. A deployment that cannot
 *   be reached answers `true`, a working redirect being the better failure.
 */
async function exists(request: Request, path: string) {
  try {
    const response = await fetch(new URL(path, request.url), {
      method: "HEAD",
      redirect: "manual",
    })

    return response.status !== 404
  } catch {
    return true
  }
}

/**
 * Settles which language a Visitor is served, ahead of the cache and so before
 * any HTML is sent.
 *
 * The root is negotiated, with a language picked from the switcher outranking
 * the browser's own list. {@link DEFAULT_LOCALE} is served at the root rather
 * than under its prefix, so `/es/…` is folded onto `/…`.
 *
 * @param request - The incoming request.
 *
 * @returns A redirect, or a pass-through leaving the page to be served as-is.
 */
export default async function middleware(request: Request) {
  const url = new URL(request.url)

  if (url.pathname === PREFIX || url.pathname.startsWith(`${PREFIX}/`)) {
    const target = url.pathname.slice(PREFIX.length) || "/"

    // Asking after the root would come straight back through here.
    if (target !== "/" && !(await exists(request, target))) return next()

    url.pathname = target

    const headers = new Headers({ Location: url.toString() })

    // Without this the root negotiates the Visitor back out of the language
    // its prefix just asked for.
    if (target === "/") {
      headers.set(
        "Set-Cookie",
        `${LOCALE_COOKIE}=${DEFAULT_LOCALE}; Path=/; Max-Age=${LOCALE_MAX_AGE}; SameSite=Lax; Secure`
      )
      headers.set("Cache-Control", "no-store")
    }

    return new Response(null, { status: 308, headers })
  }

  const chosen = COOKIE.exec(request.headers.get("cookie") ?? "")?.[1]

  const wanted = isLocale(chosen)
    ? chosen
    : negotiate(request.headers.get("accept-language"))

  // Both, or a shared cache hands one Visitor's language to the next.
  const vary = { Vary: "Accept-Language, Cookie" }

  if (!wanted || wanted === DEFAULT_LOCALE) return next({ headers: vary })

  url.pathname = `/${wanted}/`

  return new Response(null, {
    status: 307,
    headers: {
      ...vary,
      Location: url.toString(),
      "Cache-Control": "no-store",
    },
  })
}
