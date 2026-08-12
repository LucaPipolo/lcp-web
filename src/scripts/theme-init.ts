import { THEME_STORAGE_KEY } from "@/libs/theme-storage"

/**
 * The theme, painted before the page is, as source text for an inline script.
 */
export const THEME_INIT_SOURCE = `(() => {
  let theme = null
  try {
    theme = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})
  } catch (error) {}
  if (theme !== "dark" && theme !== "light") {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  }
  document.documentElement.classList.toggle("dark", theme === "dark")
  document.documentElement.style.colorScheme = theme
})()`
