/**
 * @file Spec — the counter-scale helpers: the generalised `viewBoxScale`
 * arithmetic, the null-for-unmeasured-layout convention, and every
 * fail-first refusal path.
 */
import { describe, expect, it } from "vitest";
import { metresPerScreenPixel, rasterUnitsPerScreenPixel } from "./screen-scale";
import type { RasterFrame } from "./projection";

/** A 1413px-wide raster at 0.05 world units (metres) per pixel. */
const FRAME: RasterFrame = {
  pixelWidth: 1413,
  pixelHeight: 824,
  resolution: 0.05,
  originX: 0,
  originY: 0,
};

describe("rasterUnitsPerScreenPixel", () => {
  it("is pixelWidth / (layoutWidthPx * zoom), applying the zoom itself", () => {
    // Fitted (layout width already 900, zoom 1): 1413/900.
    expect(rasterUnitsPerScreenPixel(FRAME, 900, 1)).toBeCloseTo(1413 / 900, 12);
  });

  it("shrinks as zoom increases, for a fixed layout width", () => {
    const atOne = rasterUnitsPerScreenPixel(FRAME, 900, 1)!;
    const atFour = rasterUnitsPerScreenPixel(FRAME, 900, 4)!;
    expect(atFour).toBeCloseTo(atOne / 4, 12);
  });

  it("does not double-apply the zoom already carried by a bounding rectangle", () => {
    // layoutWidthPx is the UNZOOMED layout width; the function itself
    // multiplies by zoom exactly once. Passing an already-zoomed width would
    // square the zoom, which this shape of call cannot do by construction.
    const layoutWidthPx = 300;
    const zoom = 3;
    expect(rasterUnitsPerScreenPixel(FRAME, layoutWidthPx, zoom)).toBeCloseTo(
      FRAME.pixelWidth / (layoutWidthPx * zoom),
      12,
    );
  });

  it("returns null for an unmeasured (zero-width) layout, not a plausible-looking default", () => {
    expect(rasterUnitsPerScreenPixel(FRAME, 0, 1)).toBeNull();
  });

  it("throws for a negative layout width, which is not a real CSS box", () => {
    expect(() => rasterUnitsPerScreenPixel(FRAME, -1, 1)).toThrow(/layoutWidthPx/);
  });

  it("throws for a non-finite layout width", () => {
    expect(() => rasterUnitsPerScreenPixel(FRAME, Number.NaN, 1)).toThrow(/layoutWidthPx/);
  });

  it("throws for a non-positive or non-finite zoom", () => {
    expect(() => rasterUnitsPerScreenPixel(FRAME, 900, 0)).toThrow(/zoom/);
    expect(() => rasterUnitsPerScreenPixel(FRAME, 900, -1)).toThrow(/zoom/);
    expect(() => rasterUnitsPerScreenPixel(FRAME, 900, Number.NaN)).toThrow(/zoom/);
  });

  it("throws for a non-positive frame resolution or pixelWidth", () => {
    expect(() => rasterUnitsPerScreenPixel({ ...FRAME, resolution: 0 }, 900, 1)).toThrow(/resolution/);
    expect(() => rasterUnitsPerScreenPixel({ ...FRAME, pixelWidth: 0 }, 900, 1)).toThrow(/pixelWidth/);
  });
});

describe("metresPerScreenPixel", () => {
  it("is rasterUnitsPerScreenPixel scaled by the frame's resolution", () => {
    const rasterUnits = rasterUnitsPerScreenPixel(FRAME, 900, 1)!;
    expect(metresPerScreenPixel(FRAME, 900, 1)).toBeCloseTo(rasterUnits * FRAME.resolution, 12);
  });

  it("returns null under the same unmeasured-layout condition", () => {
    expect(metresPerScreenPixel(FRAME, 0, 1)).toBeNull();
  });

  it("throws for the same degenerate inputs as rasterUnitsPerScreenPixel", () => {
    expect(() => metresPerScreenPixel(FRAME, -1, 1)).toThrow(/layoutWidthPx/);
    expect(() => metresPerScreenPixel(FRAME, 900, Number.NaN)).toThrow(/zoom/);
  });
});
