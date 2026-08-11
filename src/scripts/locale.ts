import { LOCALE_COOKIE, LOCALE_MAX_AGE } from "@/libs/i18n"

/**
 * Records the language a Visitor picks, for the edge to read on their next
 * visit to the root.
 *
 * Following a switcher link is the only thing that counts as a choice: a
 * language reached by typing a URL, or by the redirect the root performs, says
 * nothing about what the Visitor wants next time. It is written as a cookie
 * because the decision is made in `middleware.ts`, which sees only what the
 * browser sends with the request.
 */
for (const link of document.querySelectorAll<HTMLAnchorElement>(
  "[data-locale]"
)) {
  link.addEventListener("click", () => {
    const { locale } = link.dataset
    if (!locale) return

    // Dropped over plain HTTP, which would refuse the cookie in development.
    const secure = location.protocol === "https:" ? "; Secure" : ""

    document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_MAX_AGE}; SameSite=Lax${secure}`
  })
}
