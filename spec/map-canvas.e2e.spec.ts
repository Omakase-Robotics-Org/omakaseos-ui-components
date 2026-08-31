/**
 * @file Real-browser proof of the practical map editor — `<MapCanvas/>` with
 * the direct-manipulation grammar composed on top of it, mounted in the demo
 * harness by `demo/map-canvas-demo.tsx`.
 *
 * ## Why this file has to exist
 *
 * `bun run build-storybook`, the other half of this repository's
 * `REPO_VERIFY_CMD`, only COMPILES `src/MapCanvasEditor.stories.tsx`. It never
 * runs it. Everything the editor actually claims is a claim about pixels,
 * pointers and a live CSS transform:
 *
 *  - a wheel zoom that keeps the world point under the cursor (needs a real
 *    wheel event, real layout, and a real `getBoundingClientRect`),
 *  - affordances that stay a constant SIZE ON SCREEN while the picture scales
 *    (needs a rendered box to measure, at two different zooms),
 *  - a press that pans the picture or draws a marquee depending only on what
 *    the grammar says is under it (needs pointer capture and a slop threshold),
 *  - a click that lands on a LINE, an Alt-click that removes a vertex, a
 *    double click that splits an edge, a knob drag that writes a yaw.
 *
 * jsdom has no layout, no pixels, no CSS transform and no pointer dispatch, so
 * a `render()` of this editor is evidence about none of it.
 *
 * ## Two ways to measure a drawn circle, and why BOTH are used
 *
 * For an SVG shape, Blink's `Element.getBoundingClientRect()` returns the
 * shape's GEOMETRY mapped to the viewport and EXCLUDES the stroke, while
 * Playwright's `Locator.boundingBox()` (CDP `DOM.getBoxModel`) returns the
 * VISUAL box and INCLUDES it. That is not a nuisance here — it is the
 * measuring instrument. The difference between the two, on one element, is
 * exactly that element's painted stroke width in screen pixels, and it is
 * confirmed on two elements with different declared strokes inside
 * `screen-constant-handles` below rather than assumed.
 *
 * ## Scoping
 *
 * The harness renders every panel once per host. This spec arms and drives the
 * `omks-web` host's panel only (`HOST`), the same host
 * `direct-manipulation.e2e.spec.ts` uses, and every locator is scoped to the
 * armed editor. Nothing outside that subtree is touched, and the panel is
 * unmounted for every other spec because it mounts nothing until armed.
 */
import { expect, test, type Locator, type Page } from "playwright/test";
import { project, unproject, type RasterFrame, type WorldPoint } from "../src/map-canvas";
import { CUC_1_NORTH_RASTER } from "../src/map-canvas/cuc-1-north.fixture";

const HOST = ".host--omks-web";

/** The frame the demo draws, restated from the same fixture the demo mounts. */
const FRAME: RasterFrame = {
  pixelWidth: CUC_1_NORTH_RASTER.pixelWidth,
  pixelHeight: CUC_1_NORTH_RASTER.pixelHeight,
  resolution: CUC_1_NORTH_RASTER.resolution,
  originX: CUC_1_NORTH_RASTER.originX,
  originY: CUC_1_NORTH_RASTER.originY,
};

/** One wheel notch, in `deltaY`. `wheelZoom` reads `exp(-deltaY * 0.0015)`. */
const NOTCH = -300;

/** The zoom factor one {@link NOTCH} multiplies the viewport by. */
const NOTCH_FACTOR = Math.exp(-NOTCH * 0.0015);

type Point = { readonly x: number; readonly y: number };
type Box = { readonly left: number; readonly top: number; readonly width: number; readonly height: number };

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${String(error)}`));
  return errors;
}

/**
 * Load the harness, arm the map panel, and scroll the canvas into view once.
 *
 * The panel mounts nothing until armed (see `demo/map-canvas-demo.tsx`), so
 * this is also the moment the raster is decoded. The single scroll happens
 * before any coordinate is captured, for the same reason
 * `direct-manipulation.e2e.spec.ts` scrolls exactly once: every later
 * measurement is taken from a live bounding rectangle, and a scroll between
 * capturing a point and using it would silently move the target.
 */
async function openEditor(page: Page): Promise<Locator> {
  await page.goto("/");
  await page.locator(`${HOST} [data-testid="mc-arm-omks-web"]`).click();
  const editor = page.locator(`${HOST} [data-testid="mc-editor"]`);
  await editor.locator("[data-map-canvas-raster]").scrollIntoViewIfNeeded();
  // The image is drawn at its own pixel size and then fitted by a layout
  // effect; wait for the fit rather than for a duration.
  await expect.poll(async () => zoomOf(editor)).toBeLessThan(1);
  return editor;
}

/** The raster image's LIVE rectangle — the one `worldPointFromClient` reads. */
async function rasterBox(editor: Locator): Promise<Box> {
  return editor.locator("[data-map-canvas-raster]").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  });
}

/**
 * Where a world position currently sits on screen.
 *
 * The same proportional mapping `MapCanvas.worldPointFromClient` inverts: the
 * image's rectangle already carries the viewport's transform, so no zoom or
 * pan arithmetic appears here.
 */
async function clientOf(editor: Locator, at: WorldPoint): Promise<Point> {
  const box = await rasterBox(editor);
  const raster = project(FRAME, at);
  return {
    x: box.left + (raster.col / FRAME.pixelWidth) * box.width,
    y: box.top + (raster.row / FRAME.pixelHeight) * box.height,
  };
}

/** The world position currently under a client position. */
async function worldAt(editor: Locator, at: Point): Promise<WorldPoint> {
  const box = await rasterBox(editor);
  return unproject(FRAME, {
    col: ((at.x - box.left) / box.width) * FRAME.pixelWidth,
    row: ((at.y - box.top) / box.height) * FRAME.pixelHeight,
  });
}

async function numberOf(locator: Locator, attribute: string): Promise<number> {
  return Number(await locator.getAttribute(attribute));
}

async function zoomOf(editor: Locator): Promise<number> {
  return numberOf(editor.getByTestId("mc-zoom"), "data-zoom");
}

async function panOf(editor: Locator): Promise<Point> {
  const pan = editor.getByTestId("mc-pan");
  return { x: await numberOf(pan, "data-pan-x"), y: await numberOf(pan, "data-pan-y") };
}

/** Metres per screen pixel, as the editor itself computes it. */
async function metresPerPixel(editor: Locator): Promise<number> {
  return (await numberOf(editor.getByTestId("mc-scale"), "data-scale")) * FRAME.resolution;
}

/** One committed vertex, from the demo's readout of the session document. */
async function vertexOf(
  editor: Locator,
  id: string,
): Promise<{ x: number; y: number; yaw: number; kind: string }> {
  const locator = editor.locator(`[data-testid="mc-point"][data-id="${id}"]`);
  return {
    x: await numberOf(locator, "data-x"),
    y: await numberOf(locator, "data-y"),
    yaw: await numberOf(locator, "data-yaw"),
    kind: (await locator.getAttribute("data-type")) ?? "",
  };
}

/** Every committed line, as `id:src→dst`, in document order. */
async function edgesOf(editor: Locator): Promise<string[]> {
  return editor.locator('[data-testid="mc-edge"]').evaluateAll((elements) =>
    elements.map(
      (element) =>
        `${element.getAttribute("data-id") ?? "?"}:${element.getAttribute("data-src") ?? "?"}→${
          element.getAttribute("data-dst") ?? "?"
        }`,
    ),
  );
}

/**
 * A drawn object in the overlay, by its identity.
 *
 * Scoped to the overlay because the readouts sit in the same subtree and name
 * objects too; only the overlay's `data-point-id` / `data-edge-id` answer
 * "is this still on screen".
 */
function drawn(editor: Locator, selector: string): Locator {
  return editor.locator(`[data-map-canvas-overlay] ${selector}`);
}

/** A drawn line's endpoints, in the raster pixel space the overlay draws in. */
async function drawnEdge(
  editor: Locator,
  id: string,
): Promise<{ x1: number; y1: number; x2: number; y2: number }> {
  return editor.locator(`[data-edge-id="${id}"]`).evaluate((element) => ({
    x1: Number(element.getAttribute("x1")),
    y1: Number(element.getAttribute("y1")),
    x2: Number(element.getAttribute("x2")),
    y2: Number(element.getAttribute("y2")),
  }));
}

/**
 * Zoom in about a world position, one notch at a time.
 *
 * The position is recomputed before every notch and the pointer is parked on
 * it, so the target stays where it is on screen while the picture grows around
 * it — which is the `zoom-at-cursor` property the first test proves
 * independently, used here as a tool so a target cannot leave the clipped box.
 */
async function zoomInAbout(
  page: Page,
  editor: Locator,
  about: WorldPoint,
  notches: number,
): Promise<void> {
  for (let index = 0; index < notches; index += 1) {
    const before = await zoomOf(editor);
    const at = await clientOf(editor, about);
    await page.mouse.move(at.x, at.y);
    await page.mouse.wheel(0, NOTCH);
    await expect.poll(async () => zoomOf(editor)).toBeGreaterThan(before);
  }
  // The handles' radii transition over --ds-transition-fast; wait for the
  // drawn picture to settle rather than measure an animation frame.
  await settle(editor);
}

/**
 * Wait until nothing in the editor is still animating.
 *
 * `EditHandle`'s ring transitions its `r` over `--ds-transition-fast`
 * (120 ms), and `r` is exactly the property the counter-scale rewrites on
 * every zoom — so a measurement taken right after a wheel event reads a frame
 * from the MIDDLE of that transition. That is not a hypothetical: the first
 * run of this spec measured 22.15 px and 41.90 px for a circle that settles at
 * 25.88 px both times. Polling for a value that "stops changing" is not enough
 * either (an ease-out's last frames differ by less than the reading), so this
 * asks the browser directly which transitions are still running.
 */
async function settle(editor: Locator): Promise<void> {
  await expect
    .poll(async () =>
      editor.evaluate(
        (element) =>
          element
            .getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running").length,
      ),
    )
    .toBe(0);
}

/** Drag between two client points, in steps so the moves coalesce as usual. */
async function drag(
  page: Page,
  from: Point,
  to: Point,
  options: { readonly modifier?: "Shift" | "Alt"; readonly steps?: number } = {},
): Promise<void> {
  await page.mouse.move(from.x, from.y);
  if (options.modifier !== undefined) {
    await page.keyboard.down(options.modifier);
  }
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: options.steps ?? 8 });
  await page.mouse.up();
  if (options.modifier !== undefined) {
    await page.keyboard.up(options.modifier);
  }
}

/** Turn the magnet off, so a drag lands where it was dropped and nowhere else. */
async function disableMagnet(editor: Locator): Promise<void> {
  await editor.getByRole("button", { name: "Snap: on" }).click();
  await expect(editor.getByTestId("mc-magnet")).toHaveText("magnet: off");
}

/**
 * Empty floor: a raster position far from every vertex and every line. Taken
 * from the road graph's own numbers — the whole graph lies east of x = -25 m
 * and this is at x ≈ -46.7 m, more than 200 raster pixels clear of it.
 */
const EMPTY_FLOOR: WorldPoint = unproject(FRAME, { col: 60, row: 60 });

// ---------------------------------------------------------------------------
// The two properties that only a real browser can answer.
// ---------------------------------------------------------------------------

test("zoom-at-cursor: the world point under the pointer survives a wheel zoom", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  // A point over the raster, away from any affordance, so nothing about this
  // measurement depends on hover state.
  const anchor = await clientOf(editor, EMPTY_FLOOR);
  await page.mouse.move(anchor.x, anchor.y);
  const before = await worldAt(editor, anchor);
  const zoomBefore = await zoomOf(editor);

  await page.mouse.wheel(0, NOTCH);
  await expect.poll(async () => zoomOf(editor)).toBeGreaterThan(zoomBefore);
  const zoomAfter = await zoomOf(editor);
  const after = await worldAt(editor, anchor);

  // The wheel did what the kernel says it does...
  expect(zoomAfter / zoomBefore).toBeCloseTo(NOTCH_FACTOR, 6);
  // ...and the map did not walk out from under the pointer. Stated in SCREEN
  // pixels, which is the unit the operator would see the error in: the world
  // error divided by metres-per-screen-pixel at the NEW zoom.
  const metres = await metresPerPixel(editor);
  const driftPx = Math.hypot(after.x - before.x, after.y - before.y) / metres;
  expect(driftPx).toBeLessThan(0.5);

  // Four more notches, a 6.1x total magnification, and the drift stays
  // sub-pixel — it does not accumulate into a visible walk.
  for (let index = 0; index < 4; index += 1) {
    const zoom = await zoomOf(editor);
    await page.mouse.wheel(0, NOTCH);
    await expect.poll(async () => zoomOf(editor)).toBeGreaterThan(zoom);
  }
  const zoomEnd = await zoomOf(editor);
  expect(zoomEnd / zoomBefore).toBeCloseTo(NOTCH_FACTOR ** 5, 4);
  const end = await worldAt(editor, anchor);
  const endDriftPx = Math.hypot(end.x - before.x, end.y - before.y) / (await metresPerPixel(editor));
  // The residual is Chrome's fixed-point rounding of the composited transform,
  // not a walk: it converges in WORLD units (10.0 mm measured here, a tenth of
  // one raster pixel) while the screen figure grows only because a screen
  // pixel now covers less ground. Measured 0.81 px at 9.5x.
  expect(Math.hypot(end.x - before.x, end.y - before.y)).toBeLessThan(0.02);
  expect(endDriftPx).toBeLessThan(1.5);

  expect(errors).toEqual([]);
});

test("screen-constant-handles: the drawn geometry holds its size across a zoom, and the outline does not", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  // "0000" is `home`, the handle the demo also nominates for its own
  // measurement readout. Park the pointer ON it and zoom about it: the handle
  // stays under the pointer (proved above), so its hover state — and therefore
  // its drawn radius scale — is identical at both measurements, and the
  // comparison is of one circle with itself.
  const home: WorldPoint = { x: -0.089, y: 0.043 };
  const ring = editor.locator('[data-point-id="0000"] circle:last-of-type');
  const at = await clientOf(editor, home);
  await page.mouse.move(at.x, at.y);
  await expect(editor.getByTestId("mc-affordance")).toHaveText("affordance: handle");
  await settle(editor);

  const geometryAt = async (): Promise<Box> =>
    ring.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    });
  const visualWidthAt = async (): Promise<number> => {
    const box = await ring.boundingBox();
    if (box === null) {
      throw new Error("the nominated handle is not measurable");
    }
    return box.width;
  };

  const zoomBefore = await zoomOf(editor);
  const geometryBefore = await geometryAt();
  const visualBefore = await visualWidthAt();

  // The demo measures the same circle from inside the page. Two independent
  // instruments, one number: if the readout and this spec disagreed, one of
  // them would be measuring something else.
  expect(await numberOf(editor.getByTestId("mc-handle-measure"), "data-width")).toBeCloseTo(
    geometryBefore.width,
    2,
  );

  await zoomInAbout(page, editor, home, 3);

  const zoomAfter = await zoomOf(editor);
  const geometryAfter = await geometryAt();
  const visualAfter = await visualWidthAt();
  const magnification = zoomAfter / zoomBefore;
  expect(magnification).toBeCloseTo(NOTCH_FACTOR ** 3, 4);

  // ---- 1. The counter-scale works. -------------------------------------
  // The raster is now 3.86x larger on screen; the handle is not larger at all.
  // A tolerance of 1/20 of a pixel, against a change of 3.86x that a missing
  // counter-scale would produce (25.9 px -> 99.9 px).
  expect(geometryAfter.width).toBeCloseTo(geometryBefore.width, 1);
  expect(geometryAfter.height).toBeCloseTo(geometryBefore.height, 1);
  expect(Math.abs(geometryAfter.width - geometryBefore.width)).toBeLessThan(0.05);
  // And it stayed where the pointer was, so this is the same handle in the
  // same place, not a different one that happens to be the same size. One
  // pixel, for the transform-rounding residual the zoom-at-cursor test
  // measures (0.43 px over these three notches).
  expect(Math.abs(geometryAfter.left - geometryBefore.left)).toBeLessThan(1);
  expect(Math.abs(geometryAfter.top - geometryBefore.top)).toBeLessThan(1);

  // ---- 2. The STROKE does not. -----------------------------------------
  // `getBoundingClientRect` excludes the stroke and Playwright's boundingBox
  // includes it, so the difference is the painted outline in screen pixels.
  // First, that instrument is verified rather than assumed: the ring declares
  // `stroke-width: 2` and the primary ring `1.5`, and the two differences must
  // come out in that ratio at one zoom.
  await editor.getByRole("button", { name: "Fit" }).click();
  await settle(editor);
  const fitted = await zoomOf(editor);
  const strokeOf = async (locator: Locator): Promise<number> => {
    const geometry = await locator.evaluate((element) => element.getBoundingClientRect().width);
    const visual = await locator.boundingBox();
    if (visual === null) {
      throw new Error("SVG shape is not measurable");
    }
    return visual.width - geometry;
  };
  const homeAt = await clientOf(editor, home);
  await page.mouse.click(homeAt.x, homeAt.y);
  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: handle:0000");
  await settle(editor);
  const outerStroke = await strokeOf(editor.locator('[data-point-id="0000"] circle:nth-of-type(1)'));
  const ringStroke = await strokeOf(editor.locator('[data-point-id="0000"] circle:nth-of-type(2)'));
  expect(ringStroke / outerStroke).toBeCloseTo(2 / 1.5, 3);

  // Now the finding. `MapCanvas.module.css` declares
  // `vector-effect: non-scaling-stroke` on exactly these glyphs, to keep a
  // 2-unit outline two SCREEN pixels wide at every zoom. It does not do that
  // here: the zoom is an ancestor CSS transform on `.stack`, which Blink does
  // not account for when it cancels a non-scaling stroke, so the outline is
  // painted at 2 RASTER units and scales with the picture like everything
  // else. Asserted as MEASURED — `stroke === 2 * zoom` — rather than relaxed
  // to something both behaviours would satisfy. When the rule is made
  // effective (drawing the overlay at the zoomed size instead of transforming
  // it, or carrying the zoom into the stroke width), this assertion is the one
  // that says so, and it should then become a constant 2 px.
  expect(ringStroke).toBeCloseTo(2 * fitted, 2);
  expect(visualBefore - geometryBefore.width).toBeCloseTo(2 * zoomBefore, 2);
  expect(visualAfter - geometryAfter.width).toBeCloseTo(2 * zoomAfter, 2);
  // Stated as the growth a reviewer would see: the outline is 3.86x heavier
  // after the same zoom that left the geometry untouched.
  expect((visualAfter - geometryAfter.width) / (visualBefore - geometryBefore.width)).toBeCloseTo(
    magnification,
    2,
  );

  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// Navigation: what a press on empty floor means.
// ---------------------------------------------------------------------------

test("floor-drag-pans: a primary drag over empty raster moves the picture and edits nothing", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  const from = await clientOf(editor, EMPTY_FLOOR);
  const to = { x: from.x + 60, y: from.y + 40 };
  const panBefore = await panOf(editor);
  const zoomBefore = await zoomOf(editor);
  const rasterBefore = await rasterBox(editor);

  await drag(page, from, to);

  const panAfter = await panOf(editor);
  // The whole displacement reaches the viewport: the primary press is only a
  // candidate until it passes the press slop, and the pan then takes the
  // displacement from the PRESS, not from the frame it crossed the threshold.
  expect(panAfter.x - panBefore.x).toBeCloseTo(60, 6);
  expect(panAfter.y - panBefore.y).toBeCloseTo(40, 6);
  // A pan is not a zoom, and the picture really moved on screen.
  expect(await zoomOf(editor)).toBeCloseTo(zoomBefore, 6);
  const rasterAfter = await rasterBox(editor);
  expect(rasterAfter.left - rasterBefore.left).toBeCloseTo(60, 1);
  expect(rasterAfter.top - rasterBefore.top).toBeCloseTo(40, 1);
  expect(rasterAfter.width).toBeCloseTo(rasterBefore.width, 3);

  // Nothing was edited and nothing was selected.
  await expect(editor.getByTestId("mc-vertex-count")).toHaveText("22");
  await expect(editor.getByTestId("mc-edge-count")).toHaveText("22");
  await expect(editor.getByTestId("mc-undo-depth")).toHaveText("0");
  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: none");
  expect(errors).toEqual([]);
});

test("shift-floor-drag-marquees: the same drag with Shift selects instead of panning", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  // A corner of the map with exactly two vertices in it: "0004" (elevator) and
  // "0016" (a path point). Zoom in about their midpoint so the rectangle is
  // big enough to be a drag rather than a click.
  const middle: WorldPoint = { x: -24.05, y: -17.8 };
  await zoomInAbout(page, editor, middle, 3);

  const from = await clientOf(editor, { x: -25.6, y: -15.6 });
  const to = await clientOf(editor, { x: -22.5, y: -19.8 });
  const panBefore = await panOf(editor);

  await page.mouse.move(from.x, from.y);
  await page.keyboard.down("Shift");
  // The grammar, not the demo, decides that this press takes a grip: with
  // Shift down the cursor over empty floor is already the marquee's.
  await expect(editor.getByTestId("mc-cursor")).toHaveText("cursor: marquee");
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await expect(editor.getByTestId("mc-marquee")).toHaveText("marquee: 2 candidates");
  await page.mouse.up();
  await page.keyboard.up("Shift");

  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: handle:0004,handle:0016");
  // It was a marquee INSTEAD of a pan: the picture did not move at all.
  expect(await panOf(editor)).toEqual(panBefore);
  await expect(editor.getByTestId("mc-undo-depth")).toHaveText("0");
  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// The editing grammar, on the real graph.
// ---------------------------------------------------------------------------

test("edge-click-selects: a click on the line between two stations names that line", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  // Edge "0005" runs from the path point "0013" to the station "0012" (xray),
  // 5.8 m of clear line with no other vertex within 2.5 m of its midpoint.
  const midpoint: WorldPoint = { x: (2.761 + 8.561) / 2, y: (-10.057 + -10.207) / 2 };
  await zoomInAbout(page, editor, midpoint, 2);

  const at = await clientOf(editor, midpoint);
  await page.mouse.move(at.x, at.y);
  // The line is a THING to this host: `capabilities.edges` is declared, so the
  // affordance under an unselected line is the path itself.
  await expect(editor.getByTestId("mc-affordance")).toHaveText("affordance: path");
  await page.mouse.click(at.x, at.y);

  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: path:0005");
  // ...and the selection NAMES it, in the vocabulary of the twin's own list.
  await expect(editor.getByTestId("mc-selection-primary")).toHaveText("line point 0013 → xray");
  await expect(editor.getByTestId("mc-selection-count")).toHaveText("1");
  // Selecting is not editing.
  await expect(editor.getByTestId("mc-undo-depth")).toHaveText("0");

  // ---- what the DECLARATION buys ---------------------------------------
  // The step above passes without `capabilities.edges` too: an UNARMED path's
  // click already selects the path in the base grammar (that is how
  // `direct-manipulation.e2e.spec.ts`'s second route is armed, and that demo
  // declares nothing). Verified by removing the declaration and watching this
  // test stay green — which is exactly the vacuous green this suite refuses.
  //
  // The declaration's own claim is about an ARMED line: without it, a click on
  // a line whose endpoint is already selected means `nothing`, because a
  // segment of an ordered route is not a thing anybody selects. Here the line
  // IS the thing. So: select one of its endpoints (which arms the line), then
  // click the line itself.
  const station: WorldPoint = { x: 8.561, y: -10.207 };
  const stationAt = await clientOf(editor, station);
  await page.mouse.click(stationAt.x, stationAt.y);
  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: handle:0012");

  await page.mouse.move(at.x, at.y);
  await expect(editor.getByTestId("mc-affordance")).toHaveText("affordance: path-edge");
  await page.mouse.click(at.x, at.y);
  // Without `capabilities.edges` the selection would still read
  // `handle:0012` here: the click would have meant nothing at all.
  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: path:0005");
  await expect(editor.getByTestId("mc-selection-primary")).toHaveText("line point 0013 → xray");
  await expect(editor.getByTestId("mc-undo-depth")).toHaveText("0");
  expect(errors).toEqual([]);
});

test("junction-is-not-special: a degree-3 vertex drags like any other, and all three lines follow", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  await disableMagnet(editor);

  // "0013" is an endpoint of edges "0004", "0005" and "0006". Nothing in the
  // editor knows the word "junction": the graph is one two-handle path per
  // edge, so a vertex simply belongs to three of them.
  const junction: WorldPoint = { x: 2.761, y: -10.057 };
  await zoomInAbout(page, editor, junction, 3);

  const at = await clientOf(editor, junction);
  await page.mouse.move(at.x, at.y);
  await expect(editor.getByTestId("mc-affordance")).toHaveText("affordance: handle");
  await page.mouse.click(at.x, at.y);
  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: handle:0013");

  const before = await vertexOf(editor, "0013");
  const neighbours = {
    "0008": await vertexOf(editor, "0008"),
    "0012": await vertexOf(editor, "0012"),
    "0014": await vertexOf(editor, "0014"),
  };
  const metres = await metresPerPixel(editor);
  const dragPx = { x: 55, y: -35 };
  await drag(page, at, { x: at.x + dragPx.x, y: at.y + dragPx.y });

  // It moved by exactly the pointer's displacement, converted at the live
  // scale — the same arithmetic at any zoom, which is the point of stating
  // tolerances in screen pixels.
  const after = await vertexOf(editor, "0013");
  expect(after.x - before.x).toBeCloseTo(dragPx.x * metres, 3);
  expect(after.y - before.y).toBeCloseTo(-dragPx.y * metres, 3);
  // One drag is one entry in the timeline, and it moved ONLY this vertex.
  await expect(editor.getByTestId("mc-undo-depth")).toHaveText("1");
  // Nothing was refused along the way: a gesture the grammar declined would
  // say so here rather than simply not happen.
  await expect(editor.getByTestId("mc-notice")).toHaveText("none");
  for (const [id, was] of Object.entries(neighbours)) {
    const now = await vertexOf(editor, id);
    expect({ id, x: now.x, y: now.y }).toEqual({ id, x: was.x, y: was.y });
  }

  // And all three incident lines are DRAWN at the new position: each has one
  // endpoint on it, to a tenth of a raster pixel.
  const expected = project(FRAME, after);
  for (const edgeId of ["0004", "0005", "0006"]) {
    const line = await drawnEdge(editor, edgeId);
    const ends = [
      { col: line.x1, row: line.y1 },
      { col: line.x2, row: line.y2 },
    ];
    const touching = ends.filter(
      (end) => Math.hypot(end.col - expected.col, end.row - expected.row) < 0.1,
    );
    expect({ edgeId, touching: touching.length }).toEqual({ edgeId, touching: 1 });
  }

  await editor.getByRole("button", { name: "Undo" }).click();
  expect(await vertexOf(editor, "0013")).toEqual(before);
  expect(errors).toEqual([]);
});

test("alt-click-deletes: a vertex and its incident lines go together, and undo brings both back", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  // "0000" is `home`, the end of two lines: "0000" (home → yoshin) and "0021"
  // (a path point → home).
  const home: WorldPoint = { x: -0.089, y: 0.043 };
  await zoomInAbout(page, editor, home, 3);
  const at = await clientOf(editor, home);

  await expect(editor.getByTestId("mc-vertex-count")).toHaveText("22");
  await expect(editor.getByTestId("mc-edge-count")).toHaveText("22");
  const edgesBefore = await edgesOf(editor);

  await page.keyboard.down("Alt");
  await page.mouse.move(at.x, at.y);
  // The grammar's own name for "this press removes what is under it".
  await expect(editor.getByTestId("mc-cursor")).toHaveText("cursor: pen-minus");
  await page.mouse.click(at.x, at.y);
  await page.keyboard.up("Alt");

  await expect(editor.getByTestId("mc-vertex-count")).toHaveText("21");
  await expect(editor.getByTestId("mc-edge-count")).toHaveText("20");
  const edgesAfter = await edgesOf(editor);
  expect(edgesBefore.filter((edge) => !edgesAfter.includes(edge))).toEqual([
    "0000:0000→0011",
    "0021:0021→0000",
  ]);
  // The lines are gone from the picture too, not just from the document.
  await expect(drawn(editor, '[data-point-id="0000"]')).toHaveCount(0);
  await expect(drawn(editor, '[data-edge-id="0000"]')).toHaveCount(0);
  await expect(drawn(editor, '[data-edge-id="0021"]')).toHaveCount(0);

  // One entry in the timeline for the vertex AND its lines: they left together.
  await expect(editor.getByTestId("mc-undo-depth")).toHaveText("1");
  await editor.getByRole("button", { name: "Undo" }).click();
  await expect(editor.getByTestId("mc-vertex-count")).toHaveText("22");
  await expect(editor.getByTestId("mc-edge-count")).toHaveText("22");
  expect(await edgesOf(editor)).toEqual(edgesBefore);
  await expect(editor.getByTestId("mc-redo-depth")).toHaveText("1");
  await expect(drawn(editor, '[data-edge-id="0021"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("dblclick-inserts: a double click on a line splits it in two at the point clicked", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  await disableMagnet(editor);

  // A point a third of the way along edge "0005", so "where it was clicked"
  // is distinguishable from "the middle of the line".
  const from: WorldPoint = { x: 2.761, y: -10.057 };
  const to: WorldPoint = { x: 8.561, y: -10.207 };
  const third: WorldPoint = { x: from.x + (to.x - from.x) / 3, y: from.y + (to.y - from.y) / 3 };
  await zoomInAbout(page, editor, third, 2);

  const at = await clientOf(editor, third);
  await page.mouse.click(at.x, at.y);
  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: path:0005");

  await page.mouse.dblclick(at.x, at.y);

  await expect(editor.getByTestId("mc-vertex-count")).toHaveText("23");
  await expect(editor.getByTestId("mc-edge-count")).toHaveText("23");
  const edges = await edgesOf(editor);
  expect(edges).not.toContain("0005:0013→0012");
  expect(edges).toContain("0005a0:0013→n0");
  expect(edges).toContain("0005b0:n0→0012");

  // The new vertex is where the operator pointed — within a pick radius, which
  // is the tolerance the insertion itself is resolved at.
  const inserted = await vertexOf(editor, "n0");
  const metres = await metresPerPixel(editor);
  expect(Math.hypot(inserted.x - third.x, inserted.y - third.y) / metres).toBeLessThan(9);
  // A path point, not a station: it carries no name and gets no heading.
  expect(inserted.kind).toBe("path-point");
  await expect(editor.getByTestId("mc-undo-depth")).toHaveText("1");
  // The editor refuses an insertion that names a segment other than the only
  // one a two-handle path has. It did not have to: this went in as an
  // ordinary split.
  await expect(editor.getByTestId("mc-notice")).toHaveText("none");
  // Both halves are drawn, and the line they replaced is not.
  await expect(drawn(editor, '[data-edge-id="0005"]')).toHaveCount(0);
  await expect(drawn(editor, '[data-edge-id="0005a0"]')).toHaveCount(1);
  await expect(drawn(editor, '[data-edge-id="0005b0"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("heading-knob-rotates: a station's knob writes its yaw, and a path point has none", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  // "0012" is `xray`, a station at the end of one long line — its knob has
  // clear space to swing in.
  const station: WorldPoint = { x: 8.561, y: -10.207 };
  await zoomInAbout(page, editor, station, 3);

  const at = await clientOf(editor, station);
  await page.mouse.click(at.x, at.y);
  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: handle:0012");

  // The knob is revealed by APPROACH, not by selection alone: it exists only
  // while the pointer is within the grammar's arming radius of its handle.
  await page.mouse.move(at.x, at.y);
  await expect(drawn(editor, '[data-knob-for="0012"]')).toHaveCount(1);

  const before = await vertexOf(editor, "0012");
  expect(before.yaw).toBeCloseTo(-0.53, 6);
  const metres = await metresPerPixel(editor);
  // Where the knob is: the arm is 26 screen pixels long, laid along the yaw.
  const armM = 26 * metres;
  const knob = await clientOf(editor, {
    x: before.x + armM * Math.cos(before.yaw),
    y: before.y + armM * Math.sin(before.yaw),
  });
  await page.mouse.move(knob.x, knob.y);
  await expect(editor.getByTestId("mc-affordance")).toHaveText("affordance: knob");

  // Swing it to due north. The yaw is read from the pointer's bearing off the
  // handle, so the target is stated in world metres and converted once.
  const northOfStation = await clientOf(editor, { x: before.x, y: before.y + 1.5 });
  await drag(page, knob, northOfStation);

  const after = await vertexOf(editor, "0012");
  expect(after.yaw).toBeCloseTo(Math.PI / 2, 2);
  // A rotation moves nothing.
  expect(after.x).toBeCloseTo(before.x, 6);
  expect(after.y).toBeCloseTo(before.y, 6);
  await expect(editor.getByTestId("mc-undo-depth")).toHaveText("1");
  await editor.getByRole("button", { name: "Undo" }).click();
  expect((await vertexOf(editor, "0012")).yaw).toBeCloseTo(-0.53, 6);

  // A PATH POINT has no facing, so it has no knob — stated by the scene (only
  // a handle with a yaw gets one), not special-cased at the drawing.
  const pathPoint: WorldPoint = { x: 2.761, y: -10.057 };
  const pathAt = await clientOf(editor, pathPoint);
  await page.mouse.click(pathAt.x, pathAt.y);
  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: handle:0013");
  await page.mouse.move(pathAt.x, pathAt.y);
  await expect(drawn(editor, "[data-knob-for]")).toHaveCount(0);
  expect(errors).toEqual([]);
});
