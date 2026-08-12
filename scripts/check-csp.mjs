import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

const DIST = "dist"
const CONFIG = "vercel.json"
const PLACEHOLDER = "__CSP_REPORT_URI__"

const INLINE = /<(script|style)([^>]*)>([\s\S]+?)<\/\1>/g
const SRC = /\ssrc=/
const STYLE_ATTRIBUTE = /\sstyle="/

/**
 * Reads the policy the deployment will actually send.
 *
 * @returns The `Content-Security-Policy` value declared in {@link CONFIG}.
 */
async function policy() {
  const { headers } = JSON.parse(await readFile(CONFIG, "utf8"))

  const header = headers
    .flatMap((rule) => rule.headers)
    .find(({ key }) => key.toLowerCase() === "content-security-policy")

  if (!header) throw new Error(`No Content-Security-Policy in ${CONFIG}.`)

  return header.value
}

/**
 * Walks the built site.
 *
 * @param directory - Where to start.
 *
 * @returns Every HTML file underneath it.
 */
async function pages(directory) {
  const entries = await readdir(directory, { withFileTypes: true })

  const found = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) return pages(path)

      return entry.name.endsWith(".html") ? [path] : []
    })
  )

  return found.flat()
}

/**
 * Weighs what the build inlined against what the policy allows.
 *
 * A hash the policy is missing costs the page its theme or its styling in
 * production, where nothing is watching. The build is the last place to notice.
 */
async function main() {
  const csp = await policy()
  const problems = []

  if (csp.includes(PLACEHOLDER)) {
    console.warn(
      `\nContent-Security-Policy: ${PLACEHOLDER} is still in ${CONFIG}, ` +
        `so violations go nowhere.\n`
    )
  }

  for (const page of await pages(DIST)) {
    const html = await readFile(page, "utf8")

    if (STYLE_ATTRIBUTE.test(html)) {
      problems.push(
        `${page} carries a style attribute, which style-src blocks.`
      )
    }

    for (const [, tag, attributes, body] of html.matchAll(INLINE)) {
      if (SRC.test(attributes)) continue

      const hash = createHash("sha256").update(body).digest("base64")

      if (!csp.includes(`'sha256-${hash}'`)) {
        problems.push(
          `${page} inlines a <${tag}> the policy does not allow.\n` +
            `    Add 'sha256-${hash}' to ${tag}-src in ${CONFIG}.`
        )
      }
    }
  }

  if (!problems.length) return

  console.error(`\nContent-Security-Policy is out of date:\n`)
  for (const problem of problems) console.error(`  - ${problem}`)
  console.error()

  process.exit(1)
}

await main()
