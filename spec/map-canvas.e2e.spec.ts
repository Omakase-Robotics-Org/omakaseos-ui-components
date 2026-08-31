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
 * ## What the affordances are DRAWN as, since v0.20
 *
 * There are no `<circle>` handles any more. Every glyph body carries
 * `data-edit-glyph` ("anchor" | "place" | "ghost" | "knob" | "badge" | the
 * three snap marks) and is drawn AT THE ORIGIN, positioned by a
 * `translate(...) scale(...)` on its placement group, so there is no `cx`,
 * `cy` or `r` to read anywhere: an anchor is a 7 px `<rect>`, and a place is
 * that same rect rotated 45° into a diamond. The `primary` annotation is a
 * `<circle data-edit-annotation="primary">` ABOUT the anchor, not a larger
 * anchor. So this file locates a drawn body by that role attribute, never by
 * tag and never by `nth-of-type`, and it reads POSITION from measured
 * rectangles rather than from geometry attributes.
 *
 * ## Two ways to measure a drawn shape, and why BOTH are used
 *
 * For an SVG shape, Blink's `Element.getBoundingClientRect()` returns the
 * shape's GEOMETRY mapped to the viewport and EXCLUDES the stroke, while
 * Playwright's `Locator.boundingBox()` (CDP `DOM.getBoxModel`) returns the
 * VISUAL box and INCLUDES it. That is not a nuisance here — it is the
 * measuring instrument. The difference between the two, on one element, is
 * exactly that element's painted stroke width in screen pixels — for an
 * AXIS-ALIGNED shape; a mitred corner on a rotated one inflates it, which is
 * why the two declared weights are confirmed on the unrotated anchor and the
 * annotation circle of ONE path point inside `screen-constant-handles` below,
 * rather than on the rotated diamond a station is drawn as.
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
  // The glyphs transition their paint over --ds-transition-fast; wait for the
  // drawn picture to settle rather than measure an animation frame.
  await settle(editor);
}

/**
 * Wait until nothing in the editor is still animating.
 *
 * A glyph body transitions its PAINT over `--ds-transition-fast` (120 ms), and
 * the counter-scale on its placement group is rewritten on every zoom — so a
 * measurement taken right after a wheel event can read a frame from the MIDDLE
 * of a transition. That is not a hypothetical: before v0.20 the ring
 * transitioned its `r`, and the first run of this spec measured 22.15 px and
 * 41.90 px for a shape that settles at one size. Polling for a value that
 * "stops changing" is not enough either (an ease-out's last frames differ by
 * less than the reading), so this asks the browser directly which transitions
 * are still running.
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

/**
 * Every station name currently DRAWN, with the screen rectangle it occupies.
 *
 * The rectangle is Blink's own for the `<text>` element, not one recomputed
 * from the editor's arithmetic: the point of the assertion below is that the
 * PAINTED words do not touch, so a box derived from the same numbers the
 * suppression used would prove only that the arithmetic agrees with itself.
 */
async function labelBoxes(
  editor: Locator,
): Promise<{ readonly id: string; readonly text: string; readonly box: Box }[]> {
  return drawn(editor, "[data-station-label]").evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        id: element.getAttribute("data-station-label") ?? "?",
        text: element.textContent ?? "",
        box: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      };
    }),
  );
}

/** Every pair of the given boxes that share any area, named for the failure message. */
function collidingPairs(
  labels: readonly { readonly text: string; readonly box: Box }[],
): string[] {
  const collisions: string[] = [];
  for (let i = 0; i < labels.length; i += 1) {
    for (let j = i + 1; j < labels.length; j += 1) {
      const a = labels[i];
      const b = labels[j];
      if (a === undefined || b === undefined) {
        continue;
      }
      if (
        a.box.left < b.box.left + b.box.width &&
        b.box.left < a.box.left + a.box.width &&
        a.box.top < b.box.top + b.box.height &&
        b.box.top < a.box.top + a.box.height
      ) {
        collisions.push(`${a.text} x ${b.text}`);
      }
    }
  }
  return collisions;
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

/** `home` (vertex "0000"), the station most of these tests work on. */
const HOME: WorldPoint = { x: -0.089, y: 0.043 };

/**
 * The clear WEST of the map, where everything drawn by the tests below goes.
 *
 * The whole road graph lies east of x = -25 m and the raster spans x ∈
 * [-52.67, 17.93] and y ∈ [-32.69, 8.51], so these positions are on mapped
 * floor with no vertex, line or seeded area within 9 m of them — far enough
 * that no click can be caught by something that was already there, and the
 * magnet has nothing to snap to.
 */
const FLOOR_A: WorldPoint = { x: -46.5, y: 2.5 };
const FLOOR_B: WorldPoint = { x: -40.5, y: 2.5 };
const WALL_A: WorldPoint = { x: -46.5, y: -2.5 };
const WALL_B: WorldPoint = { x: -34.5, y: -2.5 };
const WALL_MID: WorldPoint = { x: -40.5, y: -2.5 };
const ZONE_RUN: readonly WorldPoint[] = [
  { x: -46.5, y: -8 },
  { x: -38.5, y: -8 },
  { x: -38.5, y: -14 },
];

/**
 * The keys the document model allocates to the FIRST thing these tests create.
 *
 * The seed leaves `sequence` at 4 (two keep-out entries and two zones, keyed 0
 * to 3), and `newKey` spells a session key `new:<kind>:<sequence>` — the
 * console's own spelling. Restated here rather than matched loosely so a
 * change of id shape is a failure and not a silently weaker assertion.
 */
const NEW_KEEP_OUT = "new:keepout:4";
const NEW_ZONE = "new:splice:4";
const NEW_EDGE = "new:edge:4";

/** Arm one of the four editing modes through its own button. */
async function armMode(
  editor: Locator,
  mode: "direct" | "append" | "draw-keep-out" | "draw-zone",
): Promise<void> {
  await editor.locator(`[data-mode="${mode}"]`).click();
  await expect(editor.locator(`[data-mode="${mode}"]`)).toHaveAttribute("aria-pressed", "true");
}

/**
 * The selection's own controls, over the map.
 *
 * Scoped, because `TargetActions` is rendered TWICE from one definition — here
 * and in the twin's inspector — so an unscoped `getByRole` would be strict-mode
 * ambiguous. This bar is the route a mouse operator has, which is the one these
 * tests drive.
 */
function selectionBar(editor: Locator): Locator {
  return editor.locator('[data-selection-actions="true"]');
}

/** Click a world position on the raster. */
async function clickWorld(page: Page, editor: Locator, at: WorldPoint): Promise<void> {
  const point = await clientOf(editor, at);
  await page.mouse.click(point.x, point.y);
}

/** One committed station's own name, as the document holds it. */
async function labelOf(editor: Locator, id: string): Promise<string> {
  return (
    (await editor
      .locator(`[data-testid="mc-point"][data-id="${id}"]`)
      .getAttribute("data-label")) ?? ""
  );
}

/** One committed keep-out entry: how many corners it has, and what that makes it. */
async function keepOutOf(
  editor: Locator,
  id: string,
): Promise<{ points: number; kind: string }> {
  const locator = editor.locator(`[data-testid="mc-keepout"][data-id="${id}"]`);
  return {
    points: await numberOf(locator, "data-points"),
    kind: (await locator.getAttribute("data-kind")) ?? "",
  };
}

/** The `oneWay` numeral the drawn line's own group carries. */
async function drawnOneWay(editor: Locator, id: string): Promise<string> {
  return editor.locator(`[data-edge-id="${id}"]`).evaluate((element) => {
    const group = element.parentElement;
    if (group === null) {
      throw new Error("a drawn line has no group to carry its direction");
    }
    return group.getAttribute("data-one-way") ?? "";
  });
}

/** The centre of one drawn glyph body, in client pixels. */
async function glyphCentre(locator: Locator): Promise<Point> {
  return locator.locator("[data-edit-glyph]").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
}

/**
 * Draw a two-point keep-out entry — a virtual WALL — and finish it.
 *
 * Two corners is the whole of what makes it a wall (`keepOutKindOf`: the point
 * count decides), so this is also the only way to make one.
 */
async function drawWall(page: Page, editor: Locator): Promise<void> {
  // The magnet off, so the corners land exactly where they were dropped and
  // {@link WALL_MID} really is the drawn segment's midpoint. With it on they
  // would not: the geometry snap includes ALIGNMENT candidates, and the seeded
  // keep-out wall sits at y = 1.643 m, which is within one snap radius of this
  // clear floor at the fitted zoom — measured, after a placement came out
  // 0.857 m north of where it was clicked.
  await disableMagnet(editor);
  await armMode(editor, "draw-keep-out");
  await expect(editor.getByTestId("mc-mode")).toHaveText("draw-area");
  await clickWorld(page, editor, WALL_A);
  await expect(editor.getByTestId("mc-run-length")).toHaveText("1");
  await clickWorld(page, editor, WALL_B);
  await expect(editor.getByTestId("mc-run-length")).toHaveText("2");
  await editor.getByRole("button", { name: "Finish" }).click();
  await expect(editor.getByTestId("mc-keepout-count")).toHaveText("3");
  await expect(editor.getByTestId("mc-notice")).toHaveText("none");
}

/**
 * The most crowded corner of the label set: `entranceinsmall` (0008),
 * `entranceoutsmall` (0009) and `keisoku` (0010) sit within three metres of
 * each other, so a zoom about here separates the names that the fitted view
 * has to hold back.
 */
const LABEL_CROWD: WorldPoint = { x: 2.9, y: -6.2 };

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

test("screen-constant-handles: the drawn geometry AND its outline hold their size across a zoom", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  // "0000" is `home`, the handle the demo also nominates for its own
  // measurement readout. Park the pointer ON it and zoom about it: the handle
  // stays under the pointer (proved above), so its hover state — and therefore
  // its paint — is identical at both measurements, and the comparison is of
  // one glyph with itself.
  //
  // `home` is a STATION, so its body is the anchor rect rotated 45° into a
  // place's diamond. Nothing below depends on which of the two it is: the
  // element is located by `data-edit-glyph`, and the assertions are about that
  // one element's size not changing.
  const home: WorldPoint = { x: -0.089, y: 0.043 };
  const glyph = drawn(editor, '[data-point-id="0000"] [data-edit-glyph]');
  await expect(glyph).toHaveCount(1);
  const at = await clientOf(editor, home);
  await page.mouse.move(at.x, at.y);
  await expect(editor.getByTestId("mc-affordance")).toHaveText("affordance: handle");
  await settle(editor);

  const geometryAt = async (): Promise<Box> =>
    glyph.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    });
  const visualWidthAt = async (): Promise<number> => {
    const box = await glyph.boundingBox();
    if (box === null) {
      throw new Error("the nominated handle is not measurable");
    }
    return box.width;
  };

  const zoomBefore = await zoomOf(editor);
  const geometryBefore = await geometryAt();
  const visualBefore = await visualWidthAt();

  // The demo measures the same element from inside the page. Two independent
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
  // counter-scale would produce.
  expect(geometryAfter.width).toBeCloseTo(geometryBefore.width, 1);
  expect(geometryAfter.height).toBeCloseTo(geometryBefore.height, 1);
  expect(Math.abs(geometryAfter.width - geometryBefore.width)).toBeLessThan(0.05);
  // And the whole painted box, outline included, is the same width too — so
  // the mark did not grow by having its outline scaled either.
  expect(Math.abs(visualAfter - visualBefore)).toBeLessThan(0.05);
  // And it stayed where the pointer was, so this is the same handle in the
  // same place, not a different one that happens to be the same size. One
  // pixel, for the transform-rounding residual the zoom-at-cursor test
  // measures (0.43 px over these three notches).
  expect(Math.abs(geometryAfter.left - geometryBefore.left)).toBeLessThan(1);
  expect(Math.abs(geometryAfter.top - geometryBefore.top)).toBeLessThan(1);

  // ---- 2. And neither does the STROKE. ---------------------------------
  // `getBoundingClientRect` excludes the stroke and Playwright's boundingBox
  // includes it, so the difference is the painted outline in screen pixels.
  // The outline is what `MapCanvas.module.css` declares
  // `vector-effect: non-scaling-stroke` for: an `Edit*` glyph states its
  // weight in SCREEN pixels (`--ds-edit-stroke` 1.5 for an anchor body,
  // `--ds-edit-hairline` 1 for the primary annotation ring), and the props
  // carry no stroke width, so the stylesheet is the only place that can say
  // so.
  //
  // That declaration used to LAND and do NOTHING. The zoom was an ancestor
  // CSS transform on `.stack`, and Blink cancels a non-scaling stroke against
  // the CTM INSIDE the `<svg>` alone — which was the identity, because the
  // overlay was laid out at the raster's own pixel size. `getComputedStyle`
  // reported `non-scaling-stroke` and the outline was painted `2 * zoom` px
  // wide anyway: 1.700 px at 0.8499, 6.557 at 3.2783, 25.291 at 12.6457 —
  // at that last one a handle's outline is WIDER than the handle it outlines.
  // `MapCanvas` now applies the zoom as the drawn SIZE of the stack (the image
  // and the overlay fill it) and the pan as the only transform, so the zoom
  // lives in the overlay's own viewBox mapping, which is exactly the mapping
  // the cancellation is defined against.
  //
  // Asserted as CONSTANT — not as a ratio and not as a range both behaviours
  // would satisfy. `1.5 * zoom` is off at the fitted zoom and by 17 px at
  // 12.6x, so the old behaviour fails every one of these.
  const strokeOf = async (locator: Locator): Promise<number> => {
    const geometry = await locator.evaluate((element) => element.getBoundingClientRect().width);
    const visual = await locator.boundingBox();
    if (visual === null) {
      throw new Error("SVG shape is not measurable");
    }
    return visual.width - geometry;
  };
  // The hovered handle, at the two zooms already measured above. `home` is a
  // place, so its body is the rect rotated 45°: the difference here is the
  // 1.5 px stroke inflated by the mitre at a 90° corner (1.5 * SQRT2), which
  // is arithmetic about a rotation rather than about the declared weight. So
  // it is asserted as UNCHANGED across the zoom and the absolute weights are
  // taken below off shapes whose bounding box the stroke enters squarely.
  expect(visualAfter - geometryAfter.width).toBeCloseTo(
    visualBefore - geometryBefore.width,
    2,
  );
  expect((visualAfter - geometryAfter.width) / (visualBefore - geometryBefore.width)).toBeCloseTo(
    1,
    2,
  );
  expect(magnification).toBeGreaterThan(3);

  // The distinct weights must SURVIVE the fix: the anchor body is declared 1.5
  // and the primary annotation ring 1, and a repair that flattened every
  // stroke to one number would be a visual regression that a constant-stroke
  // assertion alone cannot see. So both are measured, at three zooms spanning
  // 14.9x, and each holds its own declared value.
  //
  // Measured on "0013" — a PATH POINT, so its body is the anchor rect
  // UNROTATED and the stroke enters its bounding box squarely: the difference
  // is then exactly the declared weight, with no mitre term. The annotation
  // circle is a circle at any rotation, so it needs no such care.
  await editor.getByRole("button", { name: "Fit" }).click();
  await settle(editor);
  const pathPoint: WorldPoint = { x: 2.761, y: -10.057 };
  const pathAt = await clientOf(editor, pathPoint);
  await page.mouse.click(pathAt.x, pathAt.y);
  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: handle:0013");
  await settle(editor);
  const body = drawn(editor, '[data-point-id="0013"] [data-edit-glyph]');
  const annotation = drawn(editor, '[data-point-id="0013"] [data-edit-annotation="primary"]');
  await expect(body).toHaveCount(1);
  await expect(annotation).toHaveCount(1);
  const sampled: { readonly zoom: number; readonly body: number; readonly ring: number }[] = [];
  // Three samples spanning 14.9x, stopping short of MAX_ZOOM: `zoomInAbout`
  // waits for each notch to CHANGE the zoom, so a sample past the clamp would
  // wait for a change that cannot come.
  for (const notches of [0, 3, 3]) {
    if (notches > 0) {
      await zoomInAbout(page, editor, pathPoint, notches);
    }
    sampled.push({
      zoom: await zoomOf(editor),
      body: await strokeOf(body),
      ring: await strokeOf(annotation),
    });
  }
  const first = sampled.at(0);
  const last = sampled.at(-1);
  if (first === undefined || last === undefined) {
    throw new Error("no stroke samples were taken");
  }
  expect(last.zoom / first.zoom).toBeGreaterThan(10);
  for (const sample of sampled) {
    expect(sample.body).toBeCloseTo(1.5, 2);
    expect(sample.ring).toBeCloseTo(1, 2);
    // Distinct, and distinct in the declared proportion — not merely both
    // "about a pixel".
    expect(sample.body / sample.ring).toBeCloseTo(1.5, 2);
    expect(sample.body - sample.ring).toBeCloseTo(0.5, 2);
  }

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
  // The glyph between the two ends is the line's DIRECTION (`edgeLabel`):
  // "↔" because this line is bidirectional, "→"/"←" once an operator sets
  // `oneWay` — which `edge-direction-cycles` below drives.
  await expect(editor.getByTestId("mc-selection-primary")).toHaveText("line point 0013 ↔ xray");
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
  await expect(editor.getByTestId("mc-selection-primary")).toHaveText("line point 0013 ↔ xray");
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
  // The ids the document model allocates: a split's vertex takes the next FREE
  // vendor id (`nextPointId` — highest-plus-one, so "0022" in a scene holding
  // "0000".."0021"), and each half-line takes a session key from the
  // document's own allocation counter (`newKey`, which the seed left at 4).
  // Both are the console's own spelling; nothing here invents an id shape.
  expect(edges).toContain("new:edge:4:0013→0022");
  expect(edges).toContain("new:edge:5:0022→0012");

  // The new vertex is where the operator pointed — within a pick radius, which
  // is the tolerance the insertion itself is resolved at.
  const inserted = await vertexOf(editor, "0022");
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
  await expect(drawn(editor, '[data-edge-id="new:edge:4"]')).toHaveCount(1);
  await expect(drawn(editor, '[data-edge-id="new:edge:5"]')).toHaveCount(1);
  // The new vertex is SELECTED, so the operator can drag the point they just
  // made without hunting for it first.
  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: handle:0022");
  await expect(drawn(editor, '[data-point-id="0022"]')).toHaveCount(1);
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

// ---------------------------------------------------------------------------
// Labels: the map-renderer's rule, in a real browser's text metrics.
// ---------------------------------------------------------------------------

test("station-labels-never-overprint: a name with no room is dropped, and zooming in brings it back", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  await settle(editor);

  // The map opens fitted, and at that zoom thirteen station names are longer
  // than the distances between the stations: `entrancein` and `entranceout`
  // used to print on top of each other as "entranceinceout", with `keisoku`,
  // `entranceinsmall` and `entranceoutsmall` lying across the lines and each
  // other. A label that cannot find clear space is now not drawn at all.
  const fitted = await labelBoxes(editor);
  const fittedZoom = await zoomOf(editor);
  expect(collidingPairs(fitted), {
    message: `at zoom ${fittedZoom.toFixed(4)} these station labels overprint each other`,
  } as never).toEqual([]);
  // Not vacuous in either direction: some names are drawn, and some are held
  // back. (If every one of the thirteen fitted, this assertion would be
  // measuring a map that never had the problem.)
  expect(fitted.length).toBeGreaterThan(1);
  expect(fitted.length).toBeLessThan(13);

  // Zooming in is what an operator does to read a crowded area, and it is the
  // gesture the rule answers: the same names, further apart, so more of them
  // fit. Strictly more, and still none of them touching.
  await zoomInAbout(page, editor, LABEL_CROWD, 3);
  const closer = await labelBoxes(editor);
  expect(await zoomOf(editor)).toBeGreaterThan(fittedZoom);
  expect(closer.length).toBeGreaterThan(fitted.length);
  expect(collidingPairs(closer)).toEqual([]);
  // And zooming in only ever ADDS: a name that was readable does not vanish
  // because the picture grew under it.
  const closerIds = new Set(closer.map((label) => label.id));
  expect(fitted.filter((label) => !closerIds.has(label.id))).toEqual([]);

  // The selected station's name is drawn whatever it collides with — the
  // operator named that one. `entrancein` (0007) is one of the names the
  // fitted view holds back, and it is held back by `entranceout` (0001),
  // which the priority order places first. Selecting it inverts exactly that
  // pair: the chosen name appears and the one that had displaced it gives way.
  await editor.getByRole("button", { name: "Fit" }).click();
  await settle(editor);
  const before = await labelBoxes(editor);
  expect(before.map((label) => label.id)).toContain("0001");
  expect(before.map((label) => label.id)).not.toContain("0007");
  await editor.getByRole("button", { name: "◉ entrancein", exact: true }).click();
  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: handle:0007");
  await settle(editor);
  const after = await labelBoxes(editor);
  expect(after.map((label) => label.id)).toContain("0007");
  expect(after.map((label) => label.id)).not.toContain("0001");
  expect(collidingPairs(after)).toEqual([]);

  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// Full element CRUD, on the real graph, through the gestures an operator has.
//
// Every test below drives ONE of the operations the editor claims and asserts
// on the committed document rather than on the picture alone — a drawn mark
// that moved is not the same statement as a document that changed, and only
// the second one is what the robot would be given.
// ---------------------------------------------------------------------------

test("point-create-sustained: Add points places a vertex and the pen survives its own placement", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  // The magnet off: this test is about WHERE a click puts a vertex, and with
  // the magnet on it would not be where it was clicked. The geometry snap
  // includes ALIGNMENT candidates, and the seeded keep-out wall's corners sit
  // at y = 1.643 m — within one snap radius (10 screen px ≈ 1.18 m at the
  // fitted zoom) of this clear floor, so the first run of this test placed the
  // vertex 0.857 m north of the pointer, aligned to that wall. Correct
  // behaviour, and not the behaviour under test here.
  await disableMagnet(editor);

  await armMode(editor, "append");
  await expect(editor.getByTestId("mc-mode")).toHaveText("append");
  await expect(editor.getByTestId("mc-run-length")).toHaveText("0");

  // First click: one vertex, and nothing to join it to yet.
  await clickWorld(page, editor, FLOOR_A);
  await expect(editor.getByTestId("mc-vertex-count")).toHaveText("23");
  await expect(editor.getByTestId("mc-edge-count")).toHaveText("22");
  await expect(editor.getByTestId("mc-notice")).toHaveText("none");

  // The pen is still armed WITHOUT touching the toolbar, and it holds the run's
  // anchor — this is the "sustained" rhythm the surface declares, and the
  // difference between drawing a corridor and pressing a button per point.
  await expect(editor.getByTestId("mc-mode")).toHaveText("append");
  await expect(editor.locator('[data-mode="append"]')).toHaveAttribute("aria-pressed", "true");
  await expect(editor.getByTestId("mc-run-length")).toHaveText("1");

  // Second click: another vertex, and the leg that joins it to the last.
  await clickWorld(page, editor, FLOOR_B);
  await expect(editor.getByTestId("mc-vertex-count")).toHaveText("24");
  await expect(editor.getByTestId("mc-edge-count")).toHaveText("23");
  await expect(editor.getByTestId("mc-mode")).toHaveText("append");

  // The vertices are where they were clicked, and they are STATIONS: the
  // default the mode opens on, which is what the "New: station" control is
  // pressed for.
  const metres = await metresPerPixel(editor);
  const first = await vertexOf(editor, "0022");
  const second = await vertexOf(editor, "0023");
  expect(Math.hypot(first.x - FLOOR_A.x, first.y - FLOOR_A.y) / metres).toBeLessThan(1);
  expect(Math.hypot(second.x - FLOOR_B.x, second.y - FLOOR_B.y) / metres).toBeLessThan(1);
  expect(first.kind).toBe("station");
  expect(second.kind).toBe("station");
  // ...and they are DRAWN, as places (a station carries a facing) rather than
  // as bare anchors.
  await expect(drawn(editor, '[data-point-id="0022"] [data-edit-glyph="place"]')).toHaveCount(1);
  await expect(drawn(editor, '[data-point-id="0023"] [data-edit-glyph="place"]')).toHaveCount(1);
  expect(await edgesOf(editor)).toContain(`${NEW_EDGE}:0022→0023`);

  // Two clicks, two timeline steps: each placement is its own undo.
  await expect(editor.getByTestId("mc-undo-depth")).toHaveText("2");
  await editor.getByRole("button", { name: "Undo" }).click();
  await expect(editor.getByTestId("mc-vertex-count")).toHaveText("23");
  await expect(editor.getByTestId("mc-edge-count")).toHaveText("22");
  expect(errors).toEqual([]);
});

test("point-rename: the selection's own field names a station, and the canvas prints it", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  // Zoom about `home` first: at the fitted zoom its neighbour "0021" is only
  // 10 screen pixels away and the pick radius is 9, so a click there is a
  // coin toss between two vertices rather than a test of renaming.
  await zoomInAbout(page, editor, HOME, 3);
  await clickWorld(page, editor, HOME);
  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: handle:0000");
  expect(await labelOf(editor, "0000")).toBe("home");
  await expect(drawn(editor, '[data-station-label="0000"]')).toHaveText("home");

  // Renaming has no pointer gesture — a name is typed — so it lives in the
  // selection's own controls over the map. There is no keyboard route into the
  // canvas at all, which is exactly why the chrome has to carry this.
  const controls = selectionBar(editor);
  await expect(controls).toHaveCount(1);
  const field = controls.getByRole("textbox", { name: "Name of station 0000" });
  await field.fill("hangar");
  await controls.getByRole("button", { name: "Rename" }).click();

  expect(await labelOf(editor, "0000")).toBe("hangar");
  // The canvas is the surface an operator reads, so the assertion that matters
  // is the printed word — not just the document field behind it.
  await expect(drawn(editor, '[data-station-label="0000"]')).toHaveText("hangar");
  await expect(editor.getByTestId("mc-selection-primary")).toHaveText("hangar");
  await expect(editor.getByTestId("mc-undo-depth")).toHaveText("1");
  await expect(editor.getByTestId("mc-notice")).toHaveText("none");

  // And it comes back: a rename is one step of the same timeline every other
  // edit is on.
  await editor.getByRole("button", { name: "Undo" }).click();
  expect(await labelOf(editor, "0000")).toBe("home");
  await expect(drawn(editor, '[data-station-label="0000"]')).toHaveText("home");
  expect(errors).toEqual([]);
});

test("point-retype: a station becomes a path point and loses its name and its facing", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  await zoomInAbout(page, editor, HOME, 3);
  await clickWorld(page, editor, HOME);
  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: handle:0000");

  const before = await vertexOf(editor, "0000");
  expect(before.kind).toBe("station");
  expect(await labelOf(editor, "0000")).toBe("home");
  // Non-zero, so "the yaw was dropped" is a statement about a real facing and
  // not about a field that was already 0.
  expect(before.yaw).toBeCloseTo(-0.055, 6);
  await expect(drawn(editor, '[data-point-id="0000"] [data-edit-glyph="place"]')).toHaveCount(1);

  const controls = selectionBar(editor);
  await controls.getByRole("button", { name: "Make path point" }).click();

  // A path point is a coordinate the chassis drives THROUGH: it carries no
  // name and no facing, and the two are not two spellings of one thing.
  const asPath = await vertexOf(editor, "0000");
  expect(asPath.kind).toBe("path-point");
  expect(asPath.yaw).toBe(0);
  expect(await labelOf(editor, "0000")).toBe("");
  // It moved nowhere.
  expect(asPath.x).toBeCloseTo(before.x, 6);
  expect(asPath.y).toBeCloseTo(before.y, 6);
  // The picture says the same thing: the diamond is an anchor now, the printed
  // name is gone, and there is no field to type a name into.
  await expect(drawn(editor, '[data-point-id="0000"] [data-edit-glyph="anchor"]')).toHaveCount(1);
  await expect(drawn(editor, '[data-point-id="0000"] [data-edit-glyph="place"]')).toHaveCount(0);
  await expect(drawn(editor, '[data-point-id="0000"][data-point-kind="path-point"]')).toHaveCount(1);
  await expect(drawn(editor, '[data-station-label="0000"]')).toHaveCount(0);
  await expect(controls.getByRole("textbox")).toHaveCount(0);

  // ...and back. The name is NOT resurrected: it was removed from the
  // document, and a retype cannot know what the operator called it.
  await controls.getByRole("button", { name: "Make station" }).click();
  const asStation = await vertexOf(editor, "0000");
  expect(asStation.kind).toBe("station");
  expect(await labelOf(editor, "0000")).toBe("");
  await expect(drawn(editor, '[data-point-id="0000"] [data-edit-glyph="place"]')).toHaveCount(1);
  // Being a station again is what gives it a field to be named in.
  await expect(controls.getByRole("textbox", { name: "Name of station 0000" })).toHaveCount(1);
  await expect(editor.getByTestId("mc-undo-depth")).toHaveText("2");
  await expect(editor.getByTestId("mc-notice")).toHaveText("none");
  expect(errors).toEqual([]);
});

test("edge-create: in Add points, two clicks on existing vertices join them", async ({ page }) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  // "0011" (yoshin) and "0012" (xray) are both in the scene and are NOT
  // joined — the pair the pen has to be able to connect without placing
  // anything. Each is more than 3 m from its nearest neighbour, so a click at
  // the fitted zoom lands on the intended one.
  const yoshin: WorldPoint = { x: 3.461, y: 1.343 };
  const xray: WorldPoint = { x: 8.561, y: -10.207 };
  expect(await edgesOf(editor)).not.toContain(`${NEW_EDGE}:0011→0012`);

  await armMode(editor, "append");
  // A click that lands ON an existing vertex MEANS that vertex: the magnet
  // resolves it to the vertex's own position and the document reads that
  // coincidence, which is why the same pen both places and joins.
  await clickWorld(page, editor, yoshin);
  await expect(editor.getByTestId("mc-vertex-count")).toHaveText("22");
  await expect(editor.getByTestId("mc-run-length")).toHaveText("1");
  await expect(editor.getByTestId("mc-undo-depth")).toHaveText("0");

  await clickWorld(page, editor, xray);

  // One line, no new vertex: it JOINED rather than placed.
  await expect(editor.getByTestId("mc-edge-count")).toHaveText("23");
  await expect(editor.getByTestId("mc-vertex-count")).toHaveText("22");
  expect(await edgesOf(editor)).toContain(`${NEW_EDGE}:0011→0012`);
  await expect(drawn(editor, `[data-edge-id="${NEW_EDGE}"]`)).toHaveCount(1);
  await expect(editor.getByTestId("mc-undo-depth")).toHaveText("1");
  await expect(editor.getByTestId("mc-notice")).toHaveText("none");

  // A second attempt at the same pair is REFUSED, not silently duplicated: one
  // pair of vertices holds one line whichever way round it is stated.
  await clickWorld(page, editor, yoshin);
  await expect(editor.getByTestId("mc-notice")).toContainText("already joined by a line");
  await expect(editor.getByTestId("mc-edge-count")).toHaveText("23");
  expect(errors).toEqual([]);
});

test("edge-direction-cycles: Direction walks oneWay 0-1-2-0 and the drawn line follows", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  // Edge "0005", the same clear 5.8 m of line `edge-click-selects` uses.
  const midpoint: WorldPoint = { x: (2.761 + 8.561) / 2, y: (-10.057 + -10.207) / 2 };
  await zoomInAbout(page, editor, midpoint, 2);
  await clickWorld(page, editor, midpoint);
  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: path:0005");

  const controls = selectionBar(editor);
  const direction = controls.getByRole("button", { name: /^Direction:/ });
  const arrow = drawn(editor, '[data-one-way] path');

  // Bidirectional to begin with: the numeral the vendor's wire carries is "0",
  // and a two-way line is drawn with no arrow at all.
  expect(await drawnOneWay(editor, "0005")).toBe("0");
  await expect(direction).toHaveText("Direction: Bidirectional");
  await expect(arrow).toHaveCount(0);

  // 0 -> 1: source to destination.
  await direction.click();
  expect(await drawnOneWay(editor, "0005")).toBe("1");
  await expect(direction).toHaveText("Direction: One way, source to destination");
  await expect(arrow).toHaveCount(1);
  // The name the twin and the readout give the line carries the direction too,
  // so the fact is not only in an attribute.
  await expect(editor.getByTestId("mc-selection-primary")).toHaveText("line point 0013 → xray");

  // 1 -> 2: destination to source. Still one arrow, pointing the other way.
  await direction.click();
  expect(await drawnOneWay(editor, "0005")).toBe("2");
  await expect(direction).toHaveText("Direction: One way, destination to source");
  await expect(arrow).toHaveCount(1);
  await expect(editor.getByTestId("mc-selection-primary")).toHaveText("line point 0013 ← xray");

  // 2 -> 0: back to two-way, and the arrow goes.
  await direction.click();
  expect(await drawnOneWay(editor, "0005")).toBe("0");
  await expect(direction).toHaveText("Direction: Bidirectional");
  await expect(arrow).toHaveCount(0);
  await expect(editor.getByTestId("mc-selection-primary")).toHaveText("line point 0013 ↔ xray");

  // Three presses, three timeline steps, and no refusal on the way round.
  await expect(editor.getByTestId("mc-undo-depth")).toHaveText("3");
  await expect(editor.getByTestId("mc-notice")).toHaveText("none");
  expect(errors).toEqual([]);
});

test("keepout-wall-is-selectable: a two-point entry is drawn as a line and can be clicked", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  await drawWall(page, editor);

  // Two corners is the whole of what makes it a wall: the point count decides,
  // and `keepOutKindOf` is where that is stated.
  expect(await keepOutOf(editor, NEW_KEEP_OUT)).toEqual({ points: 2, kind: "wall" });

  // Drawn as a `<line>`, not as a polygon — a wall has no interior to fill.
  const shape = drawn(editor, `[data-area-id="${NEW_KEEP_OUT}"]`);
  await expect(shape).toHaveCount(1);
  expect(await shape.evaluate((element) => element.tagName.toLowerCase())).toBe("line");
  await expect(shape).toHaveAttribute("data-area-kind", "keep-out");

  // It is selected the moment it is committed...
  await expect(editor.getByTestId("mc-selection")).toHaveText(
    `selection: path:ring:${NEW_KEEP_OUT}`,
  );

  // ...which proves nothing about whether an operator can ever click it again,
  // and that is the case this test exists for. The grammar offers a committed
  // AREA's corners only once the area is armed, and it arms an area by
  // hit-testing its INTERIOR — so a wall presented as an area would be a thing
  // an operator can see and can never touch. It is presented as a two-handle
  // PATH instead. So: leave the drawing mode, drop the selection, and click
  // the wall.
  await armMode(editor, "direct");
  await clickWorld(page, editor, EMPTY_FLOOR);
  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: none");

  const mid = await clientOf(editor, WALL_MID);
  await page.mouse.move(mid.x, mid.y);
  // The grammar's own word for what is under the pointer: a path, which is
  // exactly what a wall is offered to it as.
  await expect(editor.getByTestId("mc-affordance")).toHaveText("affordance: path");
  await page.mouse.click(mid.x, mid.y);

  await expect(editor.getByTestId("mc-selection")).toHaveText(
    `selection: path:ring:${NEW_KEEP_OUT}`,
  );
  // Named as the keep-out it is, not as a road line: the ring-proxy id routed
  // the intent back to the entry it stands for.
  await expect(editor.getByTestId("mc-selection-primary")).toHaveText("keep-out wall 3 (2 pts)");
  // And selecting it brings up its own controls, so everything the entry
  // accepts is reachable for a mouse.
  await expect(selectionBar(editor)).toHaveCount(1);
  await expect(editor.getByTestId("mc-notice")).toHaveText("none");
  expect(errors).toEqual([]);
});

test("keepout-wall-promotes-and-demotes: a corner makes it a polygon, and losing one makes it a wall", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  await drawWall(page, editor);
  expect(await keepOutOf(editor, NEW_KEEP_OUT)).toEqual({ points: 2, kind: "wall" });
  await armMode(editor, "direct");

  // ---- promotion -------------------------------------------------------
  // Adding a corner to a two-point entry is not "editing a wall": the point
  // count IS the kind, so a third corner makes it a forbidden polygon, in the
  // document and to the grammar alike.
  await selectionBar(editor).getByRole("button", { name: "Add corner" }).click();
  expect(await keepOutOf(editor, NEW_KEEP_OUT)).toEqual({ points: 3, kind: "polygon" });
  // The selection follows the thing the operator was editing across the change
  // of presentation: it was a path, it is now an area.
  await expect(editor.getByTestId("mc-selection")).toHaveText(`selection: area:${NEW_KEEP_OUT}`);
  await expect(drawn(editor, `g[data-area-id="${NEW_KEEP_OUT}"] > polygon`)).toHaveCount(1);
  await expect(drawn(editor, `line[data-area-id="${NEW_KEEP_OUT}"]`)).toHaveCount(0);
  await expect(drawn(editor, `[data-area-label="${NEW_KEEP_OUT}"]`)).toHaveText("keep-out");

  // The new corner is the midpoint of the widest side, so the three corners are
  // collinear and the polygon has no interior yet. Pull the middle one off the
  // line — which is also the proof that the promotion reached the GRAMMAR: only
  // an area is hit-tested by its inside, so a click in the middle of this
  // triangle can only select it if the entry really is one now.
  const middleCorner = drawn(
    editor,
    `[data-area-corners="${NEW_KEEP_OUT}"] [data-corner-index="1"]`,
  );
  await expect(middleCorner).toHaveCount(1);
  const from = await glyphCentre(middleCorner);
  const apex: WorldPoint = { x: WALL_MID.x, y: WALL_MID.y + 4 };
  await drag(page, from, await clientOf(editor, apex));

  const centroid: WorldPoint = {
    x: (WALL_A.x + WALL_B.x + apex.x) / 3,
    y: (WALL_A.y + WALL_B.y + apex.y) / 3,
  };
  // Drop the selection first. A click on something already selected and alone
  // in the set DESELECTS it (the grammar's own toggle), so clicking the
  // interior while the entry is still held would prove the opposite of what it
  // looks like: this has to start from nothing selected.
  await clickWorld(page, editor, EMPTY_FLOOR);
  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: none");

  const inside = await clientOf(editor, centroid);
  await page.mouse.move(inside.x, inside.y);
  await expect(editor.getByTestId("mc-affordance")).toHaveText("affordance: area");
  await page.mouse.click(inside.x, inside.y);
  await expect(editor.getByTestId("mc-selection")).toHaveText(`selection: area:${NEW_KEEP_OUT}`);

  // ---- demotion --------------------------------------------------------
  // Three corners down to two is the same rule read the other way. The corner
  // is selected on the map and removed through the selection's own control —
  // the route a mouse has.
  const firstCorner = drawn(
    editor,
    `[data-area-corners="${NEW_KEEP_OUT}"] [data-corner-index="0"]`,
  );
  const cornerAt = await glyphCentre(firstCorner);
  await page.mouse.move(cornerAt.x, cornerAt.y);
  await expect(editor.getByTestId("mc-affordance")).toHaveText("affordance: vertex");
  await page.mouse.click(cornerAt.x, cornerAt.y);
  await expect(editor.getByTestId("mc-selection")).toHaveText(
    `selection: vertex:${NEW_KEEP_OUT}#0`,
  );

  await selectionBar(editor).getByRole("button", { name: "Remove" }).click();
  expect(await keepOutOf(editor, NEW_KEEP_OUT)).toEqual({ points: 2, kind: "wall" });
  // And the picture is a line again, with no polygon left behind.
  await expect(drawn(editor, `line[data-area-id="${NEW_KEEP_OUT}"]`)).toHaveCount(1);
  await expect(drawn(editor, `g[data-area-id="${NEW_KEEP_OUT}"] > polygon`)).toHaveCount(0);
  await expect(drawn(editor, `[data-area-label="${NEW_KEEP_OUT}"]`)).toHaveText("keep-out wall");
  // The entry survived: a demotion is a corner leaving, never the entry being
  // emptied out.
  await expect(editor.getByTestId("mc-keepout-count")).toHaveText("3");
  await expect(editor.getByTestId("mc-notice")).toHaveText("none");
  expect(errors).toEqual([]);
});

test("zone-create-and-retype: a typed zone is drawn, and its vendor type is changed on the map", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  await disableMagnet(editor);

  await armMode(editor, "draw-zone");
  await expect(editor.getByTestId("mc-mode")).toHaveText("draw-area");
  // The type is stated BEFORE the drawing: a zone with no type is not a thing
  // the vendor's wire can carry.
  await expect(editor.getByRole("combobox", { name: "Zone type to draw" })).toHaveValue("3");

  for (const corner of ZONE_RUN) {
    await clickWorld(page, editor, corner);
  }
  await expect(editor.getByTestId("mc-run-length")).toHaveText("3");
  await editor.getByRole("button", { name: "Finish" }).click();

  await expect(editor.getByTestId("mc-splice-count")).toHaveText("3");
  const zone = editor.locator(`[data-testid="mc-splice"][data-id="${NEW_ZONE}"]`);
  await expect(zone).toHaveAttribute("data-type", "3");
  await expect(zone).toHaveAttribute("data-points", "3");
  await expect(editor.getByTestId("mc-selection")).toHaveText(`selection: area:${NEW_ZONE}`);
  // Three corners, so it is an AREA and drawn as one — dashed, and captioned
  // with what it is in WORDS, because one consuming host spends no hue at all.
  await expect(drawn(editor, `g[data-area-id="${NEW_ZONE}"] > polygon`)).toHaveCount(1);
  await expect(drawn(editor, `[data-area-label="${NEW_ZONE}"]`)).toHaveText("Ramp / slope");

  // Retype it from the selection's own controls, over the map.
  await armMode(editor, "direct");
  await selectionBar(editor).getByRole("combobox", { name: "Zone type" }).selectOption("5");

  await expect(zone).toHaveAttribute("data-type", "5");
  await expect(drawn(editor, `[data-area-label="${NEW_ZONE}"]`)).toHaveText("Deceleration");
  // Its corners did not move: a retype is a change of meaning, not of shape.
  await expect(zone).toHaveAttribute("data-points", "3");
  // One step to draw it, one to retype it.
  await expect(editor.getByTestId("mc-undo-depth")).toHaveText("2");
  await expect(editor.getByTestId("mc-notice")).toHaveText("none");
  expect(errors).toEqual([]);
});

test("degenerate-keepout-refused: a run the vendor lint forbids is refused by name, not committed", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  await disableMagnet(editor);

  await armMode(editor, "draw-keep-out");
  await clickWorld(page, editor, WALL_A);
  await expect(editor.getByTestId("mc-run-length")).toHaveText("1");

  // A corner ON the previous corner is not a second corner: the surface reads
  // it as the second half of a double click and drops it, and `preparedRun`
  // collapses anything within a millimetre anyway. So two coincident presses
  // leave a run of ONE point — which is how the zero-extent arm of the lint
  // rule is reached from a pointer at all.
  await clickWorld(page, editor, WALL_A);
  await expect(editor.getByTestId("mc-run-length")).toHaveText("1");

  await editor.getByRole("button", { name: "Finish" }).click();

  // Refused, by the name of the rule it would have violated — not committed as
  // a one-point entry the linter would later refuse to save, and not silently
  // dropped either.
  await expect(editor.getByTestId("mc-notice")).toContainText("geometry.keepout-degenerate");
  await expect(editor.getByTestId("mc-notice")).toContainText("1 point(s)");
  await expect(editor.getByTestId("mc-keepout-count")).toHaveText("2");
  await expect(editor.getByTestId("mc-undo-depth")).toHaveText("0");
  await expect(drawn(editor, `[data-area-id="${NEW_KEEP_OUT}"]`)).toHaveCount(0);

  // And the refusal did not throw the work away: the run is still in progress,
  // so the operator adds the corner it was short of and finishes.
  await clickWorld(page, editor, WALL_B);
  await expect(editor.getByTestId("mc-run-length")).toHaveText("2");
  await editor.getByRole("button", { name: "Finish" }).click();
  await expect(editor.getByTestId("mc-keepout-count")).toHaveText("3");
  await expect(editor.getByTestId("mc-notice")).toHaveText("none");
  expect(await keepOutOf(editor, NEW_KEEP_OUT)).toEqual({ points: 2, kind: "wall" });
  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// The picture's own pixels, and the operator's complaint about the handles.
// ---------------------------------------------------------------------------

/**
 * Arm the raster paint fixture and hand back its root.
 *
 * A separate armable block from the editor above (`demo/map-canvas-demo.tsx`):
 * `<MapRasterLayer/>` edits the RASTER rather than affordances over it, so it
 * shares nothing with the editor's document, and mounting it with the editor
 * would put a second decoded picture on every page load of every other spec.
 */
async function openRaster(page: Page): Promise<Locator> {
  await page.goto("/");
  await page.locator(`${HOST} [data-testid="mcr-arm-omks-web"]`).click();
  const fixture = page.locator(`${HOST} [data-testid="mcr-fixture"]`);
  await fixture.locator("[data-map-raster-layer-canvas]").scrollIntoViewIfNeeded();
  return fixture;
}

/** The byte the fixture publishes for its nominated cell. */
async function paintedByte(fixture: Locator): Promise<number> {
  return numberOf(fixture.getByTestId("mcr-pixel"), "data-value");
}

/**
 * Where the nominated cell is on screen.
 *
 * Taken from the cell the fixture NAMES (`data-col` / `data-row`) and the
 * canvas' own document size (its `width` / `height` attributes, which are the
 * document's dimensions) — so this spec and the fixture cannot disagree about
 * which cell is being pressed. Half a cell is added so the press lands inside
 * it rather than on its boundary.
 */
async function nominatedCellAt(fixture: Locator): Promise<Point> {
  const pixel = fixture.getByTestId("mcr-pixel");
  const col = await numberOf(pixel, "data-col");
  const row = await numberOf(pixel, "data-row");
  const canvas = fixture.locator("[data-map-raster-layer-canvas]");
  const geometry = await canvas.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const canvasElement = element as HTMLCanvasElement;
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      cellsX: canvasElement.width,
      cellsY: canvasElement.height,
    };
  });
  return {
    x: geometry.left + ((col + 0.5) / geometry.cellsX) * geometry.width,
    y: geometry.top + ((row + 0.5) / geometry.cellsY) * geometry.height,
  };
}

/** One stroke: press, drag a few pixels, release. `onPaint` fires on release. */
async function paintStrokeAt(page: Page, at: Point): Promise<void> {
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + 6, at.y + 4, { steps: 4 });
  await page.mouse.up();
}

test("raster-paint: a brush writes its own byte into the picture, and undo puts the picture back", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const fixture = await openRaster(page);

  // The document opens as `unknown` — 128, the byte the robot's SLAM writes for
  // ground nothing has mapped. It is the value an operator paints OVER, which
  // is why the fixture opens on it rather than on free space.
  expect(await paintedByte(fixture)).toBe(128);
  await expect(fixture.getByTestId("mcr-changed")).toHaveAttribute("data-changed", "0");
  await expect(fixture.getByTestId("mcr-undo-depth")).toHaveText("0");

  // ---- occupied: 0 -----------------------------------------------------
  await expect(fixture.getByTestId("mcr-brush-occupied")).toHaveAttribute("aria-pressed", "true");
  await paintStrokeAt(page, await nominatedCellAt(fixture));
  expect(await paintedByte(fixture)).toBe(0);
  // The brush is a disc, not one pixel, so a whole neighbourhood changed with
  // it — and a stroke that moved covers the drag without leaving gaps.
  const changed = await numberOf(fixture.getByTestId("mcr-changed"), "data-changed");
  expect(changed).toBeGreaterThan(20);
  // ONE stroke is ONE step: the whole drag is a single undo, not one per
  // pointer sample.
  await expect(fixture.getByTestId("mcr-undo-depth")).toHaveText("1");

  // ---- undo restores the PICTURE, not just the nominated cell ----------
  await fixture.getByTestId("mcr-undo").click();
  expect(await paintedByte(fixture)).toBe(128);
  await expect(fixture.getByTestId("mcr-changed")).toHaveAttribute("data-changed", "0");
  await expect(fixture.getByTestId("mcr-undo-depth")).toHaveText("0");

  // ---- free: 255 -------------------------------------------------------
  await fixture.getByTestId("mcr-brush-free").click();
  await paintStrokeAt(page, await nominatedCellAt(fixture));
  expect(await paintedByte(fixture)).toBe(255);

  // ---- unknown: 128, painted back OVER a value, not merely left alone --
  // The cell is 255 at this point, so this is a real write of the unknown byte
  // rather than an assertion about the fill the document opened with.
  await fixture.getByTestId("mcr-brush-unknown").click();
  await paintStrokeAt(page, await nominatedCellAt(fixture));
  expect(await paintedByte(fixture)).toBe(128);
  // Two steps, not three: the undo above dropped one, and an edit made after an
  // undo is the operator choosing this future over the one they took back.
  await expect(fixture.getByTestId("mcr-undo-depth")).toHaveText("2");

  expect(errors).toEqual([]);
});

test("handle-size-is-state-invariant: a selected anchor is a filled anchor of the SAME size", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  // This is the operator's actual complaint, and the one assertion in this file
  // that would fail against the behaviour it replaces: a selected handle used
  // to be drawn at 1.7x (38 px across, ringed to 48) and read as a swelling
  // blob. Selection is now a FILLED anchor of the same size — Illustrator's
  // rule — and the component computes no size at all, so nothing can multiply
  // one. What is measured below is that mechanism, in a real browser.
  await zoomInAbout(page, editor, HOME, 3);

  const glyph = drawn(editor, '[data-point-id="0000"] [data-edit-glyph]');
  const annotation = drawn(editor, '[data-point-id="0000"] [data-edit-annotation="primary"]');
  const state = drawn(editor, '[data-point-id="0000"] [data-state]');

  const sizeOf = async (): Promise<{ geometry: number; visual: number; height: number }> => {
    await settle(editor);
    const box = await glyph.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    const visual = await glyph.boundingBox();
    if (visual === null) {
      throw new Error("the handle is not measurable");
    }
    return { geometry: box.width, visual: visual.width, height: box.height };
  };

  // ---- idle ------------------------------------------------------------
  // `zoomInAbout` parks the pointer on the handle, so move away first: a
  // hovered handle is a different STATE, and the comparison below has to start
  // from the resting one.
  const away = await clientOf(editor, { x: HOME.x, y: HOME.y + 3 });
  await page.mouse.move(away.x, away.y);
  await expect(editor.getByTestId("mc-affordance")).toHaveText("affordance: floor");
  await expect(state).toHaveAttribute("data-state", "idle");
  await expect(annotation).toHaveCount(0);
  const idle = await sizeOf();
  // The token's own number: a 7 px anchor, rotated 45° into a place's diamond,
  // so its axis-aligned box is 7 * SQRT2 across. Pinned so that "unchanged"
  // cannot be satisfied by two equally wrong readings.
  expect(idle.geometry).toBeCloseTo(7 * Math.SQRT2, 1);
  expect(idle.height).toBeCloseTo(idle.geometry, 3);

  // ---- primary ---------------------------------------------------------
  const at = await clientOf(editor, HOME);
  await page.mouse.click(at.x, at.y);
  await expect(editor.getByTestId("mc-selection")).toHaveText("selection: handle:0000");
  await expect(state).toHaveAttribute("data-state", "primary");
  // The state really changed — this is what stops the comparison from being
  // one unchanged element measured twice. The primary is marked by an
  // ANNOTATION ring appearing about the anchor, at a fixed radius.
  await expect(annotation).toHaveCount(1);
  const primary = await sizeOf();

  // ---- selected (a member of the set, not its primary) -----------------
  // Shift-click a second station: "0011" (yoshin), 3.6 m away and on screen at
  // this zoom. "0000" is then selected but no longer primary, which is the
  // third and last state a handle can be held in.
  const yoshin = await clientOf(editor, { x: 3.461, y: 1.343 });
  await page.keyboard.down("Shift");
  await page.mouse.click(yoshin.x, yoshin.y);
  await page.keyboard.up("Shift");
  await expect(editor.getByTestId("mc-selection")).toHaveText(
    "selection: handle:0000,handle:0011",
  );
  await expect(state).toHaveAttribute("data-state", "selected");
  await expect(annotation).toHaveCount(0);
  const selected = await sizeOf();

  // ---- the assertion --------------------------------------------------
  // Identical, geometry and painted outline alike, in all three states. A
  // thousandth of a pixel: this is not a tolerance, it is the same number.
  expect(primary.geometry).toBeCloseTo(idle.geometry, 3);
  expect(selected.geometry).toBeCloseTo(idle.geometry, 3);
  expect(primary.visual).toBeCloseTo(idle.visual, 3);
  expect(selected.visual).toBeCloseTo(idle.visual, 3);
  // Stated as the ratio a reviewer would read, against the number the old
  // behaviour would have produced. 1.7 fails every assertion above and this
  // one; so does any scale-up at all beyond half a percent.
  expect(primary.geometry / idle.geometry).toBeCloseTo(1, 2);
  expect(primary.geometry / idle.geometry).toBeLessThan(1.005);
  expect(selected.geometry / idle.geometry).toBeLessThan(1.005);

  // And the demo's own in-page measurement of the same element agrees, in the
  // state it is now in: two instruments, one number.
  expect(await numberOf(editor.getByTestId("mc-handle-measure"), "data-width")).toBeCloseTo(
    selected.geometry,
    1,
  );
  expect(errors).toEqual([]);
});
