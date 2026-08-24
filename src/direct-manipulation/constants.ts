/** Maximum pointer travel in pixels that still counts as a press. */
export const DRAG_SLOP_PX = 6;
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
 * Badge anchors sit at this multiple of the badge pick radius from their
 * target. At 1x the badge's pick disc would pass exactly through the target's
 * own center, so clicking a selected handle or vertex would resolve to the
 * badge (delete) instead of the thing itself (deselect / grab) — an
 * accidental-deletion hazard. At 2x the disc clears the target's center by a
 * full pick radius. Grammar and renderers must both use it, so the drawn
 * badge and its hit target stay coincident.
 */
export const BADGE_ANCHOR_OFFSET_SCALE = 2;
