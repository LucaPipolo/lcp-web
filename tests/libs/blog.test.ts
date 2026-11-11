import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  getFeedHref,
  getNeighbours,
  getPostAlternates,
  getPostHref,
  getPostIndexHref,
  getPostKey,
  getPostKeys,
  getPostLocale,
  getPosts,
  getPostSlug,
  getReadingTime,
  getRelated,
  getTagHref,
  getTags,
} from "@/libs/blog"

import { collections, post, resetContent } from "../support/astro-content"

vi.mock("astro:content", () => import("../support/astro-content"))

describe("reading a post's file", () => {
  it("takes the key from the folder the post sits in", () => {
    expect(getPostKey(post("building-rift/en"))).toBe("building-rift")
  })

  it("serves a post under its own slug, or its key without one", () => {
    expect(
      getPostSlug(post("building-rift/es", { slug: "construyendo-rift" }))
    ).toBe("construyendo-rift")
    expect(getPostSlug(post("building-rift/en"))).toBe("building-rift")
  })

  it("takes the locale from the file name", () => {
    expect(getPostLocale(post("building-rift/it"))).toBe("it")
    expect(getPostLocale(post("building-rift/fr"))).toBeUndefined()
  })
})

describe("pointing at the blog", () => {
  it("points at a post in the given locale", () => {
    expect(getPostHref(post("building-rift/en"), "en")).toBe(
      "/en/blog/building-rift/"
    )
    expect(getPostHref(post("building-rift/es"))).toBe("/blog/building-rift/")
  })

  it("lists only the translations a post was written in", () => {
    const posts = [
      post("building-rift/es", { slug: "construyendo-rift" }),
      post("building-rift/en"),
      post("building-rift/fr"),
      post("other/it"),
    ]

    expect(getPostAlternates(posts[1], posts)).toEqual({
      en: "/en/blog/building-rift/",
      es: "/blog/construyendo-rift/",
    })
  })

  it("gives each language a feed and a post list of its own", () => {
    expect(getFeedHref("es")).toBe("/blog/rss.xml")
    expect(getFeedHref("it")).toBe("/it/blog/rss.xml")
    expect(getPostIndexHref("en")).toBe("/en/blog/posts.json")
  })

  it("filters the blog by a tag carried in the query", () => {
    expect(getTagHref("c#", "en")).toBe("/en/blog/?tag=c%23")
  })
})

describe("getTags", () => {
  it("lists each tag once, the most used first, ties alphabetically", () => {
    const posts = [
      post("a/en", { tags: ["css", "vue"] }),
      post("b/en", { tags: ["css", "bun"] }),
      post("c/en", { tags: ["css", "astro"] }),
    ]

    expect(getTags(posts)).toEqual(["css", "astro", "bun", "vue"])
  })
})

describe("getPosts", () => {
  beforeEach(() => {
    resetContent()
    collections.blog = [
      post("older/en", { published: new Date("2026-01-01") }),
      post("newer/en", { published: new Date("2026-03-01") }),
      post("draft/en", { draft: true, published: new Date("2026-02-01") }),
      post("newer/es", { published: new Date("2026-03-01") }),
    ]
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("lists the posts of one language, newest first, drafts kept in dev", async () => {
    vi.stubEnv("DEV", true)

    expect((await getPosts("en")).map(({ id }) => id)).toEqual([
      "newer/en",
      "draft/en",
      "older/en",
    ])
  })

  it("leaves drafts out of the built site", async () => {
    vi.stubEnv("DEV", false)

    expect((await getPosts("en")).map(({ id }) => id)).toEqual([
      "newer/en",
      "older/en",
    ])
  })

  it("lists nothing for an unsupported locale", async () => {
    expect(await getPosts("fr")).toEqual([])
    expect(await getPosts()).toEqual([])
  })
})

describe("getReadingTime", () => {
  it("counts every word at one pace, rounded to whole minutes", () => {
    expect(getReadingTime(post("a/en", {}, "word ".repeat(400)))).toBe(2)
  })

  it("does not count the fences around a snippet", () => {
    const body = `${"word ".repeat(300)}\n\`\`\`ts\ncode\n\`\`\``

    expect(getReadingTime(post("a/en", {}, body))).toBe(2)
  })

  it("never says less than a minute", () => {
    expect(getReadingTime(post("a/en", {}, "short"))).toBe(1)
    expect(getReadingTime(post("a/en"))).toBe(1)
  })
})

describe("getNeighbours", () => {
  const posts = [post("new/en"), post("middle/en"), post("old/en")]

  it("finds the newer and the older post", () => {
    expect(getNeighbours(posts, posts[1])).toEqual({
      next: posts[0],
      previous: posts[2],
    })
  })

  it("leaves out the side a post has nothing on", () => {
    expect(getNeighbours(posts, posts[0])).toEqual({
      next: undefined,
      previous: posts[1],
    })
  })

  it("finds nothing for a post not in the list", () => {
    expect(getNeighbours(posts, post("elsewhere/en"))).toEqual({})
  })
})

describe("getPostKeys", () => {
  beforeEach(resetContent)

  it("collects each key once, whatever the language", async () => {
    collections.blog = [post("a/en"), post("a/es"), post("b/it")]

    expect(await getPostKeys()).toEqual(new Set(["a", "b"]))
  })
})

describe("getRelated", () => {
  const keys = new Set(["a", "b", "c", "d", "e", "untranslated"])

  it("follows the post's own list, in its order", () => {
    const posts = [post("a/en"), post("b/en"), post("c/en")]
    const current = post("a/en", { related: ["c", "b"] })

    expect(getRelated(posts, current, keys).map(({ id }) => id)).toEqual([
      "c/en",
      "b/en",
    ])
  })

  it("passes over a key this language has no post for", () => {
    const posts = [post("a/en"), post("b/en")]
    const current = post("a/en", { related: ["untranslated", "b"] })

    expect(getRelated(posts, current, keys).map(({ id }) => id)).toEqual([
      "b/en",
    ])
  })

  it("throws when the list names a folder no post has", () => {
    const current = post("a/en", { related: ["typo"] })

    expect(() => getRelated([], current, keys)).toThrow(
      "The post `a/en` lists `typo` as related, but no post is in that folder."
    )
  })

  it("keeps at most three from the post's own list", () => {
    const posts = ["b", "c", "d", "e"].map((key) => post(`${key}/en`))
    const current = post("a/en", { related: ["b", "c", "d", "e"] })

    expect(getRelated(posts, current, keys)).toHaveLength(3)
  })

  it("never lists the post itself", () => {
    const posts = [post("a/en"), post("b/en")]
    const current = post("a/en", { related: ["a", "b"] })

    expect(getRelated(posts, current, keys).map(({ id }) => id)).toEqual([
      "b/en",
    ])
  })

  it("without a list, ranks by shared tags, newest first among equals", () => {
    const posts = [
      post("newest/en", { tags: ["astro"] }),
      post("both/en", { tags: ["astro", "css"] }),
      post("none/en", { tags: ["php"] }),
      post("oldest/en", { tags: ["css"] }),
    ]
    const current = post("current/en", { related: [], tags: ["astro", "css"] })

    expect(getRelated(posts, current, keys).map(({ id }) => id)).toEqual([
      "both/en",
      "newest/en",
      "oldest/en",
    ])
  })

  it("keeps at most three by shared tags", () => {
    const posts = ["b", "c", "d", "e"].map((key) =>
      post(`${key}/en`, { tags: ["astro"] })
    )

    expect(
      getRelated(posts, post("a/en", { tags: ["astro"] }), keys)
    ).toHaveLength(3)
  })
})
