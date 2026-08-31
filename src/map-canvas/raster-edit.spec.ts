/**
 * @file Spec — the occupancy-grid document, its three-valued vocabulary, the
 * brush kernel (dab + stroke), PGM encoding, and every fail-first refusal
 * path.
 */
import { describe, expect, it } from "vitest";
import {
  FREE_PIXEL,
  FREE_THRESHOLD,
  OCCUPIED_PIXEL,
  OCCUPIED_THRESHOLD,
  UNKNOWN_PIXEL,
  blankOccupancyDocument,
  classifyPixel,
  createOccupancyDocument,
  encodeOccupancyPgm,
  paintDab,
  paintStroke,
  pixelFor,
  type OccupancyDocument,
} from "./raster-edit";

describe("classifyPixel / pixelFor", () => {
  it("classifies at and above the free threshold as free", () => {
    expect(classifyPixel(FREE_THRESHOLD)).toBe("free");
    expect(classifyPixel(255)).toBe("free");
  });

  it("classifies below the occupied threshold as occupied", () => {
    expect(classifyPixel(OCCUPIED_THRESHOLD - 1)).toBe("occupied");
    expect(classifyPixel(0)).toBe("occupied");
  });

  it("classifies the band between the two thresholds as unknown", () => {
    expect(classifyPixel(OCCUPIED_THRESHOLD)).toBe("unknown");
    expect(classifyPixel(FREE_THRESHOLD - 1)).toBe("unknown");
  });

  it("paints unmapped ground with the byte the robot's own SLAM uses, not one inside the lint's unknown band", () => {
    // Measured on the real export cuc_1_north-0826-01: 691,020 of its
    // 1,164,312 cells are exactly 128 (the unmapped surround), 317,099 are
    // 255 and 34,566 are 0. The encoding is 0/128/255, so that is what a
    // brush must write: a cell this module paints unknown has to be
    // byte-identical to a cell the SLAM left unmapped.
    expect(UNKNOWN_PIXEL).toBe(128);
  });

  it("does NOT claim the lint calls a painted unknown cell unknown (encoding and placement verdict are different questions)", () => {
    // The lint's bands answer "may a waypoint be PLACED here", and the
    // vendor's answer for unmapped ground is no: 128 is below
    // OCCUPIED_THRESHOLD. Painting a byte inside 130..199 purely to make
    // this assertion read "unknown" would make painted cells behave
    // differently from the identically-grey cells the SLAM left unmapped,
    // which is the defect this pins against. The non-identity is deliberate.
    expect(UNKNOWN_PIXEL).toBeLessThan(OCCUPIED_THRESHOLD);
    expect(classifyPixel(UNKNOWN_PIXEL)).toBe("occupied");
  });

  it("matches the vendor lint's own boundary numbers exactly", () => {
    // robot-status-server-app's lib/map-editor/lint.ts: POINT_MIN_PIXEL = 200,
    // EDGE_MIN_PIXEL = 130. A pixel this module calls "free"/"occupied" must be
    // one the lint would agree is free/occupied — see this file's header.
    expect(FREE_THRESHOLD).toBe(200);
    expect(OCCUPIED_THRESHOLD).toBe(130);
  });

  it("round-trips the two values the lint's bands and the encoding agree on", () => {
    // Only occupied and free. Unknown is deliberately excluded: the encoding
    // writes 128 for unmapped ground and the lint's bands call that
    // not-placeable, and the test above pins that non-identity rather than
    // choosing a byte that hides it.
    for (const value of ["occupied", "free"] as const) {
      expect(classifyPixel(pixelFor(value))).toBe(value);
    }
  });

  it("paints the canonical ROS map_server bytes", () => {
    expect(pixelFor("occupied")).toBe(OCCUPIED_PIXEL);
    expect(pixelFor("free")).toBe(FREE_PIXEL);
    expect(pixelFor("unknown")).toBe(UNKNOWN_PIXEL);
    expect(OCCUPIED_PIXEL).toBe(0);
    expect(FREE_PIXEL).toBe(255);
  });
});

describe("createOccupancyDocument / blankOccupancyDocument", () => {
  it("creates a document from raw bytes", () => {
    const pixels = new Uint8Array([0, 128, 255, 200]);
    const document = createOccupancyDocument(2, 2, pixels);
    expect(document.width).toBe(2);
    expect(document.height).toBe(2);
    expect(Array.from(document.pixels)).toEqual([0, 128, 255, 200]);
  });

  it("copies the pixel buffer rather than adopting it — the caller's array cannot reach back in", () => {
    const pixels = new Uint8Array([0, 0, 0, 0]);
    const document = createOccupancyDocument(2, 2, pixels);
    pixels[0] = 255;
    expect(document.pixels[0]).toBe(0);
  });

  it("throws when the buffer length disagrees with width * height", () => {
    expect(() => createOccupancyDocument(2, 2, new Uint8Array(3))).toThrow(/2x2/);
  });

  it("throws for a non-positive or non-integer dimension", () => {
    expect(() => createOccupancyDocument(0, 2, new Uint8Array(0))).toThrow(/width/);
    expect(() => createOccupancyDocument(2, -1, new Uint8Array(0))).toThrow(/height/);
    expect(() => createOccupancyDocument(2.5, 2, new Uint8Array(5))).toThrow(/width/);
  });

  it("fills a blank document with unknown by default", () => {
    const document = blankOccupancyDocument(3, 2);
    expect(document.pixels.length).toBe(6);
    expect(Array.from(document.pixels).every((byte) => byte === UNKNOWN_PIXEL)).toBe(true);
  });

  it("fills a blank document with the requested value", () => {
    const document = blankOccupancyDocument(2, 2, "free");
    expect(Array.from(document.pixels)).toEqual([255, 255, 255, 255]);
  });

  it("throws for a non-positive blank dimension", () => {
    expect(() => blankOccupancyDocument(0, 2)).toThrow(/width/);
    expect(() => blankOccupancyDocument(2, 0)).toThrow(/height/);
  });
});

/** A 10x10 document, entirely free, for the brush specs below. */
function freeDocument(): OccupancyDocument {
  return blankOccupancyDocument(10, 10, "free");
}

function valueAt(document: OccupancyDocument, col: number, row: number): number {
  const byte = document.pixels[row * document.width + col];
  if (byte === undefined) {
    throw new Error(`valueAt: (${String(col)}, ${String(row)}) is out of bounds`);
  }
  return byte;
}

describe("paintDab", () => {
  it("paints a disc of the requested radius and value", () => {
    const document = paintDab(freeDocument(), { col: 5, row: 5 }, 2, "occupied");
    expect(valueAt(document, 5, 5)).toBe(OCCUPIED_PIXEL);
    expect(valueAt(document, 6, 5)).toBe(OCCUPIED_PIXEL);
    // Outside the disc (radius 2, Euclidean): (5+2, 5+2) is distance 2.83, out.
    expect(valueAt(document, 7, 7)).toBe(FREE_PIXEL);
  });

  it("paints a square (Chebyshev) stamp when asked", () => {
    const document = paintDab(freeDocument(), { col: 5, row: 5 }, 2, "occupied", "square");
    // A square stamp covers the corner a disc of the same radius would miss.
    expect(valueAt(document, 7, 7)).toBe(OCCUPIED_PIXEL);
  });

  it("clips a stamp against the document's edges without throwing", () => {
    const document = paintDab(freeDocument(), { col: 0, row: 0 }, 3, "occupied");
    expect(valueAt(document, 0, 0)).toBe(OCCUPIED_PIXEL);
  });

  it("returns the SAME document instance when the stamp changes nothing", () => {
    const document = freeDocument();
    const painted = paintDab(document, { col: 5, row: 5 }, 2, "free");
    expect(painted).toBe(document);
  });

  it("returns a NEW document instance, leaving the original untouched", () => {
    const document = freeDocument();
    const painted = paintDab(document, { col: 5, row: 5 }, 2, "occupied");
    expect(painted).not.toBe(document);
    expect(valueAt(document, 5, 5)).toBe(FREE_PIXEL);
    expect(valueAt(painted, 5, 5)).toBe(OCCUPIED_PIXEL);
  });

  it("throws for a non-finite cell coordinate", () => {
    expect(() => paintDab(freeDocument(), { col: Number.NaN, row: 5 }, 2, "occupied")).toThrow(/at/);
  });

  it("throws for a zero or negative radius", () => {
    expect(() => paintDab(freeDocument(), { col: 5, row: 5 }, 0, "occupied")).toThrow(/radiusCells/);
    expect(() => paintDab(freeDocument(), { col: 5, row: 5 }, -1, "occupied")).toThrow(/radiusCells/);
  });

  it("throws for a document whose buffer does not match its dimensions", () => {
    const bad: OccupancyDocument = { width: 4, height: 4, pixels: new Uint8Array(3) };
    expect(() => paintDab(bad, { col: 1, row: 1 }, 1, "occupied")).toThrow(/4x4/);
  });

  it("throws for a non-positive document dimension", () => {
    const bad: OccupancyDocument = { width: 0, height: 4, pixels: new Uint8Array(0) };
    expect(() => paintDab(bad, { col: 0, row: 0 }, 1, "occupied")).toThrow(/width/);
  });
});

describe("paintStroke — the dotted-line problem", () => {
  it("leaves no gap along a fast drag that skips many cells between samples", () => {
    // A single big jump, as a fast drag reports it: one pointermove event
    // from col 0 to col 60 on a 61-wide document, radius 1. A naive
    // per-sample dab would touch only the two endpoints.
    const wide = blankOccupancyDocument(61, 3, "free");
    const painted = paintStroke(wide, { col: 0, row: 1 }, { col: 60, row: 1 }, 1, "occupied");
    for (let col = 0; col <= 60; col += 1) {
      expect(valueAt(painted, col, 1), `col ${String(col)} was not painted — the stroke left a gap`).toBe(
        OCCUPIED_PIXEL,
      );
    }
  });

  it("paints a diagonal stroke solidly too", () => {
    const document = blankOccupancyDocument(40, 40, "free");
    const painted = paintStroke(document, { col: 0, row: 0 }, { col: 30, row: 30 }, 1.5, "occupied");
    for (let i = 0; i <= 30; i += 1) {
      expect(valueAt(painted, i, i)).toBe(OCCUPIED_PIXEL);
    }
  });

  it("degenerates to a single dab when from and to coincide", () => {
    const document = freeDocument();
    const stroke = paintStroke(document, { col: 5, row: 5 }, { col: 5, row: 5 }, 2, "occupied");
    const dab = paintDab(document, { col: 5, row: 5 }, 2, "occupied");
    expect(Array.from(stroke.pixels)).toEqual(Array.from(dab.pixels));
  });

  it("returns the SAME document instance when nothing changes", () => {
    const document = freeDocument();
    const stroke = paintStroke(document, { col: 1, row: 1 }, { col: 8, row: 8 }, 2, "free");
    expect(stroke).toBe(document);
  });

  it("throws for a non-finite endpoint", () => {
    expect(() =>
      paintStroke(freeDocument(), { col: 0, row: 0 }, { col: Number.POSITIVE_INFINITY, row: 0 }, 1, "occupied"),
    ).toThrow(/to/);
  });

  it("throws for a zero or negative radius", () => {
    expect(() => paintStroke(freeDocument(), { col: 0, row: 0 }, { col: 5, row: 5 }, 0, "occupied")).toThrow(
      /radiusCells/,
    );
  });
});

describe("encodeOccupancyPgm", () => {
  it("writes the minimal P5 header the reference writer uses, then the raw pixels", () => {
    const document = createOccupancyDocument(2, 2, new Uint8Array([0, 128, 255, 200]));
    const bytes = encodeOccupancyPgm(document);
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith("P5\n2 2\n255\n")).toBe(true);
    const headerLength = new TextEncoder().encode("P5\n2 2\n255\n").length;
    expect(Array.from(bytes.subarray(headerLength))).toEqual([0, 128, 255, 200]);
  });

  it("round-trips through a minimal hand-rolled P5 decoder", () => {
    const document = paintDab(blankOccupancyDocument(16, 12, "unknown"), { col: 8, row: 6 }, 3, "occupied");
    const bytes = encodeOccupancyPgm(document);
    const decoded = decodeMinimalPgm(bytes);
    expect(decoded.width).toBe(document.width);
    expect(decoded.height).toBe(document.height);
    expect(Array.from(decoded.pixels)).toEqual(Array.from(document.pixels));
  });

  it("throws for a document whose buffer does not match its dimensions", () => {
    const bad: OccupancyDocument = { width: 3, height: 3, pixels: new Uint8Array(1) };
    expect(() => encodeOccupancyPgm(bad)).toThrow(/3x3/);
  });
});

/**
 * A minimal binary-PGM decoder, written independently of
 * `encodeOccupancyPgm` (and of `robot-status-server-app`'s `decodePgm`) so
 * this spec is not just re-running the encoder's own logic backwards. Only
 * handles the exact "P5\n<w> <h>\n<maxval>\n<raster>" grammar this module
 * writes — it does not need to handle comments or varied whitespace, because
 * proving THAT flexibility is the reference decoder's job, not this one's.
 */
function decodeMinimalPgm(bytes: Uint8Array): { width: number; height: number; pixels: Uint8Array } {
  const text = new TextDecoder().decode(bytes);
  const match = /^P5\n(\d+) (\d+)\n(\d+)\n/.exec(text);
  const header = match?.[0];
  const widthText = match?.[1];
  const heightText = match?.[2];
  if (header === undefined || widthText === undefined || heightText === undefined) {
    throw new Error("decodeMinimalPgm: header did not match the expected minimal P5 grammar");
  }
  const width = Number(widthText);
  const height = Number(heightText);
  const headerBytes = new TextEncoder().encode(header).length;
  return { width, height, pixels: bytes.subarray(headerBytes) };
}
