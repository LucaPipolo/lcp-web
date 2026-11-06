/**
 * Frames every snippet in a post with a bar naming its language and holding a
 * button that copies it.
 *
 * The snippets are written in Markdown and highlighted at build time, so there
 * is no component to hang the bar off: its markup is made here, once the post
 * is on the page.
 */

/** How long the button says it copied, in milliseconds. */
const CONFIRMATION = 2000

const COPY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`

const CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`

/** Languages that name no language, which the bar leaves unlabelled. */
const UNNAMED = new Set(["none", "plain", "plaintext", "text", "txt"])

const body = document.querySelector<HTMLElement>("[data-post-body]")

if (body) {
  const labels = {
    copy: body.dataset.copyCodeLabel ?? "",
    copied: body.dataset.copiedCodeLabel ?? "",
  }

  const snippets = body.querySelectorAll<HTMLPreElement>(
    "pre[class*='language-']"
  )

  for (const snippet of snippets) {
    const frame = document.createElement("div")
    frame.className = "code-block"

    const header = document.createElement("div")
    header.className = "code-header"

    const language = /language-([\w-]+)/.exec(snippet.className)?.[1]

    if (language && !UNNAMED.has(language)) {
      const label = document.createElement("span")
      label.className = "code-language"
      label.textContent = language
      header.append(label)
    }

    snippet.replaceWith(frame)
    frame.append(header, snippet)

    // Copying needs a clipboard, so a browser without one keeps the bar alone.
    if (!navigator.clipboard) continue

    const button = document.createElement("button")
    button.type = "button"
    button.className = "code-copy"
    button.innerHTML = COPY
    button.setAttribute("aria-label", labels.copy)

    let timer = 0

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(snippet.textContent ?? "")
      } catch {
        // A refused clipboard is the Visitor's decision to have made.
        return
      }

      button.innerHTML = CHECK
      button.setAttribute("aria-label", labels.copied)

      clearTimeout(timer)
      timer = window.setTimeout(() => {
        button.innerHTML = COPY
        button.setAttribute("aria-label", labels.copy)
      }, CONFIRMATION)
    })

    header.append(button)
  }
}
