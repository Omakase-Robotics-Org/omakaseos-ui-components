/**
 * @file jsdom unit spec for `<MapCanvas/>`.
 *
 * jsdom has no layout engine and decodes no image, so what is assertable here
 * is the STRUCTURE and the ARITHMETIC: that the picture and the overlay are
 * given the same pixel box, that the transform written to the stack is the
 * viewport kernel's own string, that the geometry handed to the render prop is
 * the kernel's answers wired to the right frame, and that nothing on the
 * surface has quietly acquired a role, a tab stop or an ARIA attribute.
 *
 * What is deliberately NOT asserted: anything that needs a laid-out box or a
 * decoded raster. `getBoundingClientRect` is all zeros in jsdom, so
 * `toWorld` through a mounted canvas can only ever answer null — faking a
 * rectangle would be testing the fake. The pure conversion underneath it
 * ({@link worldPointFromClient}) takes the rectangle as an argument precisely
 * so it CAN be tested for real, and it is, below.
 */
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapCanvas, worldPointFromClient, type MapCanvasGeometry } from "./MapCanvas";
import { viewportTransform, type MapViewport, type RasterFrame } from "./map-canvas";

/** A frame with distinct, non-square dimensions so a transposed axis shows. */
const FRAME: RasterFrame = {
  pixelWidth: 400,
  pixelHeight: 200,
  resolution: 0.1,
  originX: -10,
  originY: -5,
};

const SRC = "data:image/png;base64,iVBORw0KGgo=";
const ALT = "test raster";

function renderCanvas(
  overrides: {
    readonly viewport?: MapViewport;
    readonly onViewportChange?: (viewport: MapViewport) => void;
    readonly surfaceProps?: Record<string, unknown>;
  } = {},
) {
  const seen: MapCanvasGeometry[] = [];
  const utils = render(
    <MapCanvas
      frame={FRAME}
      src={SRC}
      alt={ALT}
      {...(overrides.viewport === undefined ? {} : { viewport: overrides.viewport })}
      {...(overrides.onViewportChange === undefined
        ? {}
        : { onViewportChange: overrides.onViewportChange })}
      {...(overrides.surfaceProps === undefined
        ? {}
        : { surfaceProps: overrides.surfaceProps })}
    >
      {(geometry) => {
        seen.push(geometry);
        return <circle data-testid="overlay-child" cx={1} cy={2} r={3} />;
      }}
    </MapCanvas>,
  );
  return { ...utils, seen };
}

function lastGeometry(seen: readonly MapCanvasGeometry[]): MapCanvasGeometry {
  const geometry = seen.at(-1);
  if (geometry === undefined) {
    throw new Error("MapCanvas.spec: the render prop was never called.");
  }
  return geometry;
}

function box(container: HTMLElement): Element {
  const element = container.querySelector('[data-map-canvas="true"]');
  expect(element).not.toBeNull();
  return element as Element;
}

function raster(container: HTMLElement): Element {
  const element = container.querySelector('[data-map-canvas-raster="true"]');
  expect(element).not.toBeNull();
  return element as Element;
}

function overlay(container: HTMLElement): Element {
  const element = container.querySelector('[data-map-canvas-overlay="true"]');
  expect(element).not.toBeNull();
  return element as Element;
}

describe("MapCanvas structure", () => {
  it("draws the raster at its own pixel size, which is what makes zoom mean the fit ratio", () => {
    const { container } = renderCanvas();
    const image = raster(container);
    expect(image).toHaveAttribute("src", SRC);
    expect(image).toHaveAttribute("alt", ALT);
    // Explicit, frame-derived, and NOT responsive: the viewport kernel's
    // `fitToBox` returns a content-pixel-to-CSS-pixel ratio, which is only the
    // zoom actually applied when the drawn width is the pixel width times the
    // zoom. The ATTRIBUTES are the raster's natural pixel box (the intrinsic
    // size, and the aspect the box reserves before the image decodes); the
    // drawn size is stated in CSS beside them, and at the default zoom of 1
    // the two agree.
    expect(image).toHaveAttribute("width", String(FRAME.pixelWidth));
    expect(image).toHaveAttribute("height", String(FRAME.pixelHeight));
    expect((image as HTMLElement).style.width).toBe(`${String(FRAME.pixelWidth)}px`);
    expect((image as HTMLElement).style.height).toBe(`${String(FRAME.pixelHeight)}px`);
    expect(image).toHaveAttribute("draggable", "false");
  });

  it("gives the overlay the raster's own pixel box as its viewBox", () => {
    const { container } = renderCanvas();
    expect(overlay(container)).toHaveAttribute(
      "viewBox",
      `0 0 ${String(FRAME.pixelWidth)} ${String(FRAME.pixelHeight)}`,
    );
    // Stretched to the same box as the image, so the browser scales the
    // drawing and the picture by one factor and they cannot drift apart.
    expect(overlay(container)).toHaveAttribute("preserveAspectRatio", "none");
  });

  it("renders the render prop's output inside the overlay", () => {
    const { container } = renderCanvas();
    const child = overlay(container).querySelector('[data-testid="overlay-child"]');
    expect(child).not.toBeNull();
  });

  it("applies the zoom as the drawn SIZE and the pan as the only transform", () => {
    const viewport: MapViewport = { zoom: 2.5, panX: -30, panY: 17 };
    const { container } = renderCanvas({ viewport, onViewportChange: vi.fn() });
    const stack = container.querySelector('[data-map-canvas-stack="true"]');
    expect(stack).not.toBeNull();
    // NOT `viewportTransform(viewport)`, which writes `translate(pan)
    // scale(zoom)`. A `scale()` here would sit ABOVE the overlay `<svg>`, and
    // Blink cancels a `vector-effect: non-scaling-stroke` against that svg's
    // own viewBox mapping alone — so the stylesheet's screen-pixel stroke
    // weights would land and do nothing (measured: 2 px declared, `2 * zoom`
    // painted). The zoom is the stack's SIZE instead, which puts it inside
    // that mapping. See the component's header, and the constant-stroke
    // assertion in `spec/map-canvas.e2e.spec.ts` that holds it there.
    expect((stack as HTMLElement).style.transform).toBe("translate(-30px, 17px)");
    expect((stack as HTMLElement).style.transform).not.toContain("scale");
    expect((stack as HTMLElement).style.width).toBe(`${String(FRAME.pixelWidth * 2.5)}px`);
    expect((stack as HTMLElement).style.height).toBe(`${String(FRAME.pixelHeight * 2.5)}px`);
    // The picture fills that box exactly, in the same numbers, so the raster
    // and the drawing over it cannot round to two different rectangles.
    const image = raster(container) as HTMLElement;
    expect(image.style.width).toBe(`${String(FRAME.pixelWidth * 2.5)}px`);
    expect(image.style.height).toBe(`${String(FRAME.pixelHeight * 2.5)}px`);
    // And the pan alone still composes the way the kernel writes it.
    expect(viewportTransform(viewport)).toContain("translate(-30px, 17px)");
  });

  it("merges an editing layer's inline style OVER the raster's own backing", () => {
    const { container } = renderCanvas({
      surfaceProps: { style: { cursor: "grab" }, "data-edit-cursor": "grab" },
    });
    const image = raster(container) as HTMLElement;
    expect(image.style.cursor).toBe("grab");
    // The white backing is a fact about the occupancy grid (its transparent
    // regions mean UNKNOWN, not "whatever the page is"), so a pointer layer's
    // style may not remove it.
    expect(image.style.background).not.toBe("");
    expect(image).toHaveAttribute("data-edit-cursor", "grab");
  });
});

describe("MapCanvas geometry handed to the overlay", () => {
  it("reports the counter-scale and the metre scale for the current zoom", () => {
    const viewport: MapViewport = { zoom: 4, panX: 0, panY: 0 };
    const { seen } = renderCanvas({ viewport, onViewportChange: vi.fn() });
    const geometry = lastGeometry(seen);
    // The image is drawn at its pixel width, so one raster unit is `zoom`
    // screen pixels and the counter-scale is exactly its reciprocal. A 9 px
    // handle is therefore drawn 2.25 raster units across at 4x.
    expect(geometry.scale).toBeCloseTo(1 / 4, 12);
    expect(geometry.metresPerScreenPixel).toBeCloseTo(FRAME.resolution / 4, 12);
    expect(geometry.viewport).toEqual(viewport);
    expect(geometry.frame).toEqual(FRAME);
  });

  it("projects with the frame's own convention, bottom-left origin and flipped rows", () => {
    const { seen } = renderCanvas();
    const geometry = lastGeometry(seen);
    // The world origin is the BOTTOM-left pixel, so it projects to the bottom
    // row of the image, not the top one. Getting this flip backwards places
    // every vertex at the right height above the wrong edge.
    expect(geometry.project({ x: FRAME.originX, y: FRAME.originY })).toEqual({
      col: 0,
      row: FRAME.pixelHeight,
    });
    expect(geometry.unproject({ col: 0, row: 0 })).toEqual({
      x: FRAME.originX,
      y: FRAME.originY + FRAME.pixelHeight * FRAME.resolution,
    });
  });

  it("round-trips an arbitrary world position through project and back", () => {
    const { seen } = renderCanvas();
    const geometry = lastGeometry(seen);
    const world = { x: 3.25, y: -1.75 };
    const back = geometry.unproject(geometry.project(world));
    expect(back.x).toBeCloseTo(world.x, 12);
    expect(back.y).toBeCloseTo(world.y, 12);
  });

  it("answers null from toWorld while nothing is laid out, rather than a plausible position", () => {
    const { seen } = renderCanvas();
    // jsdom lays nothing out, so the raster's live rectangle is all zeros.
    // The honest answer is "the pointer is not on the picture".
    expect(lastGeometry(seen).toWorld(10, 10)).toBeNull();
  });
});

describe("MapCanvas keeps the surface free of widget semantics", () => {
  it("adds no role, tab stop or ARIA to the box, the stack or the raster", () => {
    const { container } = renderCanvas({
      surfaceProps: { style: { cursor: "grab" } },
    });
    const stack = container.querySelector('[data-map-canvas-stack="true"]');
    expect(stack).not.toBeNull();
    for (const element of [box(container), stack as Element, raster(container)]) {
      const attributes = [...element.attributes].map((attribute) => attribute.name);
      const offenders = attributes.filter(
        (name) => name === "role" || name === "tabindex" || name.startsWith("aria-"),
      );
      expect(offenders, {
        message:
          `${element.tagName.toLowerCase()} carries ${offenders.join(", ")}. The canvas is a ` +
          "picture with decorative SVG over it: keyboard reachability is the consumer's native " +
          "twin, and a role or tab stop here would make it a second synthetic widget.",
      } as never).toEqual([]);
    }
  });

  it("hides the overlay from assistive technology, as every Edit glyph group is", () => {
    const { container } = renderCanvas();
    expect(overlay(container)).toHaveAttribute("aria-hidden", "true");
    expect(overlay(container)).not.toHaveAttribute("role");
    expect(overlay(container)).not.toHaveAttribute("tabindex");
  });
});

describe("MapCanvas refuses a viewport it cannot report", () => {
  it("throws when a controlled viewport arrives without onViewportChange", () => {
    // Fail-first: a viewport prop with no change handler is a canvas whose
    // every gesture is computed and discarded, which looks broken instead of
    // saying so.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      render(
        <MapCanvas frame={FRAME} src={SRC} alt={ALT} viewport={{ zoom: 1, panX: 0, panY: 0 }}>
          {() => null}
        </MapCanvas>,
      ),
    ).toThrow(/onViewportChange/);
    consoleError.mockRestore();
  });
});

describe("worldPointFromClient", () => {
  const rect = { left: 100, top: 50, width: 800, height: 400 };

  it("converts proportionally inside the drawn rectangle, whatever the zoom did to it", () => {
    // The rectangle is twice the raster's pixel size, so the conversion has to
    // divide by the RECTANGLE and not by the pixel box: this is the whole
    // reason a zoom needs no arithmetic here.
    const at = worldPointFromClient(FRAME, rect, 100, 50);
    expect(at).not.toBeNull();
    expect(at?.x).toBeCloseTo(FRAME.originX, 12);
    expect(at?.y).toBeCloseTo(FRAME.originY + FRAME.pixelHeight * FRAME.resolution, 12);
  });

  it("round-trips the bottom-right corner back to the frame's far edge", () => {
    const at = worldPointFromClient(FRAME, rect, rect.left + rect.width, rect.top + rect.height);
    expect(at?.x).toBeCloseTo(FRAME.originX + FRAME.pixelWidth * FRAME.resolution, 12);
    expect(at?.y).toBeCloseTo(FRAME.originY, 12);
  });

  it("refuses a position outside the picture", () => {
    expect(worldPointFromClient(FRAME, rect, rect.left - 1, rect.top + 10)).toBeNull();
    expect(worldPointFromClient(FRAME, rect, rect.left + 10, rect.top + rect.height + 1)).toBeNull();
  });

  it("refuses an unlaid-out rectangle rather than dividing by zero", () => {
    expect(worldPointFromClient(FRAME, { left: 0, top: 0, width: 0, height: 0 }, 0, 0)).toBeNull();
  });
});
