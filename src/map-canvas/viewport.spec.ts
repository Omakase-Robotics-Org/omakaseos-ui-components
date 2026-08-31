/**
 * @file Spec — the map canvas viewport algebra: clamping, zoom-about-anchor,
 * panning, wheel-step proportionality, the CSS transform, and fit-to-box.
 *
 * The centrepiece is the zoom-at-cursor invariance property asserted in
 * "Invariant: the anchor is unchanged" below: it is the one property that
 * makes a pan/zoom surface feel like Google Maps rather than a slot machine,
 * and it is checked numerically rather than merely exercised.
 */
import { describe, expect, it } from "vitest";
import {
  FITTED_VIEWPORT,
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  contentPointAt,
  fitToBox,
  panBy,
  viewportTransform,
  wheelZoom,
  zoomAbout,
  type MapViewport,
} from "./viewport";

describe("clampZoom", () => {
  it("passes a zoom already inside the range through unchanged", () => {
    expect(clampZoom(2)).toBe(2);
  });

  it("clamps a zoom below MIN_ZOOM up to MIN_ZOOM", () => {
    expect(clampZoom(0.001)).toBe(MIN_ZOOM);
  });

  it("clamps a zoom above MAX_ZOOM down to MAX_ZOOM", () => {
    expect(clampZoom(1000)).toBe(MAX_ZOOM);
  });

  it("throws rather than substitute a default for a non-finite zoom", () => {
    expect(() => clampZoom(Number.NaN)).toThrow(/finite/);
    expect(() => clampZoom(Number.POSITIVE_INFINITY)).toThrow(/finite/);
    expect(() => clampZoom(Number.NEGATIVE_INFINITY)).toThrow(/finite/);
  });
});

describe("contentPointAt", () => {
  it("inverts the identity viewport", () => {
    expect(contentPointAt(FITTED_VIEWPORT, { x: 40, y: 60 })).toEqual({ x: 40, y: 60 });
  });

  it("un-does a pan and a zoom together", () => {
    const viewport: MapViewport = { zoom: 2, panX: 10, panY: 20 };
    // box (110, 220) came from content (50, 100) at this viewport:
    // panX + 50*2 = 110, panY + 100*2 = 220.
    expect(contentPointAt(viewport, { x: 110, y: 220 })).toEqual({ x: 50, y: 100 });
  });
});

describe("zoomAbout", () => {
  it("Invariant: the content point under the anchor is unchanged by the zoom", () => {
    const before: MapViewport = { zoom: 1.3, panX: -17, panY: 42 };
    const anchor = { x: 231, y: 88 };
    const contentBefore = contentPointAt(before, anchor);
    for (const target of [0.2, 1, 1.3, 4, 15, 999]) {
      const after = zoomAbout(before, target, anchor);
      const contentAfter = contentPointAt(after, anchor);
      expect(contentAfter.x).toBeCloseTo(contentBefore.x, 9);
      expect(contentAfter.y).toBeCloseTo(contentBefore.y, 9);
    }
  });

  it("clamps the requested zoom", () => {
    const after = zoomAbout(FITTED_VIEWPORT, 1000, { x: 0, y: 0 });
    expect(after.zoom).toBe(MAX_ZOOM);
  });

  it("returns the same viewport instance when the clamped zoom does not change", () => {
    const viewport: MapViewport = { zoom: MAX_ZOOM, panX: 5, panY: 5 };
    expect(zoomAbout(viewport, 999, { x: 12, y: 12 })).toBe(viewport);
  });

  it("throws rather than substitute a default for a non-finite requested zoom", () => {
    expect(() => zoomAbout(FITTED_VIEWPORT, Number.NaN, { x: 0, y: 0 })).toThrow(/finite/);
  });
});

describe("panBy", () => {
  it("adds a screen-space displacement to the pan", () => {
    const viewport: MapViewport = { zoom: 2, panX: 10, panY: 20 };
    expect(panBy(viewport, 5, -3)).toEqual({ zoom: 2, panX: 15, panY: 17 });
  });

  it("returns the same instance for a zero displacement", () => {
    const viewport: MapViewport = { zoom: 2, panX: 10, panY: 20 };
    expect(panBy(viewport, 0, 0)).toBe(viewport);
  });
});

describe("wheelZoom", () => {
  it("zooms in for a negative deltaY and out for a positive one", () => {
    expect(wheelZoom(FITTED_VIEWPORT, -100)).toBeGreaterThan(FITTED_VIEWPORT.zoom);
    expect(wheelZoom(FITTED_VIEWPORT, 100)).toBeLessThan(FITTED_VIEWPORT.zoom);
  });

  it("Invariant: one notch is the same proportional step at every zoom", () => {
    const delta = -120;
    const ratios = [0.2, 1, 3, 10].map((zoom) => wheelZoom({ zoom, panX: 0, panY: 0 }, delta) / zoom);
    for (const ratio of ratios) {
      expect(ratio).toBeCloseTo(ratios[0]!, 12);
    }
  });

  it("returns the identity ratio for a zero delta", () => {
    expect(wheelZoom(FITTED_VIEWPORT, 0)).toBeCloseTo(FITTED_VIEWPORT.zoom, 12);
  });
});

describe("viewportTransform", () => {
  it("renders translate-then-scale in CSS pixels", () => {
    expect(viewportTransform({ zoom: 2, panX: 10, panY: -5 })).toBe("translate(10px, -5px) scale(2)");
  });

  it("renders the identity viewport as a no-op transform", () => {
    expect(viewportTransform(FITTED_VIEWPORT)).toBe("translate(0px, 0px) scale(1)");
  });
});

describe("fitToBox", () => {
  it("fits content wider (relative to its height) than the box by constraining width", () => {
    // 1000x500 content into a 200x200 box: width-constrained, scale 0.2.
    const viewport = fitToBox({ width: 1000, height: 500 }, { width: 200, height: 200 });
    expect(viewport.zoom).toBeCloseTo(0.2, 12);
    expect(viewport.panX).toBeCloseTo(0, 12);
    // content height at 0.2 is 100; centred in a 200-tall box leaves 50 each side.
    expect(viewport.panY).toBeCloseTo(50, 12);
  });

  it("fits content taller (relative to its width) than the box by constraining height", () => {
    // 500x1000 content into a 200x200 box: height-constrained, scale 0.2.
    const viewport = fitToBox({ width: 500, height: 1000 }, { width: 200, height: 200 });
    expect(viewport.zoom).toBeCloseTo(0.2, 12);
    expect(viewport.panY).toBeCloseTo(0, 12);
    expect(viewport.panX).toBeCloseTo(50, 12);
  });

  it("can fit real map-scale content: a 1413x824 raster into a 900-wide panel", () => {
    const viewport = fitToBox({ width: 1413, height: 824 }, { width: 900, height: 700 });
    // width-constrained: 900/1413 < 700/824
    expect(viewport.zoom).toBeCloseTo(900 / 1413, 12);
    // Below rssa's floor of 1 (its layout arrives pre-fitted, so 1 IS its
    // rest state); this module's fit ratio is an absolute content-px-to-
    // CSS-px scale and is routinely below 1 for oversized content.
    expect(viewport.zoom).toBeLessThan(1);
  });

  it("does not floor an extremely oversized map's fit ratio at MIN_ZOOM", () => {
    // A campus-scale raster, tens of thousands of pixels across, into a
    // small panel: the fit ratio falls below the interactive floor, and
    // fitToBox must still show the whole thing rather than crop it.
    const viewport = fitToBox({ width: 50_000, height: 50_000 }, { width: 300, height: 300 });
    expect(viewport.zoom).toBeCloseTo(300 / 50_000, 12);
    expect(viewport.zoom).toBeLessThan(MIN_ZOOM);
  });

  it("caps the zoom at MAX_ZOOM rather than blow up small content past it", () => {
    const viewport = fitToBox({ width: 10, height: 10 }, { width: 900, height: 900 });
    expect(viewport.zoom).toBe(MAX_ZOOM);
    // under-filled (letterboxed) rather than magnified past the ceiling:
    expect(viewport.panX).toBeCloseTo((900 - 10 * MAX_ZOOM) / 2, 12);
    expect(viewport.panY).toBeCloseTo((900 - 10 * MAX_ZOOM) / 2, 12);
  });

  it("throws for a zero-size box", () => {
    expect(() => fitToBox({ width: 100, height: 100 }, { width: 0, height: 100 })).toThrow(/box\.width/);
    expect(() => fitToBox({ width: 100, height: 100 }, { width: 100, height: 0 })).toThrow(/box\.height/);
  });

  it("throws for a zero-size content rect", () => {
    expect(() => fitToBox({ width: 0, height: 100 }, { width: 100, height: 100 })).toThrow(/content\.width/);
    expect(() => fitToBox({ width: 100, height: 0 }, { width: 100, height: 100 })).toThrow(/content\.height/);
  });

  it("throws for a negative or non-finite dimension", () => {
    expect(() => fitToBox({ width: -1, height: 100 }, { width: 100, height: 100 })).toThrow();
    expect(() => fitToBox({ width: 100, height: 100 }, { width: Number.NaN, height: 100 })).toThrow();
  });
});
