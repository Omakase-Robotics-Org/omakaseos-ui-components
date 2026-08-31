/**
 * @file jsdom unit spec for `<MapRasterLayer/>`.
 *
 * jsdom has no 2D canvas context (`getContext("2d")` answers null, same gap
 * `readGrayscalePixels` in robot-status-server-app documents) and no layout,
 * so the actual pixel BLIT is not assertable here — that is a real-browser
 * concern, pinned by the ui-check-style story instead. What jsdom CAN show:
 * that a pointer drag is correctly turned into `paintDab`/`paintStroke`
 * calls and exactly one `onPaint`, that the commit granularity really is
 * "once per stroke" and not "once per sample", that the drawn size and
 * attach ref are wired the way `<MapCanvas picture>` needs, and that the
 * disabled/brush-shape/brush-value props reach the DOM as documented.
 *
 * `getBoundingClientRect` is stubbed on the canvas (jsdom answers all zeros
 * otherwise, which is a real rect just an empty one) so the pointer-to-cell
 * arithmetic — which depends only on the rect, not on canvas rasterisation —
 * can be exercised for real.
 */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapRasterLayer } from "./MapRasterLayer";
import { blankOccupancyDocument, type OccupancyDocument } from "./map-canvas/raster-edit";

/** A 20x20 document, entirely free. */
function freeDocument(): OccupancyDocument {
  return blankOccupancyDocument(20, 20, "free");
}

/** Stub `getBoundingClientRect` so client coordinates map 1:1 to document cells (20x20 CSS box at the origin). */
function stubRect(canvas: Element): void {
  Object.defineProperty(canvas, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 20,
      bottom: 20,
      width: 20,
      height: 20,
      toJSON: () => ({}),
    }),
  });
}

function canvasOf(container: HTMLElement): HTMLCanvasElement {
  const element = container.querySelector('[data-map-raster-layer-canvas="true"]');
  expect(element).not.toBeNull();
  return element as HTMLCanvasElement;
}

describe("MapRasterLayer structure", () => {
  it("draws the canvas at the document's own pixel size by default", () => {
    const { container } = render(
      <MapRasterLayer document={freeDocument()} onPaint={() => undefined} brushRadiusCells={2} brushValue="occupied" />,
    );
    const canvas = canvasOf(container);
    expect(canvas).toHaveAttribute("width", "20");
    expect(canvas).toHaveAttribute("height", "20");
    const root = container.querySelector('[data-map-raster-layer="true"]');
    expect(root).toHaveStyle({ width: "20px", height: "20px" });
  });

  it("draws at an overridden widthPx/heightPx while the canvas attributes stay the document's own", () => {
    const { container } = render(
      <MapRasterLayer
        document={freeDocument()}
        onPaint={() => undefined}
        brushRadiusCells={2}
        brushValue="occupied"
        widthPx={200}
        heightPx={200}
      />,
    );
    const canvas = canvasOf(container);
    expect(canvas).toHaveAttribute("width", "20");
    expect(canvas).toHaveAttribute("height", "20");
    const root = container.querySelector('[data-map-raster-layer="true"]');
    expect(root).toHaveStyle({ width: "200px", height: "200px" });
  });

  it("calls attach with the root element, for MapCanvas's toWorld ref", () => {
    const attach = vi.fn();
    render(<MapRasterLayer document={freeDocument()} onPaint={() => undefined} brushRadiusCells={2} brushValue="occupied" attach={attach} />);
    expect(attach).toHaveBeenCalledTimes(1);
    expect(attach.mock.calls[0]?.[0]).toBeInstanceOf(HTMLElement);
  });

  it("spreads surfaceProps (minus style) onto the canvas, and merges style under the layer's own sizing", () => {
    const { container } = render(
      <MapRasterLayer
        document={freeDocument()}
        onPaint={() => undefined}
        brushRadiusCells={2}
        brushValue="occupied"
        surfaceProps={{ style: { cursor: "crosshair" }, "data-editing-mode": "raster" }}
      />,
    );
    const canvas = canvasOf(container);
    expect(canvas).toHaveAttribute("data-editing-mode", "raster");
    const root = container.querySelector('[data-map-raster-layer="true"]');
    // The layer's own drawn-size style is not overridden by the passed style.
    expect(root).toHaveStyle({ width: "20px", height: "20px", cursor: "crosshair" });
  });
});

describe("MapRasterLayer painting", () => {
  it("commits exactly once per stroke, not once per pointer sample", () => {
    const onPaint = vi.fn();
    const { container } = render(
      <MapRasterLayer document={freeDocument()} onPaint={onPaint} brushRadiusCells={2} brushValue="occupied" />,
    );
    const canvas = canvasOf(container);
    stubRect(canvas);

    fireEvent.pointerDown(canvas, { pointerId: 1, button: 0, clientX: 5, clientY: 5 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 6, clientY: 5 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 8, clientY: 5 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 12, clientY: 5 });
    expect(onPaint).not.toHaveBeenCalled();
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 12, clientY: 5 });

    expect(onPaint).toHaveBeenCalledTimes(1);
  });

  it("paints occupied pixels along the whole dragged path, with no gaps", () => {
    const onPaint = vi.fn();
    const { container } = render(
      <MapRasterLayer document={freeDocument()} onPaint={onPaint} brushRadiusCells={1} brushValue="occupied" />,
    );
    const canvas = canvasOf(container);
    stubRect(canvas);

    fireEvent.pointerDown(canvas, { pointerId: 1, button: 0, clientX: 0, clientY: 10 });
    // One big jump — the way a fast drag actually reports, not a smooth walk.
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 19, clientY: 10 });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 19, clientY: 10 });

    expect(onPaint).toHaveBeenCalledTimes(1);
    const painted = onPaint.mock.calls[0]?.[0] as OccupancyDocument;
    for (let col = 0; col < 20; col += 1) {
      expect(painted.pixels[10 * 20 + col], `col ${String(col)}`).toBe(0);
    }
  });

  it("leaves the document instance untouched — the caller's prop is not mutated", () => {
    const document = freeDocument();
    const before = Array.from(document.pixels);
    const onPaint = vi.fn();
    const { container } = render(<MapRasterLayer document={document} onPaint={onPaint} brushRadiusCells={2} brushValue="occupied" />);
    const canvas = canvasOf(container);
    stubRect(canvas);

    fireEvent.pointerDown(canvas, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 10, clientY: 10 });

    expect(Array.from(document.pixels)).toEqual(before);
  });

  it("paints nothing when disabled", () => {
    const onPaint = vi.fn();
    const { container } = render(
      <MapRasterLayer document={freeDocument()} onPaint={onPaint} brushRadiusCells={2} brushValue="occupied" disabled />,
    );
    const canvas = canvasOf(container);
    stubRect(canvas);
    expect(canvas).toHaveAttribute("data-disabled", "true");

    fireEvent.pointerDown(canvas, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 10, clientY: 10 });

    expect(onPaint).not.toHaveBeenCalled();
  });

  it("ignores a pointerMove/pointerUp from a different pointerId than the one that started the stroke", () => {
    const onPaint = vi.fn();
    const { container } = render(
      <MapRasterLayer document={freeDocument()} onPaint={onPaint} brushRadiusCells={2} brushValue="occupied" />,
    );
    const canvas = canvasOf(container);
    stubRect(canvas);

    fireEvent.pointerDown(canvas, { pointerId: 1, button: 0, clientX: 5, clientY: 5 });
    fireEvent.pointerUp(canvas, { pointerId: 2, clientX: 5, clientY: 5 });
    expect(onPaint).not.toHaveBeenCalled();
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 5, clientY: 5 });
    expect(onPaint).toHaveBeenCalledTimes(1);
  });
});

describe("the brush cursor", () => {
  it("is absent until the pointer hovers, and absent again once disabled", () => {
    const { container, rerender } = render(
      <MapRasterLayer document={freeDocument()} onPaint={() => undefined} brushRadiusCells={2} brushValue="occupied" />,
    );
    expect(container.querySelector('[data-map-raster-layer-cursor="true"]')).toBeNull();

    const canvas = canvasOf(container);
    stubRect(canvas);
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 4, clientY: 4 });
    expect(container.querySelector('[data-map-raster-layer-cursor="true"]')).not.toBeNull();

    rerender(
      <MapRasterLayer document={freeDocument()} onPaint={() => undefined} brushRadiusCells={2} brushValue="occupied" disabled />,
    );
    expect(container.querySelector('[data-map-raster-layer-cursor="true"]')).toBeNull();
  });

  it("sizes the ring from the brush radius and the drawn-vs-document scale", () => {
    const { container } = render(
      <MapRasterLayer
        document={freeDocument()}
        onPaint={() => undefined}
        brushRadiusCells={2}
        brushValue="occupied"
        widthPx={200}
        heightPx={200}
      />,
    );
    const canvas = canvasOf(container);
    stubRect(canvas);
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 4, clientY: 4 });
    const cursor = container.querySelector('[data-map-raster-layer-cursor="true"]');
    // pxPerCell = 200/20 = 10; diameter = radius(2) * 2 * 10 = 40.
    expect(cursor).toHaveStyle({ width: "40px", height: "40px" });
  });
});
