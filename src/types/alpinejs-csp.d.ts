/**
 * The CSP build ships no type declarations, so this types only the part of
 * Alpine the site calls, in `src/scripts/alpine.ts`.
 */
declare module "@alpinejs/csp" {
  interface Alpine {
    data(name: string, factory: () => object): void
    start(): void
  }

  const Alpine: Alpine
  export default Alpine
}
