/**
 * @file Standard shadcn `cn()` className composer. The vendored
 * assistant-ui registry components import this from `@/lib/utils`; a
 * path alias in tsconfig and vite.config redirects that path to this
 * file so the file's name reflects its responsibility (one helper, not
 * a "utils" junk drawer).
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose a tailwind-aware className from any combination of strings,
 * arrays, and conditional objects (clsx semantics) and resolve
 * conflicting tailwind classes via tailwind-merge.
 */


export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
