/**
 * @file Subpath barrel for the map canvas kernel: viewport pan/zoom algebra,
 * world ↔ raster-pixel projection, and the counter-scale that keeps
 * on-screen affordances screen-constant under zoom.
 *
 * Everything re-exported here is pure and React-free — see the `@file`
 * header of each module for why. A host wires these functions to its own
 * DOM events, canvas, or SVG overlay; nothing in this directory renders
 * anything itself.
 */
export * from "./viewport";
export * from "./projection";
export * from "./screen-scale";
