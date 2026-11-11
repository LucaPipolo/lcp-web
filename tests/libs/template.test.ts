import { describe, expect, it } from "vitest"

import { fillPlaceholders, splitPlaceholders } from "@/libs/template"

describe("fillPlaceholders", () => {
  it("puts each value in place of its placeholder", () => {
    expect(
      fillPlaceholders("© {year} {name}", { name: "Luca Pipolo", year: "2026" })
    ).toBe("© 2026 Luca Pipolo")
  })

  it("fills every occurrence of the same placeholder", () => {
    expect(fillPlaceholders("{a} and {a}", { a: "x" })).toBe("x and x")
  })

  it("leaves a placeholder with no value as it is", () => {
    expect(fillPlaceholders("Hello {nmae}", { name: "Luca" })).toBe(
      "Hello {nmae}"
    )
  })

  it("returns text without placeholders unchanged", () => {
    expect(fillPlaceholders("Plain text", { name: "Luca" })).toBe("Plain text")
  })
})

describe("splitPlaceholders", () => {
  it("cuts text into the runs around each placeholder", () => {
    expect(splitPlaceholders("Made with {heart} in {city}")).toEqual([
      "Made with ",
      "{heart}",
      " in ",
      "{city}",
    ])
  })

  it("drops the empty runs at either end", () => {
    expect(splitPlaceholders("{heart} made")).toEqual(["{heart}", " made"])
    expect(splitPlaceholders("made {heart}")).toEqual(["made ", "{heart}"])
  })

  it("returns text without placeholders as a single piece", () => {
    expect(splitPlaceholders("Plain text")).toEqual(["Plain text"])
  })
})
