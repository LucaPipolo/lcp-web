import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/libs/i18n"

/**
 * We decided to send a Visitor on to their own language's 404 from the
 * browser because Vercel serves one `404.html` for every missing path, and the
 * routing that could pick one per prefix cannot sit alongside `vercel.json`'s
 * `headers`. Crawlers still get the real 404 status on the original URL; only
 * people make the hop, carrying the missing path along in `from`.
 */
const FROM = "from"

const pageLocale = document.documentElement.lang
const params = new URLSearchParams(location.search)
const from = params.get(FROM)
const requested = from?.startsWith("/") ? from : location.pathname

const prefix = location.pathname.split("/")[1]
const chosen = new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`).exec(
  document.cookie
)?.[1]

const wanted = isLocale(prefix) ? prefix : isLocale(chosen) ? chosen : undefined

if (wanted && wanted !== pageLocale && !params.has(FROM)) {
  const target = wanted === DEFAULT_LOCALE ? "/404/" : `/${wanted}/404/`
  location.replace(`${target}?${FROM}=${encodeURIComponent(requested)}`)
} else {
  const output = document.querySelector<HTMLElement>("[data-not-found-path]")
  const value = output?.querySelector("code")

  if (output && value) {
    value.textContent = requested
    output.hidden = false
  }
}
