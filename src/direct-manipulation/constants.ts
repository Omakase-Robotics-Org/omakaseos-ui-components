/**
 * @file Pixel-frame constants and the cursor vocabulary of the
 * direct-manipulation layer.
 *
 * Pure values only: no React, DOM, renderer, wire, clock or random. The
 * pixel numbers here are the POINTER frame (a pointer target's radius on
 * screen); metres are the caller's job (`toleranceMetres`).
 */

import type { DragGrip, PointerModality } from "./grammar";

/** Base drawn and picked radius of a handle in pixels. */
export const HANDLE_RADIUS_PX = 9;
/** Scale applied to a selected handle's radius. */
export const HANDLE_SELECTED_SCALE = 1.7;
/** Drawn radius of a path or ring ghost in pixels. */
export const GHOST_RADIUS_PX = 6;
/** Pick radius of a path or ring ghost in pixels. */
export const GHOST_PICK_RADIUS_PX = 8;
/** Drawn and picked radius of a heading knob in pixels. */
export const KNOB_RADIUS_PX = 7;
/** Drawn and picked radius of a delete badge in pixels. */
export const BADGE_RADIUS_PX = 8;
/** Pixel offset from the area badge anchor to the badge. */
export const BADGE_OFFSET_PX = { x: 11, y: -11 };
/** Pick-radius multiplier for coarse pointer input. */
export const COARSE_PICK_SCALE = 1.6;
/**
 * The fine-pointer ARMING radius: how near the pointer must come to a
 * selected target before that target's single-target affordances (its
 * heading knob) are revealed at all.
 *
 * About three handle radii, which is the distance at which an operator has
 * visibly "gone for" the thing rather than merely passed nearby. Reveal has
 * no meaning for coarse input (there is no hover), so COARSE_PICK_SCALE
 * never applies to it.
 */
export const REVEAL_RADIUS_PX = 28;
/**
 * Snap capture radius in pixels — slightly wider than a pick radius so a
 * deliberate approach snaps, and narrow enough that it does not fight the
 * 45-degree constraint for the same pointer position.
 */
export const SNAP_RADIUS_PX = 10;
/**
 * Badge anchors sit at this multiple of the badge pick radius from their
 * target. At 1x the badge's pick disc would pass exactly through the target's
 * own center, so clicking a selected handle or vertex would resolve to the
 * badge (delete) instead of the thing itself (deselect / grab) — an
 * accidental-deletion hazard. At 2x the disc clears the target's center by a
 * full pick radius. Grammar and renderers must both use it, so the drawn
 * badge and its hit target stay coincident.
 *
 * The badge exists for COARSE input only (a fine pointer deletes through
 * Alt-click, the Delete key, or the host's native twin control), so this
 * offset is a coarse-frame decision; see `badgeUnder` in grammar.ts.
 */
export const BADGE_ANCHOR_OFFSET_SCALE = 2;

/**
 * What a live drag is doing, for the purpose of choosing a slop threshold
 * and a cursor. One class per kind of gesture, not one per grip payload.
 */
export type GripClass = "move" | "insert" | "rotate" | "marquee";

/**
 * Maximum pointer travel that still counts as a press, per grip class and
 * modality, in pixels.
 *
 * A single number cannot serve every gesture: a vertex move must engage
 * early (a 4 px correction is a move, not a click), a rotation is a twist on
 * a small dedicated target and should engage almost immediately, and a
 * finger needs more room than a mouse before its jitter counts as travel.
 */
export const DRAG_SLOP_PX: Readonly<
  Record<GripClass, { readonly fine: number; readonly coarse: number }>
> = {
  move: { fine: 4, coarse: 8 },
  insert: { fine: 5, coarse: 10 },
  rotate: { fine: 2, coarse: 6 },
  marquee: { fine: 3, coarse: 3 },
};

/** The grip class of one grip. Total over DragGrip: a new grip is a type error. */
export function gripClassOf(grip: DragGrip): GripClass {
  switch (grip.kind) {
    case "move-set":
      return "move";
    case "insert":
    case "insert-vertex":
      return "insert";
    case "rotate":
      return "rotate";
    case "marquee":
      return "marquee";
  }
}

/**
 * The drag slop for one grip and modality, in pixels.
 *
 * @param grip The grip taken at press time.
 * @param modality The pointer modality.
 * @returns The slop threshold in pixels.
 */
export function dragSlopPx(grip: DragGrip, modality: PointerModality): number {
  return DRAG_SLOP_PX[gripClassOf(grip)][modality];
}

/**
 * The slop for a press that took no grip (the camera's drag, and the
 * click/no-click decision on a badge or empty floor). Stated explicitly
 * rather than defaulted inside the hook.
 */
export function pressSlopPx(modality: PointerModality): number {
  return DRAG_SLOP_PX.move[modality];
}

/**
 * A cursor value for one of the four non-standard editing gestures.
 *
 * The trailing keyword is REQUIRED by CSS itself (`cursor: url(...)` without
 * one is invalid and the whole declaration is dropped), so it is a declared
 * part of the value rather than a silent fallback: the shape degrades, the
 * meaning of the click does not change, and no state is hidden by it.
 */
function cursorUrl(svg: string, hotspotX: number, hotspotY: number, keyword: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspotX} ${hotspotY}, ${keyword}`;
}

const STROKE = "stroke='black' stroke-width='2.5' fill='none' stroke-linecap='round'";
const HALO = "stroke='white' stroke-width='4.5' fill='none' stroke-linecap='round'";

/** A path drawn twice: a white halo underneath, the black mark on top. */
function marked(d: string): string {
  return `<path ${HALO} d='${d}'/><path ${STROKE} d='${d}'/>`;
}

function glyph(body: string): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>${body}</svg>`;
}

const ARC = "M 5 12 A 7 7 0 1 1 12 19";
const ARROW = "M 12 19 L 9 16 M 12 19 L 15 16";
const PEN = "M 5 19 L 7 13 L 16 4 L 19 7 L 10 16 Z";

/**
 * The non-standard cursors this layer owns. Standard keywords (`grab`,
 * `grabbing`, `copy`, `pointer`, `move`, `crosshair`, `not-allowed`) are
 * used directly and are not repeated here.
 */
export const EDIT_CURSORS = {
  /** Hovering a heading knob: this rotates. */
  rotate: cursorUrl(glyph(marked(ARC) + marked(ARROW)), 12, 12, "grab"),
  /** Rotating right now. */
  rotating: cursorUrl(
    glyph(`<circle cx='12' cy='12' r='3' fill='black' stroke='white' stroke-width='2'/>` + marked(ARC)),
    12,
    12,
    "grabbing",
  ),
  /** On the first vertex of a ring being drawn: this closes it. */
  closeRing: cursorUrl(
    glyph(marked("M 6 12 A 6 6 0 1 1 12 18") + marked("M 12 18 L 6 12")),
    12,
    12,
    "crosshair",
  ),
  /** On the last point of a run being drawn: this ends the run. */
  finishRun: cursorUrl(glyph(marked("M 6 5 L 6 19") + marked("M 6 5 L 17 5 L 13 10 L 17 15 L 6 15")), 6, 5, "crosshair"),
  /** Alt over an edge: a vertex will be inserted here. */
  penPlus: cursorUrl(glyph(marked(PEN) + marked("M 18 15 L 18 21 M 15 18 L 21 18")), 5, 19, "cell"),
  /** Alt over a vertex: that vertex will be removed. */
  penMinus: cursorUrl(glyph(marked(PEN) + marked("M 15 18 L 21 18")), 5, 19, "cell"),
  /** On an existing open path's endpoint while armed: drawing resumes there. */
  resumeRun: cursorUrl(glyph(marked(PEN) + marked("M 14 18 L 21 18 M 18 15 L 21 18 L 18 21")), 5, 19, "crosshair"),
} as const;
