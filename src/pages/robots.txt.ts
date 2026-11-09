import type { APIContext } from "astro"

/**
 * Lets every crawler in, AI ones included, and points them at the sitemap.
 *
 * We decided against naming AI crawlers one by one because the site wants to
 * be read and cited by every one of them, and a list would only go stale as
 * new ones appear.
 */
export function GET(context: APIContext) {
  const sitemap = new URL("/sitemap.xml", context.site).href

  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
