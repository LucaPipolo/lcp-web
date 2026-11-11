import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { deleteExpiredMessages, deleteExpiredProofs } from "@/libs/storage"

import cleanup from "../../api/cleanup"

vi.mock("@/libs/storage", () => ({
  deleteExpiredMessages: vi.fn(),
  deleteExpiredProofs: vi.fn(),
}))

/**
 * Calls the job the way Vercel's scheduler does.
 *
 * @param authorization - The `Authorization` header, if any.
 *
 * @returns The job's response.
 */
function run(authorization?: string): Promise<Response> {
  return cleanup.fetch(
    new Request("https://www.lucapipolo.com/api/cleanup/", {
      headers: authorization ? { authorization } : {},
    })
  )
}

describe("api/cleanup", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "cron")
    vi.mocked(deleteExpiredMessages).mockResolvedValue(2)
    vi.mocked(deleteExpiredProofs).mockResolvedValue(1)
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("deletes what has expired in both databases, and reports the counts", async () => {
    const response = await run("Bearer cron")

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(await response.json()).toEqual({ messages: 2, proofs: 1 })
  })

  it.each([
    ["no secret", undefined],
    ["the wrong secret", "Bearer guess"],
  ])("refuses a call with %s", async (_, authorization) => {
    const response = await run(authorization)

    expect(response.status).toBe(401)
    expect(deleteExpiredMessages).not.toHaveBeenCalled()
  })

  it("refuses every call when no secret is set, rather than run unguarded", async () => {
    vi.stubEnv("CRON_SECRET", undefined)

    expect((await run("Bearer undefined")).status).toBe(401)
    expect(deleteExpiredMessages).not.toHaveBeenCalled()
  })

  it("still cleans one database when the other fails, and reports the failure", async () => {
    const error = new Error("Connection refused")

    vi.mocked(deleteExpiredProofs).mockRejectedValue(error)

    const response = await run("Bearer cron")

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ messages: 2, proofs: "failed" })
    expect(console.error).toHaveBeenCalledWith(error)
  })
})
