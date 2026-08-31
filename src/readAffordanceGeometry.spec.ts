/**
 * @file The token reader refuses rather than guesses.
 *
 * The whole point of reading the drawn size back from the cascade is that there
 * is ONE number. A reader that fell back to a plausible default when the token
 * was missing would put a second number back in the tree -- silently, in the
 * one renderer that cannot be checked by looking at the CSS -- which is exactly
 * how a selected marker came to grow in the WebGL layer while the SVG layer
 * held still. So the refusals below are the feature, not defensiveness.
 */
import { describe, expect, it, afterEach } from "vitest";
import { AFFORDANCE_ANCHOR_EDGE_TOKEN, readAffordanceGeometry } from "./readAffordanceGeometry";

function host(value: string | null): HTMLElement {
  const element = document.createElement("div");
  if (value !== null) element.style.setProperty(AFFORDANCE_ANCHOR_EDGE_TOKEN, value);
  document.body.append(element);
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("readAffordanceGeometry", () => {
  it("reads the anchor edge out of the cascade", () => {
    expect(readAffordanceGeometry(host("7px")).anchorEdge).toBe(7);
  });

  it("derives the clearance radius as half the square's diagonal", () => {
    // A round renderer needs the disc that contains the square at ANY rotation,
    // because the same rect rotated 45 degrees is the "place" glyph.
    const { anchorEdge, anchorClear } = readAffordanceGeometry(host("7px"));
    expect(anchorClear).toBeCloseTo((anchorEdge * Math.SQRT2) / 2, 10);
  });

  it("refuses a missing token instead of defaulting", () => {
    expect(() => readAffordanceGeometry(host(null))).toThrow(/is not set on this element's cascade/);
  });

  it("refuses a non-px length, which it cannot convert without a context it is not given", () => {
    expect(() => readAffordanceGeometry(host("1.2em"))).toThrow(/not a px length/);
    expect(() => readAffordanceGeometry(host("50%"))).toThrow(/not a px length/);
  });

  it("refuses a non-positive length", () => {
    expect(() => readAffordanceGeometry(host("0px"))).toThrow(/not a positive length/);
    expect(() => readAffordanceGeometry(host("-3px"))).toThrow(/not a positive length/);
  });
});
