/**
 * @file Page-window — pure helper that picks the contiguous run of
 * numeric page-buttons surrounding the current page.
 *
 * The window is at most `maxButtons` wide (5 by default) and clamps
 * to `[1, totalPages]`. The current page sits as close to the centre
 * as the boundaries allow, so:
 *   page 1 / total 12      → [1, 2, 3, 4, 5]
 *   page 7 / total 12      → [5, 6, 7, 8, 9]
 *   page 12 / total 12     → [8, 9, 10, 11, 12]
 *
 * Pure / deterministic — exposed as its own module so the UI can
 * stay declarative and the logic can be tested without rendering.
 */

/** Compute the visible page-window around the current page. */
export function pageWindow(args: {
  readonly page: number;
  readonly totalPages: number;
  readonly maxButtons?: number;
}): readonly number[] {
  const { page, totalPages } = args;
  const max = args.maxButtons ?? 5;
  if (totalPages <= 0) {
    return [];
  }
  if (totalPages <= max) {
    return rangeInclusive(1, totalPages);
  }
  const half = Math.floor(max / 2);
  const wantStart = page - half;
  const wantEnd = page + (max - 1 - half);
  // Clamp the desired window into [1, totalPages] without resizing
  // it: pulling from one end pushes back at the other.
  if (wantStart < 1) {
    return rangeInclusive(1, max);
  }
  if (wantEnd > totalPages) {
    return rangeInclusive(totalPages - max + 1, totalPages);
  }
  return rangeInclusive(wantStart, wantEnd);
}

function rangeInclusive(from: number, to: number): readonly number[] {
  const out: number[] = [];
  for (let n = from; n <= to; n++) {
    out.push(n);
  }
  return out;
}
