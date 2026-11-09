import type { Post } from "@/libs/blog"

import { getEntry } from "astro:content"

import { getSettings } from "@/libs/content"
import { DEFAULT_LOCALE, isLocale, LOCALES, localizeHref } from "@/libs/i18n"

export type SchemaNode = Record<string, unknown>

export type PageType =
  "CollectionPage" | "ContactPage" | "ProfilePage" | "WebPage"

export interface Crumb {
  href: string
  name: string
}

/**
 * Names a node the whole site shares, so every page that mentions it points
 * at one entity rather than describing a new one.
 *
 * @param site - The site's origin.
 * @param name - The node's name, such as `person`.
 *
 * @returns The node's `@id`.
 */
export function getSiteNodeId(site: URL, name: string): string {
  return new URL(`/#${name}`, site).href
}

async function getSiteNodes(site: URL, locale: string): Promise<SchemaNode[]> {
  const resolved = isLocale(locale) ? locale : DEFAULT_LOCALE
  const { author, socialLinks } = await getSettings(resolved)
  const home = await getEntry("home", resolved)
  const person = getSiteNodeId(site, "person")

  const website: SchemaNode = {
    "@type": "WebSite",
    "@id": getSiteNodeId(site, "website"),
    url: new URL("/", site).href,
    inLanguage: [...LOCALES],
    ...(author && { name: author.name, publisher: { "@id": person } }),
  }

  if (!author) return [website]

  const sections = home?.data.sections
  const role = sections?.experience?.roles[0]
  const skills = sections?.stack?.tabs.flatMap((tab) =>
    tab.groups.flatMap((group) => group.items.map((item) => item.name))
  )

  return [
    website,
    {
      "@type": "Person",
      "@id": person,
      name: author.name,
      url: new URL(localizeHref("/", resolved), site).href,
      ...(sections && { jobTitle: sections.hero.subheading }),
      ...(role && {
        worksFor: {
          "@type": "Organization",
          name: role.company,
          ...(role.companyHref && { url: role.companyHref }),
        },
      }),
      sameAs: socialLinks
        .filter((link) => link.href.startsWith("https://"))
        // A profile's address is its identity; a query only picks its language.
        .map((link) => link.href.split("?")[0]),
      ...(skills?.length && { knowsAbout: [...new Set(skills)] }),
    },
  ]
}

/**
 * Builds the structured data a page describes itself with.
 *
 * @param options.site - The site's origin.
 * @param options.locale - The page's locale.
 * @param options.url - The page's canonical URL.
 * @param options.title - The page's title.
 * @param options.description - The page's description, when it has one.
 * @param options.type - What kind of page it is.
 * @param options.nodes - Anything the page adds about itself, such as the
 *   post it carries.
 *
 * @returns The JSON-LD to put in the page, safe to inline in a `<script>`.
 */
export async function getStructuredData(options: {
  description?: string
  locale: string
  nodes?: SchemaNode[]
  site: URL
  title: string
  type: PageType
  url: string
}): Promise<string> {
  const { description, locale, nodes = [], site, title, type, url } = options
  const siteNodes = await getSiteNodes(site, locale)
  const hasPerson = siteNodes.some((node) => node["@type"] === "Person")

  const page: SchemaNode = {
    "@type": type,
    "@id": `${url}#webpage`,
    url,
    name: title,
    ...(description && { description }),
    inLanguage: locale,
    isPartOf: { "@id": getSiteNodeId(site, "website") },
    ...(type === "ProfilePage" &&
      hasPerson && { mainEntity: { "@id": getSiteNodeId(site, "person") } }),
  }

  const graph = {
    "@context": "https://schema.org",
    "@graph": [...siteNodes, page, ...nodes],
  }

  // JSON leaves `<` as it is, and a `</script>` inside a string would end the
  // block early.
  return JSON.stringify(graph).replaceAll("<", "\\u003c")
}

/**
 * Describes a post, for the page that carries it.
 *
 * @param post - The post.
 * @param url - Its canonical URL.
 * @param site - The site's origin.
 *
 * @returns The `BlogPosting` node.
 */
export function getPostNode(post: Post, url: string, site: URL): SchemaNode {
  const { title, description, published, updated, tags } = post.data
  const person = { "@id": getSiteNodeId(site, "person") }

  return {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: title,
    description,
    datePublished: published.toISOString(),
    dateModified: (updated ?? published).toISOString(),
    author: person,
    publisher: person,
    mainEntityOfPage: { "@id": `${url}#webpage` },
    ...(tags.length > 0 && { keywords: tags.join(", ") }),
  }
}

/**
 * Describes the trail from the home page down to a page.
 *
 * @param crumbs - Each step, home first, the page itself last.
 * @param site - The site's origin.
 *
 * @returns The `BreadcrumbList` node.
 */
export function getBreadcrumbNode(crumbs: Crumb[], site: URL): SchemaNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: new URL(crumb.href, site).href,
    })),
  }
}
