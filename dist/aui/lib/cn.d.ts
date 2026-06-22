import { ClassValue } from 'clsx';
/**
 * Compose a tailwind-aware className from any combination of strings,
 * arrays, and conditional objects (clsx semantics) and resolve
 * conflicting tailwind classes via tailwind-merge.
 */
export declare function cn(...inputs: ClassValue[]): string;
