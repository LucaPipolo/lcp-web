/**
 * The look every button on the site shares, whether it is a link or a real
 * button, so the two cannot drift apart.
 */
export const BUTTON_BASE =
  "inline-flex shrink-0 cursor-pointer items-center justify-center border border-transparent text-sm font-medium whitespace-nowrap transition-all select-none active:translate-y-px [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

export const BUTTON_SIZES = {
  md: "h-10 gap-2 px-4",
  lg: "h-12 gap-2 px-5",
} as const

export const BUTTON_VARIANTS = {
  default: "bg-primary text-background hover:bg-primary/80",
  outline: "border-border bg-background hover:bg-muted hover:text-foreground",
  inverted: "bg-foreground text-background hover:bg-primary",
} as const

export type ButtonSize = keyof typeof BUTTON_SIZES
export type ButtonVariant = keyof typeof BUTTON_VARIANTS
