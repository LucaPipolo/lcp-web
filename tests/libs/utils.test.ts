import { describe, expect, it } from "vitest"

import { cn } from "@/libs/utils"

describe("cn", () => {
  it("lets the last of two conflicting utilities win", () => {
    expect(cn("h-10 px-4", "h-16")).toBe("px-4 h-16")
  })

  it("keeps the classes whose condition holds", () => {
    expect(cn("base", { hidden: false, active: true }, ["extra"])).toBe(
      "base active extra"
    )
  })

  it("drops empty and falsy values", () => {
    expect(cn("base", undefined, null, false, "")).toBe("base")
  })
})
