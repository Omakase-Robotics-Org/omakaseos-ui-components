import { describe, expect, it } from "vitest";
import { pageWindow } from "./page-window";

describe("pageWindow", () => {
  it("returns an empty window when totalPages <= 0", () => {
    expect(pageWindow({ page: 1, totalPages: 0 })).toEqual([]);
    expect(pageWindow({ page: 1, totalPages: -3 })).toEqual([]);
  });

  it("returns every page when totalPages fits within the cap", () => {
    expect(pageWindow({ page: 1, totalPages: 5 })).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow({ page: 3, totalPages: 5 })).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow({ page: 1, totalPages: 1 })).toEqual([1]);
  });

  it("clamps at the LOW end without resizing the window (first page reachable)", () => {
    expect(pageWindow({ page: 1, totalPages: 12 })).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow({ page: 2, totalPages: 12 })).toEqual([1, 2, 3, 4, 5]);
  });

  it("clamps at the HIGH end without resizing the window (last page reachable)", () => {
    expect(pageWindow({ page: 12, totalPages: 12 })).toEqual([8, 9, 10, 11, 12]);
    expect(pageWindow({ page: 11, totalPages: 12 })).toEqual([8, 9, 10, 11, 12]);
  });

  it("centers the window around the current page in the middle range", () => {
    expect(pageWindow({ page: 7, totalPages: 12 })).toEqual([5, 6, 7, 8, 9]);
    expect(pageWindow({ page: 6, totalPages: 12 })).toEqual([4, 5, 6, 7, 8]);
  });

  it("respects a custom maxButtons cap", () => {
    expect(pageWindow({ page: 5, totalPages: 20, maxButtons: 3 })).toEqual([4, 5, 6]);
    expect(pageWindow({ page: 1, totalPages: 20, maxButtons: 3 })).toEqual([1, 2, 3]);
    expect(pageWindow({ page: 20, totalPages: 20, maxButtons: 3 })).toEqual([18, 19, 20]);
  });

  it("never returns a window wider than maxButtons, even when totalPages is huge", () => {
    const window = pageWindow({ page: 500, totalPages: 10_000 });
    expect(window.length).toBe(5);
    expect(window).toEqual([498, 499, 500, 501, 502]);
  });

  it("handles an odd maxButtons > 5 by keeping the current page as close to centre as the boundary allows", () => {
    expect(pageWindow({ page: 50, totalPages: 100, maxButtons: 7 })).toEqual([
      47, 48, 49, 50, 51, 52, 53,
    ]);
  });
});
