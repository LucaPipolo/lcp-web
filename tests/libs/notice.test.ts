import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  type NoticeCopy,
  readFrame,
  readNoticeInput,
  renderNotice,
} from "@/libs/notice"

import { files, resetFiles } from "../support/files"

vi.mock("node:fs/promises", () => import("../support/files"))

const COPY: NoticeCopy = { body: "Something changed.", subject: "Update" }

const FRAME = {
  greeting: "Hi {name},",
  privacy: { href: "/en/privacy/", label: "Read the privacy policy" },
  reason: "You wrote to me.",
  rights: "Reply to object.",
  signature: "Luca",
}

describe("readNoticeInput", () => {
  const complete = { en: COPY, es: COPY, it: COPY }

  it("accepts a notice written in every language", () => {
    expect(readNoticeInput(complete)).toBe(complete)
  })

  it.each([
    ["nothing", undefined],
    ["null", null],
    ["a string", "Update"],
    ["a notice missing a language", { en: COPY, es: COPY }],
    ["a subject that isn't text", { ...complete, it: { ...COPY, subject: 1 } }],
    ["a body that isn't text", { ...complete, it: { subject: "Update" } }],
    ["a blank subject", { ...complete, it: { ...COPY, subject: "  " } }],
    ["a blank body", { ...complete, it: { ...COPY, body: "\n" } }],
  ])("rejects %s", (_, value) => {
    expect(readNoticeInput(value)).toBeUndefined()
  })
})

describe("readFrame", () => {
  beforeEach(resetFiles)

  it("reads a language's fixed copy", async () => {
    files["src/content/emails/notice/en.yaml"] = 'greeting: "Hi {name},"\n'

    expect(await readFrame("en")).toEqual({ greeting: "Hi {name}," })
  })

  it("throws when the language's file is missing", async () => {
    await expect(readFrame("it")).rejects.toThrow("ENOENT")
  })
})

describe("renderNotice", () => {
  const render = (copy: Partial<NoticeCopy> = {}, name = "Ada") =>
    renderNotice(
      "en",
      { ...COPY, ...copy },
      FRAME,
      name,
      "https://www.lucapipolo.com"
    )

  it("writes the text version: greeting, body, link, rights, reason, signature", () => {
    expect(render().text).toBe(
      [
        "Hi Ada,",
        "Something changed.",
        "Read the privacy policy: https://www.lucapipolo.com/en/privacy/",
        "Reply to object.",
        "You wrote to me.",
        "Luca",
      ].join("\n\n")
    )
  })

  it("greets them by their name, trimmed", () => {
    expect(render({}, "  Ada \n").text).toMatch(/^Hi Ada,/)
  })

  it("keeps each paragraph, folding its own line breaks into spaces", () => {
    const { text } = render({ body: "One\nline.\n\n\n  Two.  \n" })

    expect(text).toContain("Hi Ada,\n\nOne line.\n\nTwo.\n\nRead")
  })

  it("trims the subject", () => {
    expect(render({ subject: " Update \n" }).subject).toBe("Update")
  })

  it("writes the HTML version in the recipient's language, with a paragraph each", () => {
    const { html } = render({ body: "One.\n\nTwo." })

    expect(html).toContain('<html lang="en">')
    expect(html).toContain(">One.</p>")
    expect(html).toContain(">Two.</p>")
    expect(html).toContain('href="https://www.lucapipolo.com/en/privacy/"')
  })

  it("escapes what they and the notice wrote, so neither can add markup", () => {
    const { html } = render(
      { body: `<b>"Tom" & 'Jerry'</b>` },
      "<script>alert(1)</script>"
    )

    expect(html).toContain("Hi &lt;script&gt;alert(1)&lt;/script&gt;,")
    expect(html).toContain(
      "&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;"
    )
    expect(html).not.toContain("<script>")
  })
})
