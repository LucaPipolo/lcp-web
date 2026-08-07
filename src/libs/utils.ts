import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges class names, letting the last of two conflicting Tailwind utilities
 * win. That is what lets a caller pass `h-16` and override a component's
 * own height rather than fighting it.
 *
 * @param inputs - Class names, arrays, or conditional objects, as clsx takes.
 *
 * @returns One class string, with conflicting utilities resolved.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
