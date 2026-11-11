/**
 * A stand-in for `node:fs/promises`, for modules that read content files at
 * request time. A test registers it with
 * `vi.mock("node:fs/promises", () => import(...))` and fills {@link files} with
 * the files it needs, keyed by their path from the project root, so it never
 * depends on copy in `src/content/` that changes on its own.
 */

import { relative } from "node:path"

export const files: Record<string, string> = {}

/**
 * Empties every file, so no test sees another's.
 */
export function resetFiles(): void {
  for (const path of Object.keys(files)) delete files[path]
}

/**
 * Reads a file.
 *
 * @param path - Its absolute path.
 *
 * @returns Its contents.
 *
 * @throws Like the real one, when there's no file at that path.
 */
export async function readFile(path: string): Promise<string> {
  const file = files[relative(process.cwd(), path)]

  if (file === undefined) {
    throw Object.assign(new Error(`ENOENT: no such file, open '${path}'`), {
      code: "ENOENT",
    })
  }

  return file
}
