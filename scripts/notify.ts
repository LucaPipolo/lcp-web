/**
 * Triggers `api/notify` with a notice written in a YAML file.
 *
 * We decided to send from Vercel rather than from this machine, because the
 * database and Brevo keys are Sensitive variables Vercel never hands out:
 * this script only carries the notice and `PRIVACY_NOTICE_SECRET`.
 *
 * Usage, from the repository root (see CONTRIBUTING.md):
 *
 *   docker compose exec -e PRIVACY_NOTICE_SECRET -e VERCEL_AUTOMATION_BYPASS_SECRET \
 *     app bun run notify <file> [--test | --send]
 *
 * Without a flag it's a dry run: it counts the recipients and sends nothing.
 */

import { readFile } from "node:fs/promises"
import { parse } from "yaml"

const DEFAULT_URL = "https://www.lucapipolo.com/api/notify/"

const [file, flag] = process.argv.slice(2)
const mode = flag === "--send" ? "send" : flag === "--test" ? "test" : "dry-run"
const secret = process.env.PRIVACY_NOTICE_SECRET
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
const url = process.env.NOTIFY_URL ?? DEFAULT_URL

if (!file || (flag && !["--send", "--test"].includes(flag))) {
  console.error(
    "Usage: bun run notify <notice.yaml> [--test | --send]. Without a flag, nothing is sent."
  )
  process.exit(1)
}

if (!secret) {
  console.error(
    "No PRIVACY_NOTICE_SECRET. Export it in your shell and pass it with `docker compose exec -e PRIVACY_NOTICE_SECRET`."
  )
  process.exit(1)
}

const notice = parse(await readFile(file, "utf8"))
const headers: Record<string, string> = {
  Authorization: `Bearer ${secret}`,
  "Content-Type": "application/json",
}

// Vercel's bot protection challenges anything that isn't a browser, and a
// preview also sits behind Vercel Authentication. The project's automation
// bypass secret gets past both, on every plan.
if (bypass) headers["x-vercel-protection-bypass"] = bypass

console.log(`${mode} → ${url}`)

const response = await fetch(url, {
  body: JSON.stringify({ mode, notice }),
  headers,
  method: "POST",
})
const mitigated = response.headers.get("x-vercel-mitigated")

if (mitigated) {
  console.error(
    `${response.status}: Vercel's bot protection stopped the request (${mitigated}). Set VERCEL_AUTOMATION_BYPASS_SECRET and pass it with \`-e\`, as CONTRIBUTING.md describes.`
  )
} else if (response.headers.get("content-type")?.includes("json")) {
  console.log(response.status, JSON.stringify(await response.json(), null, 2))
} else {
  // Anything else is a Vercel page (a 404 before the deploy, an error), not
  // the endpoint's answer, so only its status is worth showing.
  console.error(
    `${response.status}: not an answer from api/notify. Is it deployed at ${url}?`
  )
}

process.exit(response.ok ? 0 : 1)
