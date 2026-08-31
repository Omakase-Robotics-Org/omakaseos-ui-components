/**
 * @file Spec — world ↔ raster-pixel projection: the y-flip convention, the
 * project/unproject round trip, and every fail-first refusal path.
 */
import { describe, expect, it } from "vitest";
import { project, unproject, type RasterFrame } from "./projection";

/** A 100x50 raster at 0.05 world units per pixel, origin at the world's own zero. */
const FRAME: RasterFrame = {
  pixelWidth: 100,
  pixelHeight: 50,
  resolution: 0.05,
  originX: 0,
  originY: 0,
};

describe("project", () => {
  it("places the origin at the BOTTOM-LEFT pixel row, not the top", () => {
    // The world point at the origin is the bottom-left of the image: col 0,
    // row = pixelHeight (the row just past the last valid index, at y=0 exactly).
    expect(project(FRAME, { x: 0, y: 0 })).toEqual({ col: 0, row: 50 });
  });

  it("places a point at the top of the image at row 0", () => {
    // Top of a 50-row image at 0.05 world units/px is originY + 50*0.05 = 2.5.
    expect(project(FRAME, { x: 0, y: 2.5 })).toEqual({ col: 0, row: 0 });
  });

  it("scales x by 1/resolution to get the column", () => {
    expect(project(FRAME, { x: 1, y: 0 }).col).toBeCloseTo(20, 12);
  });

  it("honours a non-zero origin", () => {
    const frame: RasterFrame = { ...FRAME, originX: 10, originY: -5 };
    expect(project(frame, { x: 10, y: -5 })).toEqual({ col: 0, row: 50 });
  });

  it("throws for a non-positive resolution", () => {
    expect(() => project({ ...FRAME, resolution: 0 }, { x: 0, y: 0 })).toThrow(/resolution/);
    expect(() => project({ ...FRAME, resolution: -1 }, { x: 0, y: 0 })).toThrow(/resolution/);
  });

  it("throws for a non-positive pixel dimension", () => {
    expect(() => project({ ...FRAME, pixelWidth: 0 }, { x: 0, y: 0 })).toThrow(/pixelWidth/);
    expect(() => project({ ...FRAME, pixelHeight: 0 }, { x: 0, y: 0 })).toThrow(/pixelHeight/);
  });

  it("throws for a non-finite frame origin", () => {
    expect(() => project({ ...FRAME, originX: Number.NaN }, { x: 0, y: 0 })).toThrow(/originX/);
  });

  it("throws for a non-finite world point", () => {
    expect(() => project(FRAME, { x: Number.NaN, y: 0 })).toThrow(/worldPoint/);
    expect(() => project(FRAME, { x: 0, y: Number.POSITIVE_INFINITY })).toThrow(/worldPoint/);
  });
});

describe("unproject", () => {
  it("is the exact inverse of project for the frame's own corners", () => {
    expect(unproject(FRAME, { col: 0, row: 50 })).toEqual({ x: 0, y: 0 });
    expect(unproject(FRAME, { col: 0, row: 0 })).toEqual({ x: 0, y: 2.5 });
  });

  it("throws for a non-positive resolution", () => {
    expect(() => unproject({ ...FRAME, resolution: 0 }, { col: 0, row: 0 })).toThrow(/resolution/);
  });

  it("throws for a non-finite raster point", () => {
    expect(() => unproject(FRAME, { col: Number.NaN, row: 0 })).toThrow(/rasterPoint/);
  });
});

describe("project/unproject round trip", () => {
  const cases: ReadonlyArray<{ readonly frame: RasterFrame; readonly x: number; readonly y: number }> = [
    { frame: FRAME, x: 0, y: 0 },
    { frame: FRAME, x: 1.23, y: -0.87 },
    { frame: { pixelWidth: 1413, pixelHeight: 824, resolution: 0.05, originX: -12.4, originY: 3.1 }, x: 5, y: 5 },
    { frame: { pixelWidth: 1413, pixelHeight: 824, resolution: 0.05, originX: -12.4, originY: 3.1 }, x: -30, y: 40 },
  ];

  it.each(cases)("unproject(project(world)) === world for %j", ({ frame, x, y }) => {
    const raster = project(frame, { x, y });
    const world = unproject(frame, raster);
    expect(world.x).toBeCloseTo(x, 9);
    expect(world.y).toBeCloseTo(y, 9);
  });

  it.each(cases)("project(unproject(raster)) === raster for %j", ({ frame, x, y }) => {
    // Re-use the same fixture points as raster coordinates too, exercising
    // the other composition order.
    const raster = { col: x, row: y };
    const world = unproject(frame, raster);
    const roundTripped = project(frame, world);
    expect(roundTripped.col).toBeCloseTo(raster.col, 9);
    expect(roundTripped.row).toBeCloseTo(raster.row, 9);
  });
});
