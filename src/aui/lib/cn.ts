/**
 * @file Standard shadcn `cn()` className composer. The vendored
 * assistant-ui registry components import this from `@/lib/utils`; a
 * path alias in tsconfig and vite.config redirects that path to this
 * file so the file's name reflects its responsibility (one helper, not
 * a "utils" junk drawer).
 *
 * Post-Tailwind note (v0.9 CSS Modules migration): this used to resolve
 * conflicting Tailwind utility classes via `tailwind-merge`. Now that the
 * surface is plain CSS Modules, there is nothing for tailwind-merge to
 * merge (module class names are opaque hashed identifiers, not utility
 * atoms with overlapping CSS properties) — `cn` is a plain clsx
 * composer. The export signature is unchanged so call sites did not need
 * to change.
 */
import { clsx, type ClassValue } from "clsx";

/**
 * Compose a className from any combination of strings, arrays, and
 * conditional objects (clsx semantics).
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
