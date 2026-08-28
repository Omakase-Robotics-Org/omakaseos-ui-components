/**
 * @file `anchoredPanelPosition` — the floating-panel placement core shared by
 * every anchored overlay in this library (`Popover`, `Menu`, and `Tooltip`
 * after it). INTERNAL — not exported from `src/index.ts`.
 *
 * ## Why this exists
 *
 * The dashboard's `Popover.tsx` and `Menu.tsx` (`.codex/ref/`, the
 * implementations this library absorbs) each carried their own
 * `panelPosition` function — verbatim identical, because both floating
 * panels make the same three decisions: sit past the anchor's chosen edge
 * by default, flip to the opposite side when the viewport would clip the
 * panel, and clamp the cross axis so no anchor position can push the panel
 * off screen. Two copies of the same math is the duplication this module
 * exists to kill.
 *
 * ## Four-sided, not two
 *
 * The refs only ever chose between "below" and "above" (a vertical flip
 * for a panel that always hangs off the bottom of an anchor). This core
 * generalizes that to all four sides — `top` / `right` / `bottom` /
 * `left` — because a `Tooltip` built on the same core needs
 * `side: "right"`. Generalizing does not change the vertical math for
 * `side: "bottom"`: see the byte-identical pin below.
 *
 * ## Byte-identical with the refs, on purpose
 *
 * For `side: "bottom"`, `offset: 4`, `margin: 8`, `align: "start" | "end"`,
 * this function MUST produce the exact `{ top, left }` the refs'
 * `panelPosition` produced for the same `(anchor, panel, align)` triple —
 * that is what lets `Popover` and `Menu` switch onto this shared core with
 * no pixel shift. `anchored-position.spec.ts` pins several such triples,
 * hand-derived from the ref algorithm (below-fits, flip-above, left
 * clamp, right clamp, align:end).
 *
 * ## The main-axis clamp after a flip
 *
 * The refs clamp the flipped coordinate with `Math.max(0, ...)` only — no
 * ceiling:
 *
 * ```
 * const top = fitsBelow ? belowTop : Math.max(0, rect.top - PANEL_OFFSET - panelHeight);
 * ```
 *
 * That is not an oversight being carried forward by accident: once the
 * preferred side has been rejected for not fitting, the flipped
 * coordinate is, by construction, already within the far edge (the flip
 * mirrors the offset across the anchor, and the anchor itself sits
 * on-screen), so a ceiling clamp never binds for the refs' own inputs —
 * `mainAxisCoordinate` below adds one defensively, for the sides the refs
 * never covered, and the pin proves it changes nothing for `"bottom"`.
 *
 * ## Cross-axis clamp always uses margin; main-axis flip never does
 *
 * The refs only ever clamp the horizontal (cross) axis with
 * `VIEWPORT_MARGIN`; the vertical (main) axis, when flipped, clamps to a
 * bare `0`. This asymmetry is preserved exactly — introducing `margin`
 * into the main-axis clamp would move every flip-above coordinate by
 * `margin` px and break the byte-identical pin.
 */

/** The side of the anchor a panel's leading edge attaches to. */
export type Side = "top" | "right" | "bottom" | "left";

/** The panel's own box, measured (e.g. `offsetWidth` / `offsetHeight`). */
export type AnchoredPanelSize = {
  readonly w: number;
  readonly h: number;
};

export type AnchoredPanelOptions = {
  /** Preferred side; flips to the opposite side when it would clip. */
  readonly side: Side;
  /** Cross-axis alignment against the anchor's own extent on that axis. */
  readonly align: "start" | "center" | "end";
  /** Gap between the anchor and the panel along the main axis, in px. */
  readonly offset: number;
  /** Minimum distance kept between the panel and the viewport edge, in px. */
  readonly margin: number;
  readonly viewport: AnchoredPanelSize;
};

export type AnchoredPanelPosition = {
  readonly top: number;
  readonly left: number;
  /** The side actually used — differs from `opts.side` only after a flip. */
  readonly side: Side;
};

/**
 * Cross-axis coordinate: align the panel against the anchor's `[start, end]`
 * extent on that axis, then clamp into `[margin, viewportSize - panelSize -
 * margin]` — same rule the refs apply to the horizontal axis regardless of
 * `align`.
 */
function crossAxisCoordinate(
  anchorStart: number,
  anchorEnd: number,
  panelSize: number,
  align: "start" | "center" | "end",
  margin: number,
  viewportSize: number,
): number {
  const desired =
    align === "end"
      ? anchorEnd - panelSize
      : align === "center"
        ? anchorStart + (anchorEnd - anchorStart) / 2 - panelSize / 2
        : anchorStart;
  const max = viewportSize - panelSize - margin;
  return Math.max(margin, Math.min(desired, max));
}

/**
 * Main-axis coordinate: use the preferred-side position unclamped when it
 * fits; otherwise use the flipped-side position, clamped into `[0,
 * viewportSize - panelSize]` (never `margin` — see file header). The refs
 * clamp only with `Math.max(0, ...)`; the `Math.min` ceiling added here is a
 * no-op for every ref-covered input (proven by the byte-identical pin) and
 * only matters for the sides the refs never had (`top`, `left`, `right`).
 */
function mainAxisCoordinate(
  fits: boolean,
  preferredStart: number,
  flippedStart: number,
  panelSize: number,
  viewportSize: number,
): number {
  if (fits) {
    return preferredStart;
  }
  return Math.max(0, Math.min(flippedStart, viewportSize - panelSize));
}

/**
 * Where an anchored floating panel sits: past the anchor's preferred side,
 * flipping to the OPPOSITE side when the viewport would clip it, with the
 * cross axis aligned per `align` and clamped into the viewport (minus
 * `margin`). Returns the RESOLVED side (differs from `opts.side` only when a
 * flip happened) so a caller (e.g. Tooltip) can render an arrow or choose a
 * transform-origin for the side actually used.
 */
export function anchoredPanelPosition(
  anchor: DOMRect,
  panel: AnchoredPanelSize,
  opts: AnchoredPanelOptions,
): AnchoredPanelPosition {
  const { side, align, offset, margin, viewport } = opts;

  if (side === "bottom" || side === "top") {
    const belowStart = anchor.bottom + offset;
    const aboveStart = anchor.top - offset - panel.h;
    const fitsBelow = belowStart + panel.h <= viewport.h;
    const fitsAbove = aboveStart >= 0;

    const preferBelow = side === "bottom";
    const fits = preferBelow ? fitsBelow : fitsAbove;
    const preferredStart = preferBelow ? belowStart : aboveStart;
    const flippedStart = preferBelow ? aboveStart : belowStart;
    const resolvedSide: Side = fits ? side : preferBelow ? "top" : "bottom";

    const top = mainAxisCoordinate(fits, preferredStart, flippedStart, panel.h, viewport.h);
    const left = crossAxisCoordinate(anchor.left, anchor.right, panel.w, align, margin, viewport.w);
    return { top, left, side: resolvedSide };
  }

  // side === "right" || side === "left"
  const rightStart = anchor.right + offset;
  const leftStart = anchor.left - offset - panel.w;
  const fitsRight = rightStart + panel.w <= viewport.w;
  const fitsLeft = leftStart >= 0;

  const preferRight = side === "right";
  const fits = preferRight ? fitsRight : fitsLeft;
  const preferredStart = preferRight ? rightStart : leftStart;
  const flippedStart = preferRight ? leftStart : rightStart;
  const resolvedSide: Side = fits ? side : preferRight ? "left" : "right";

  const left = mainAxisCoordinate(fits, preferredStart, flippedStart, panel.w, viewport.w);
  const top = crossAxisCoordinate(anchor.top, anchor.bottom, panel.h, align, margin, viewport.h);
  return { top, left, side: resolvedSide };
}
