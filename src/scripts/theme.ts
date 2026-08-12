import { register } from "@/scripts/alpine"
import { THEME_STORAGE_KEY } from "@/libs/theme-storage"

type Theme = "light" | "dark"

const systemQuery = window.matchMedia("(prefers-color-scheme: dark)")

declare global {
  interface Window {
    lcpTheme: {
      stored: typeof storedTheme
      clear: typeof clearThemeChoice
    }
  }
}

/**
 * Reads the theme the Visitor chose for themselves.
 *
 * @returns The stored theme, or null while they have chosen none. Storage the
 *   browser refuses to open, as private browsing does, reads as no choice.
 */
function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === "light" || value === "dark" ? value : null
  } catch {
    return null
  }
}

/**
 * Paints a theme on the document root, holding every transition on the page
 * still for the frame it takes, so the colours arrive as one instead of easing
 * there piecemeal through colours belonging to neither theme.
 *
 * @param theme - The theme to paint.
 *
 * @returns Nothing.
 */
function paintTheme(theme: Theme) {
  const root = document.documentElement

  root.setAttribute("data-theme-switching", "")

  root.classList.toggle("dark", theme === "dark")
  root.style.colorScheme = theme

  void root.offsetHeight

  root.removeAttribute("data-theme-switching")
}

/**
 * Switches to the other theme and records it as the Visitor's own choice. A
 * browser that refuses to store it still gets the switch for this page view,
 * on the grounds that forgetting beats failing.
 *
 * @returns Nothing.
 */
function toggleTheme() {
  const theme: Theme = document.documentElement.classList.contains("dark")
    ? "light"
    : "dark"

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* empty */
  }

  paintTheme(theme)
}

/**
 * Drops the Visitor's choice and hands the site back to their system.
 */
function clearThemeChoice() {
  try {
    localStorage.removeItem(THEME_STORAGE_KEY)
  } catch {
    /* empty */
  }

  paintTheme(systemQuery.matches ? "dark" : "light")
}

/**
 * Follows the system from light to dark and back, but only for a Visitor who
 * never overrode it: someone who pressed the toggle asked for one theme in
 * particular, and letting the system overrule that would undo a decision they
 * made on purpose.
 */
systemQuery.addEventListener("change", (event) => {
  if (storedTheme() !== null) return
  paintTheme(event.matches ? "dark" : "light")
})

/**
 * The toggle makes a choice and nothing on the page unmakes one, so
 * `window.lcpTheme.clear()` from a console is the way back to the system.
 */
window.lcpTheme = { stored: storedTheme, clear: clearThemeChoice }

register("themeToggle", () => ({
  /**
   * Switches the site to the other theme.
   *
   * @returns Nothing.
   */
  toggle() {
    toggleTheme()
  },
}))
