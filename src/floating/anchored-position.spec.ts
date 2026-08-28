/**
 * @file Byte-identical pin: `anchoredPanelPosition` against the dashboard's
 * `panelPosition` (`.codex/ref/Popover.tsx` / `.codex/ref/Menu.tsx` —
 * verbatim identical between the two refs).
 *
 * Every case below is hand-derived from the ref algorithm, reproduced here
 * for cross-reference:
 *
 * ```
 * function panelPosition(anchor, panel, align) {
 *   const rect = anchor.getBoundingClientRect();
 *   const panelHeight = panel.offsetHeight;
 *   const panelWidth = panel.offsetWidth;
 *   const belowTop = rect.bottom + PANEL_OFFSET;         // PANEL_OFFSET = 4
 *   const fitsBelow = belowTop + panelHeight <= window.innerHeight;
 *   const top = fitsBelow ? belowTop : Math.max(0, rect.top - PANEL_OFFSET - panelHeight);
 *   const maxLeft = window.innerWidth - panelWidth - VIEWPORT_MARGIN; // VIEWPORT_MARGIN = 8
 *   const desiredLeft = align === "end" ? rect.right - panelWidth : rect.left;
 *   const left = Math.max(VIEWPORT_MARGIN, Math.min(desiredLeft, maxLeft));
 *   return { top, left };
 * }
 * ```
 *
 * `anchoredPanelPosition` is called with `side: "bottom", offset: 4, margin:
 * 8` (Popover/Menu's fixed call shape) so this file's numbers are exactly
 * what that call produces — this IS the proof that switching Popover/Menu
 * onto the shared core does not shift a single pixel.
 */
import { describe, expect, it } from "vitest";
import { anchoredPanelPosition } from "./anchored-position";

/** `DOMRect`-shaped anchor rect, built the way `getBoundingClientRect()` would. */
function rect(top: number, left: number, width: number, height: number): DOMRect {
  return {
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON() {
      return this;
    },
  } as DOMRect;
}

const OFFSET = 4;
const MARGIN = 8;

describe("anchoredPanelPosition — byte-identical with the refs' panelPosition (side: bottom)", () => {
  it("below-fits: sits `offset` below the anchor, aligned to its left edge (align: start)", () => {
    const result = anchoredPanelPosition(
      rect(100, 50, 100, 20),
      { w: 200, h: 80 },
      { side: "bottom", align: "start", offset: OFFSET, margin: MARGIN, viewport: { w: 1000, h: 800 } },
    );
    // belowTop = 120 + 4 = 124; fits (124 + 80 <= 800). left = anchor.left = 50.
    expect(result).toEqual({ top: 124, left: 50, side: "bottom" });
  });

  it("flip-above: too tall to fit below near the bottom edge, flips and clamps to 0 (not margin)", () => {
    const result = anchoredPanelPosition(
      rect(700, 50, 100, 20),
      { w: 200, h: 150 },
      { side: "bottom", align: "start", offset: OFFSET, margin: MARGIN, viewport: { w: 1000, h: 750 } },
    );
    // belowTop = 720 + 4 = 724; 724 + 150 = 874 > 750, does not fit.
    // top = max(0, 700 - 4 - 150) = max(0, 546) = 546. Resolved side flips to "top".
    expect(result).toEqual({ top: 546, left: 50, side: "top" });
  });

  it("left clamp: an anchor near the left edge is pulled in to `margin`, not left negative", () => {
    const result = anchoredPanelPosition(
      rect(100, 2, 100, 20),
      { w: 200, h: 80 },
      { side: "bottom", align: "start", offset: OFFSET, margin: MARGIN, viewport: { w: 1000, h: 800 } },
    );
    // fits below (top = 124). desiredLeft = anchor.left = 2 < margin (8) -> clamped to 8.
    expect(result).toEqual({ top: 124, left: 8, side: "bottom" });
  });

  it("right clamp: an anchor near the right edge is pulled in to `viewport - panelWidth - margin`", () => {
    const result = anchoredPanelPosition(
      rect(100, 950, 100, 20),
      { w: 200, h: 80 },
      { side: "bottom", align: "start", offset: OFFSET, margin: MARGIN, viewport: { w: 1000, h: 800 } },
    );
    // fits below (top = 124). desiredLeft = 950; maxLeft = 1000 - 200 - 8 = 792 -> clamped to 792.
    expect(result).toEqual({ top: 124, left: 792, side: "bottom" });
  });

  it("align:end sticks the panel's right edge to the anchor's right edge", () => {
    const result = anchoredPanelPosition(
      rect(100, 300, 100, 20),
      { w: 150, h: 80 },
      { side: "bottom", align: "end", offset: OFFSET, margin: MARGIN, viewport: { w: 1000, h: 800 } },
    );
    // fits below (top = 124). desiredLeft = anchor.right - panelWidth = 400 - 150 = 250 (within bounds).
    expect(result).toEqual({ top: 124, left: 250, side: "bottom" });
  });
});

describe("anchoredPanelPosition — the four-sided generalization (not covered by the refs)", () => {
  it("side: right, fits: sits `offset` past the anchor's right edge, aligned to its top (align: start)", () => {
    const result = anchoredPanelPosition(
      rect(100, 100, 40, 30),
      { w: 120, h: 60 },
      { side: "right", align: "start", offset: OFFSET, margin: MARGIN, viewport: { w: 1000, h: 800 } },
    );
    // rightStart = anchor.right (140) + 4 = 144; fits (144 + 120 <= 1000). top = anchor.top = 100.
    expect(result).toEqual({ top: 100, left: 144, side: "right" });
  });

  it("side: right, flips to left when the right edge would clip", () => {
    const result = anchoredPanelPosition(
      rect(100, 900, 40, 30),
      { w: 150, h: 60 },
      { side: "right", align: "start", offset: OFFSET, margin: MARGIN, viewport: { w: 1000, h: 800 } },
    );
    // rightStart = 940 + 4 = 944; 944 + 150 = 1094 > 1000, does not fit.
    // leftStart = 900 - 4 - 150 = 746 (>= 0, no ceiling binds). Resolved side flips to "left".
    expect(result).toEqual({ top: 100, left: 746, side: "left" });
  });

  it("side: right, align: center centers the cross axis on the anchor's vertical extent", () => {
    const result = anchoredPanelPosition(
      rect(100, 100, 40, 30),
      { w: 120, h: 60 },
      { side: "right", align: "center", offset: OFFSET, margin: MARGIN, viewport: { w: 1000, h: 800 } },
    );
    // top = anchor.top + height/2 - panel.h/2 = 100 + 15 - 30 = 85.
    expect(result).toEqual({ top: 85, left: 144, side: "right" });
  });
});
