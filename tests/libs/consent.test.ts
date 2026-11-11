import { beforeEach, describe, expect, it, vi } from "vitest"

import { hashIp, hashProof, type Proof, readNotice } from "@/libs/consent"

import { files, resetFiles } from "../support/files"

vi.mock("node:fs/promises", () => import("../support/files"))

const PROOF: Proof = {
  id: "0b8e4f6c-1d2a-4c3b-9e5f-7a6b5c4d3e2f",
  ipHash: "ip",
  locale: "en",
  notice: "Notice",
  noticeVersion: "2026-05-01",
  page: "/en/contact/",
  purpose: "contact",
  recordedAt: "2026-11-11T12:00:00.000Z",
  userAgent: "Firefox",
}

describe("readNotice", () => {
  beforeEach(() => {
    resetFiles()
    files["src/content/pages/contact/en.yaml"] = `
form:
  acknowledgement: I've read the privacy policy.
notice:
  heading: Data protection
  items:
    - term: Data controller
      description: Luca Pipolo
    - term: Purpose
      description: Answering you
`
    files["src/content/pages/privacy/en.yaml"] = "updated: 2026-05-01\n"
  })

  it("puts the acknowledgement, the heading and each item in order, one per line", async () => {
    expect((await readNotice("en")).text).toBe(
      [
        "I've read the privacy policy.",
        "Data protection",
        "Data controller: Luca Pipolo",
        "Purpose: Answering you",
      ].join("\n")
    )
  })

  it("versions the notice by the privacy policy's last update", async () => {
    expect((await readNotice("en")).version).toBe("2026-05-01")
  })

  it("throws when a locale's content files are missing", async () => {
    await expect(readNotice("it")).rejects.toThrow("ENOENT")
  })
})

describe("hashIp", () => {
  it("gives the same address the same hash, and a different one another", () => {
    expect(hashIp("203.0.113.7", "secret")).toBe(
      hashIp("203.0.113.7", "secret")
    )
    expect(hashIp("203.0.113.7", "secret")).not.toBe(
      hashIp("203.0.113.8", "secret")
    )
  })

  it("depends on the secret, so the address can't be guessed without it", () => {
    expect(hashIp("203.0.113.7", "secret")).toMatch(/^[\da-f]{64}$/)
    expect(hashIp("203.0.113.7", "secret")).not.toBe(
      hashIp("203.0.113.7", "other")
    )
  })
})

describe("hashProof", () => {
  it("doesn't depend on the order the fields were written in", () => {
    const reversed = Object.fromEntries(
      Object.entries(PROOF).reverse()
    ) as unknown as Proof

    expect(hashProof(reversed)).toBe(hashProof(PROOF))
  })

  it("changes when any field does", () => {
    expect(hashProof({ ...PROOF, notice: "Other notice" })).not.toBe(
      hashProof(PROOF)
    )
  })
})
