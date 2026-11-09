import type { APIContext } from "astro"

import { renderIcon } from "@/libs/brand"

/**
 * The icons home screens and the web manifest ask for, by the size each is
 * drawn at. `apple-touch-icon` is the path iOS requests on its own.
 */
const ICONS = {
  "apple-touch-icon": 180,
  "icon-192": 192,
  "icon-512": 512,
} as const

export function getStaticPaths() {
  return Object.entries(ICONS).map(([icon, size]) => ({
    params: { icon },
    props: { size },
  }))
}

export function GET({ props }: APIContext<{ size: number }>) {
  return new Response(new Uint8Array(renderIcon(props.size)), {
    headers: { "Content-Type": "image/png" },
  })
}
