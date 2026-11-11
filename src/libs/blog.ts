import type { CollectionEntry } from "astro:content"

import { getCollection } from "astro:content"

import {
  type Alternates,
  isLocale,
  type Locale,
  localizeHref,
} from "@/libs/i18n"

/** A post as one language tells it. */
export type Post = CollectionEntry<"blog">

/** The post either side of the one being read. */
export interface Neighbours {
  next?: Post
  previous?: Post
}

/** How many posts a post points to as worth reading next, at most. */
const RELATED = 3

/** How fast the reading time takes a Visitor to read, in words a minute. */
const WORDS_PER_MINUTE = 200

const FENCE = /^```/

/**
 * Reads the folder a post's file sits in, which is what ties its translations
 * together.
 *
 * @param post - The post to read.
 *
 * @returns The key, shared by every language the post was written in.
 */
export function getPostKey(post: Post): string {
  return post.id.slice(0, post.id.lastIndexOf("/"))
}

/**
 * Reads the path segment a post is served under in its own language.
 *
 * @param post - The post to read.
 *
 * @returns Its `slug`, or its key when it has none.
 */
export function getPostSlug(post: Post): string {
  return post.data.slug ?? getPostKey(post)
}

/**
 * Reads the language a post was written in from its file name.
 *
 * @param post - The post to read.
 *
 * @returns Its locale, or `undefined` for a file named after something the
 *   site is not built in, which belongs to no listing.
 */
export function getPostLocale(post: Post): Locale | undefined {
  const name = post.id.slice(post.id.lastIndexOf("/") + 1)

  return isLocale(name) ? name : undefined
}

/**
 * Points at a post in a given language.
 *
 * @param post - The post to link to.
 * @param locale - The reader's locale, which is the language the post is being
 *   listed in.
 *
 * @returns The path that language serves the post at.
 */
export function getPostHref(post: Post, locale?: string): string {
  return localizeHref(`/blog/${getPostSlug(post)}/`, locale)
}

/**
 * Lists where a post is served in each language it was written in.
 *
 * @param post - The post being read.
 * @param posts - Every published post, whatever its language.
 *
 * @returns The path of each translation, the post's own included. A language
 *   the post was not written in is left out rather than pointed at a page
 *   that does not exist.
 */
export function getPostAlternates(post: Post, posts: Post[]): Alternates {
  const key = getPostKey(post)

  return Object.fromEntries(
    posts.flatMap((candidate) => {
      const locale = getPostLocale(candidate)

      return locale && getPostKey(candidate) === key
        ? [[locale, getPostHref(candidate, locale)]]
        : []
    })
  )
}

/**
 * Points at the blog's feed in one language.
 *
 * Built from the blog's own path rather than passed to `localizeHref()`,
 * which leaves file paths unprefixed: each language has a feed of its own.
 *
 * @param locale - The reader's locale.
 *
 * @returns The path that language serves its feed at.
 */
export function getFeedHref(locale?: string): string {
  return `${localizeHref("/blog/", locale)}rss.xml`
}

/**
 * Points at the list of posts in one language, as data rather than a page,
 * for the command palette to fetch when it first opens.
 *
 * @param locale - The reader's locale.
 *
 * @returns The path that language serves its list at.
 */
export function getPostIndexHref(locale?: string): string {
  return `${localizeHref("/blog/", locale)}posts.json`
}

/** A post as the command palette lists it. */
export interface PostIndexEntry {
  href: string
  tags: string[]
  title: string
}

/**
 * Points at the blog filtered down to one tag.
 *
 * The tag rides in the query rather than the path, because the filtering
 * happens in the list itself: the blog is one page, whichever tag it shows.
 *
 * @param tag - The tag to filter by.
 * @param locale - The reader's locale.
 *
 * @returns The blog's path in that locale, with the tag in its query.
 */
export function getTagHref(tag: string, locale?: string): string {
  return `${localizeHref("/blog/", locale)}?tag=${encodeURIComponent(tag)}`
}

/**
 * Collects every tag a run of posts uses, the most used first.
 *
 * @param posts - The posts of one language.
 *
 * @returns Each tag once, ties broken alphabetically so the order is stable.
 */
export function getTags(posts: Post[]): string[] {
  const counts = new Map<string, number>()

  for (const tag of posts.flatMap((post) => post.data.tags)) {
    counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }

  return [...counts]
    .sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b))
    .map(([tag]) => tag)
}

/**
 * Collects the posts written in one language, newest first.
 *
 * A post nobody has translated yet is not a gap to fill in with another
 * language: a Visitor reading in Italian is served the Italian posts and is
 * told about no others.
 *
 * @param locale - The language to list. Anything unsupported, `undefined`
 *   included, lists nothing, because there is no sensible language to fall
 *   back to.
 *
 * @returns The posts, in the order they should be read in. Drafts are left out
 *   of the built site and kept in the dev server, where they are being written.
 */
export async function getPosts(locale?: string): Promise<Post[]> {
  if (!isLocale(locale)) return []

  const posts = await getCollection(
    "blog",
    (post) =>
      getPostLocale(post) === locale &&
      (import.meta.env.DEV || !post.data.draft)
  )

  return posts.sort(
    (a, b) => b.data.published.valueOf() - a.data.published.valueOf()
  )
}

/**
 * Weighs how long a post takes to get through.
 *
 * Everything written counts, code included, at one pace. A snippet is read
 * more slowly than a sentence and skipped more often than either, and no
 * arithmetic settles that, so the figure stays a plain one a Visitor can
 * calibrate against rather than a precise-looking guess.
 *
 * @param post - The post to weigh.
 *
 * @returns Whole minutes, never fewer than one: a post that rounds to nothing
 *   still has to be opened.
 */
export function getReadingTime(post: Post): number {
  const words = (post.body ?? "")
    .split(/\s+/)
    .filter((token) => token !== "" && !FENCE.test(token)).length

  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

/**
 * Finds what to read next, and what came before.
 *
 * @param posts - The posts of one language, as {@link getPosts} ordered them.
 * @param post - The one being read.
 *
 * @returns Its neighbours by date, each absent at the end of the run it sits
 *   at. `next` is the newer post, which is the one a Visitor who has caught up
 *   has not read.
 */
export function getNeighbours(posts: Post[], post: Post): Neighbours {
  const index = posts.findIndex((candidate) => candidate.id === post.id)

  if (index === -1) return {}

  return { next: posts[index - 1], previous: posts[index + 1] }
}

/**
 * Collects the key of every post the blog has, whatever its language.
 *
 * @returns The keys, one each however many languages a post is written in.
 */
export async function getPostKeys(): Promise<Set<string>> {
  const posts = await getCollection("blog")

  return new Set(posts.map(getPostKey))
}

/**
 * Finds the posts worth reading after this one.
 *
 * A post's own `related` list wins whenever it has one: it is a choice, and a
 * choice outranks a guess. Without one, the posts sharing the most tags with
 * it come first, the newest first among equals, and a post sharing none is
 * left out rather than offered as related when it is not.
 *
 * @param posts - The posts of one language, as {@link getPosts} ordered them.
 * @param post - The one being read.
 * @param keys - Every key the blog has in any language, as
 *   {@link getPostKeys} collects them.
 *
 * @returns Up to three posts. A key the list names that this language has no
 *   post for is passed over: it is a post not translated yet, not a mistake.
 *
 * @throws When the list names a key no post has in any language, which is a
 *   mistyped folder name the build would otherwise pass over in silence.
 */
export function getRelated(
  posts: Post[],
  post: Post,
  keys: Set<string>
): Post[] {
  const { related, tags } = post.data

  if (related && related.length > 0) {
    for (const key of related) {
      if (!keys.has(key)) {
        throw new Error(
          `The post \`${post.id}\` lists \`${key}\` as related, but no post is in that folder. Use the name of a folder in src/content/blog/.`
        )
      }
    }

    return related
      .flatMap((key) =>
        posts.filter(
          (candidate) =>
            getPostKey(candidate) === key && candidate.id !== post.id
        )
      )
      .slice(0, RELATED)
  }

  const own = new Set(tags)

  // The posts arrive newest first, and the sort is stable, so equals keep it.
  return posts
    .filter((candidate) => candidate.id !== post.id)
    .map((candidate) => ({
      candidate,
      shared: candidate.data.tags.filter((tag) => own.has(tag)).length,
    }))
    .filter(({ shared }) => shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, RELATED)
    .map(({ candidate }) => candidate)
}
