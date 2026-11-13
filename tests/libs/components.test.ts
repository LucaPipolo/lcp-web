import { describe, expect, it } from "vitest"

import { missingComponents, recover } from "@/libs/components"

describe("missingComponents", () => {
  it("lists the names the markup needs that nothing has registered", () => {
    expect(
      missingComponents(
        ["header", "commandPalette", "stack"],
        new Set(["header", "stack"])
      )
    ).toEqual(["commandPalette"])
  })

  it("lists each name once, however many elements share it", () => {
    expect(
      missingComponents(["commandPalette", "commandPalette"], new Set())
    ).toEqual(["commandPalette"])
  })

  it("is empty once every name has registered", () => {
    expect(missingComponents(["header"], new Set(["header"]))).toEqual([])
  })
})

describe("recover", () => {
  it("starts when nothing is missing", () => {
    expect(recover([], false)).toEqual({ action: "start" })
  })

  it("reloads once when a component's script never arrived", () => {
    expect(recover(["commandPalette"], false)).toEqual({ action: "reload" })
  })

  it("skips the missing components when a reload already failed to bring them", () => {
    expect(recover(["commandPalette"], true)).toEqual({
      action: "skip",
      missing: ["commandPalette"],
    })
  })
})
