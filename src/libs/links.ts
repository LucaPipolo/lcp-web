/** The id of the hidden note that describes every link opening a new tab. */
export const NEW_TAB_HINT_ID = "new-tab"

/**
 * Strips the `www.` a host may or may not be written with.
 *
 * @param host - A hostname.
 *
 * @returns The same host without its `www.`.
 */
function bareHost(host: string): string {
  return host.replace(/^www\./, "")
}

/**
 * Tells whether a link leaves the site, which is what decides it opens in a
 * new tab.
 *
 * @param href - The link, absolute or relative.
 * @param site - The site's own address.
 *
 * @returns Whether it points at another host over the web.
 */
export function isExternalHref(href: string, site: string): boolean {
  if (!/^https?:\/\//i.test(href)) return false

  return bareHost(new URL(href).hostname) !== bareHost(new URL(site).hostname)
}
