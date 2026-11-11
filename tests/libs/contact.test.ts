import { describe, expect, it } from "vitest"

import {
  checkContact,
  checkField,
  type ContactInput,
  LIMITS,
  MAX_LINKS,
} from "@/libs/contact"

const VALID: ContactInput = {
  acknowledged: true,
  email: "ada@example.com",
  message: "I would like to talk about a project.",
  name: "Ada",
  reason: "project",
}

describe("checkField", () => {
  it("passes a value that meets every rule", () => {
    expect(checkField("name", "Ada")).toBeUndefined()
    expect(checkField("email", "ada@example.com")).toBeUndefined()
    expect(checkField("message", VALID.message)).toBeUndefined()
  })

  it("requires a value, ignoring surrounding whitespace", () => {
    expect(checkField("name", "")).toBe("required")
    expect(checkField("name", "   ")).toBe("required")
  })

  it("turns down an address that could not be replied to", () => {
    expect(checkField("email", "ada@example")).toBe("email")
    expect(checkField("email", "ada example.com")).toBe("email")
  })

  it("holds the message to its minimum length", () => {
    const min = LIMITS.message.min

    expect(checkField("message", "a".repeat(min - 1))).toBe("tooShort")
    expect(checkField("message", "a".repeat(min))).toBeUndefined()
  })

  it("holds each field to its maximum length", () => {
    expect(checkField("name", "a".repeat(LIMITS.name.max + 1))).toBe("tooLong")
    expect(checkField("name", "a".repeat(LIMITS.name.max))).toBeUndefined()
  })

  it("measures the length after trimming", () => {
    const padded = ` ${"a".repeat(LIMITS.name.max)} `

    expect(checkField("name", padded)).toBeUndefined()
  })

  it("turns down a message with more links than allowed", () => {
    const links = (count: number) =>
      `Look at these: ${Array.from({ length: count }, (_, index) => `https://example.com/${index}`).join(" ")}`

    expect(checkField("message", links(MAX_LINKS))).toBeUndefined()
    expect(checkField("message", links(MAX_LINKS + 1))).toBe("links")
  })

  it("counts links written without a scheme", () => {
    const message = "www.a.com www.b.com www.c.com www.d.com are all mine"

    expect(checkField("message", message)).toBe("links")
  })

  it("only counts links in the message", () => {
    expect(
      checkField(
        "name",
        "https://a.com https://b.com https://c.com https://d.com"
      )
    ).toBeUndefined()
  })
})

describe("checkContact", () => {
  it("returns no errors for a valid submission", () => {
    expect(checkContact(VALID)).toEqual({})
  })

  it("reports every failing field at once", () => {
    expect(
      checkContact({ ...VALID, email: "nope", message: "short", name: "" })
    ).toEqual({ email: "email", message: "tooShort", name: "required" })
  })

  it("requires one of the reasons the form offers", () => {
    expect(checkContact({ ...VALID, reason: "spam" })).toEqual({
      reason: "required",
    })
  })

  it("requires the privacy notice to be acknowledged", () => {
    expect(checkContact({ ...VALID, acknowledged: false })).toEqual({
      acknowledged: "acknowledgement",
    })
  })
})
