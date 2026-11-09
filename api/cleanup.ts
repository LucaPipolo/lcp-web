import {
  deleteExpiredMessages,
  deleteExpiredProofs,
} from "../src/libs/storage.js"

/**
 * We decided to delete expired data from a daily Vercel Cron Job rather than
 * on each new message, because a form nobody uses for a year would otherwise
 * keep last year's messages past the date the privacy policy promises.
 */

export default {
  /**
   * Deletes what's been kept longer than the privacy policy allows.
   *
   * @param request - Vercel's scheduled call, carrying `CRON_SECRET`.
   *
   * @returns How many rows each database lost, or why it couldn't run.
   */
  async fetch(request: Request): Promise<Response> {
    const secret = process.env.CRON_SECRET

    // Without the secret set, anyone could trigger it; refusing is safer
    // than running unguarded.
    if (
      !secret ||
      request.headers.get("authorization") !== `Bearer ${secret}`
    ) {
      return new Response(null, { status: 401 })
    }

    const [messages, proofs] = await Promise.allSettled([
      deleteExpiredMessages(),
      deleteExpiredProofs(),
    ])

    const report = Object.fromEntries(
      Object.entries({ messages, proofs }).map(([name, outcome]) => {
        if (outcome.status === "fulfilled") return [name, outcome.value]

        console.error(outcome.reason)

        return [name, "failed"]
      })
    )

    const failed = Object.values(report).includes("failed")

    return Response.json(report, {
      headers: { "Cache-Control": "no-store" },
      status: failed ? 500 : 200,
    })
  },
}
