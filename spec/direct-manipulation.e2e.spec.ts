/**
 * @file Real-browser proof of the direct-manipulation demo grammar.
 *
 * The SVG is intentionally driven through mouse and pointer events here. The
 * hook's preview/session split, SVG hit geometry, cursor vocabulary, modifier
 * observation and touch modality all need a browser's pointer dispatch and
 * layout to be meaningful. A jsdom `render()` has no layout, no pointer, no
 * computed cursor and no floating-layer collisions, so it is not evidence about
 * any of the things below.
 *
 * One scene per new behaviour, and one per coarse behaviour that must not
 * regress: a behaviour with no scene passes this suite VACUOUSLY, which is the
 * same as not testing it.
 *
 * The scene names are the adopted spec's (`reports/
 * map-editor-figma-grade-path-editing/adopted-spec.md`, ruling 12).
 */
import { expect, test, type Locator, type Page } from "playwright/test";
import { EDIT_CURSOR_VALUES } from "../src/direct-manipulation/grammar";

const HOST = ".host--omks-web";

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
 * The demo's readouts (point/ring counts, selection, undo) and toolbar
 * buttons are deliberately siblings of `dm-surface`, not descendants of it
 * — only the SVG region carries pointer-capture handlers. So `editor` is
 * scoped to the whole host section (covers surface, toolbar, and readouts
 * alike); `surfaceFor` narrows to the pointer surface div itself for the
 * two properties that live only on that element (cursor, `data-edit-drag`).
 */
function editorFor(page: Page): Locator {
  return page.locator(HOST);
}

function surfaceFor(page: Page): Locator {
  return page.locator(`${HOST} [data-testid="dm-surface"]`);
}

/**
 * Navigate and scroll the demo's SVG fully into view exactly once. The demo
 * harness stacks many panels above this one, so the SVG usually sits well
 * below the viewport's fold; page.mouse.* dispatches at raw viewport
 * coordinates and does not auto-scroll, so tests measure element positions
 * with boundingBox() and drive the pointer at those raw coordinates. Scrolling
 * more than once mid-test is unsafe here: scrollIntoViewIfNeeded() on a small
 * descendant (e.g. one handle) can settle the page at a different offset than
 * scrolling the full 600x400 SVG would, so a later scroll silently shifts the
 * page and invalidates any point already captured from a bounding box. Doing
 * the one scroll that matters — the whole SVG — up front means every
 * following boundingBox() (svgPoint, centerOf) sees a stable, unscrolled-since
 * viewport, since all editing affordances live inside that same SVG.
 */
async function openEditor(page: Page): Promise<Locator> {
  await page.goto("/");
  const editor = editorFor(page);
  await editor.locator('[data-testid="dm-svg"]').scrollIntoViewIfNeeded();
  return editor;
}

async function svgPoint(editor: Locator, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await editor.locator('[data-testid="dm-svg"]').boundingBox();
  if (box === null) {
    throw new Error("direct-manipulation SVG is not measurable");
  }
  return { x: box.x + x, y: box.y + y };
}

async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.locator("circle").first().boundingBox();
  if (box === null) {
    throw new Error("SVG affordance is not measurable");
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function computedCursor(locator: Locator): Promise<string> {
  return locator.evaluate((element) => window.getComputedStyle(element).cursor);
}

async function inlineCursor(locator: Locator): Promise<string> {
  return locator.evaluate((element) => (element as HTMLElement).style.cursor);
}

async function sessionPointIds(editor: Locator): Promise<string[]> {
  return editor.locator('[data-testid="dm-session-point"]').evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-point-id") ?? ""),
  );
}

/** One document point's committed position, from the session readout. */
async function pointAt(editor: Locator, id: string): Promise<{ x: number; y: number }> {
  const locator = editor.locator(
    `[data-testid="dm-session-point"][data-point-id="${id}"], [data-testid="dm-second-point"][data-point-id="${id}"]`,
  );
  const x = Number(await locator.getAttribute("data-x"));
  const y = Number(await locator.getAttribute("data-y"));
  return { x, y };
}

async function ringVertices(editor: Locator): Promise<{ x: number; y: number }[]> {
  const text = await editor.getByTestId("dm-ring-readout").innerText();
  return text
    .replace("document ring: ", "")
    .split("|")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const [x, y] = entry.split(",");
      return { x: Number(x), y: Number(y) };
    });
}

/** Drag from one viewport point to another, in steps so moves coalesce as usual. */
async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  options: { readonly steps?: number; readonly modifier?: "Shift" | "Alt" } = {},
): Promise<void> {
  const steps = options.steps ?? 6;
  await page.mouse.move(from.x, from.y);
  if (options.modifier !== undefined) {
    await page.keyboard.down(options.modifier);
  }
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps });
  await page.mouse.up();
  if (options.modifier !== undefined) {
    await page.keyboard.up(options.modifier);
  }
}

/** A touch tap, dispatched on the surface itself (a dispatched event never descends). */
async function tap(page: Page, at: { x: number; y: number }): Promise<void> {
  const surface = surfaceFor(page);
  for (const type of ["pointerdown", "pointerup"] as const) {
    await surface.dispatchEvent(type, {
      bubbles: true,
      pointerId: 42,
      pointerType: "touch",
      buttons: type === "pointerdown" ? 1 : 0,
      clientX: at.x,
      clientY: at.y,
    });
  }
}

async function touchMove(page: Page, at: { x: number; y: number }): Promise<void> {
  await surfaceFor(page).dispatchEvent("pointermove", {
    bubbles: true,
    pointerId: 42,
    pointerType: "touch",
    buttons: 0,
    clientX: at.x,
    clientY: at.y,
  });
}

/** A touch drag: down, move past the coarse slop, up. */
async function touchDrag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Promise<void> {
  const surface = surfaceFor(page);
  await surface.dispatchEvent("pointerdown", {
    bubbles: true,
    pointerId: 42,
    pointerType: "touch",
    buttons: 1,
    clientX: from.x,
    clientY: from.y,
  });
  for (const fraction of [0.3, 0.6, 1]) {
    await surface.dispatchEvent("pointermove", {
      bubbles: true,
      pointerId: 42,
      pointerType: "touch",
      buttons: 1,
      clientX: from.x + (to.x - from.x) * fraction,
      clientY: from.y + (to.y - from.y) * fraction,
    });
  }
  await surface.dispatchEvent("pointerup", {
    bubbles: true,
    pointerId: 42,
    pointerType: "touch",
    buttons: 0,
    clientX: to.x,
    clientY: to.y,
  });
}

// ---------------------------------------------------------------------------
// E1 / E23 / E24 / E25 — the interference this revision removes.
// ---------------------------------------------------------------------------

test("arming-unselected-path: a press near an unselected route cannot grow a vertex", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const onSecondRoute = await svgPoint(editor, 460, 200);
  const dragTo = await svgPoint(editor, 500, 230);

  // Hovering the unarmed route offers only the affordance that selects it: no
  // point is conjured under the pointer.
  await page.mouse.move(onSecondRoute.x, onSecondRoute.y);
  await expect(editor.getByTestId("dm-affordance")).toHaveText("affordance: path");
  await expect(editor.getByTestId("dm-ghost")).toHaveCount(0);

  // A drag from there belongs to the camera, and the document does not change.
  await expect(editor.getByTestId("dm-second-count")).toHaveText("2");
  await drag(page, onSecondRoute, dragTo);
  await expect(editor.getByTestId("dm-second-count")).toHaveText("2");
  await expect(editor.getByTestId("dm-camera-lock")).toHaveText("camera: free");

  // Clicking it arms it, and only then is its edge editable.
  await page.mouse.click(onSecondRoute.x, onSecondRoute.y);
  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: path:path-2");
  await page.mouse.move(onSecondRoute.x, onSecondRoute.y);
  await expect(editor.getByTestId("dm-affordance")).toHaveText("affordance: path-edge");
  expect(errors).toEqual([]);
});

test("no-hover-ghost-on-fine: hovering an armed edge conjures no point, Alt does", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const onEdge = await svgPoint(editor, 140, 105);

  await page.mouse.click(onEdge.x, onEdge.y);
  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: path:path");

  // Hover: the edge highlights, and nothing is added to the surface.
  await page.mouse.move(onEdge.x, onEdge.y);
  await expect(editor.getByTestId("dm-edge-highlight")).toBeVisible();
  await expect(editor.getByTestId("dm-ghost")).toHaveCount(0);
  await expect(editor.getByTestId("dm-cursor")).toHaveText("cursor: move");

  // Alt is the request for a point, and only then does the marker appear.
  await page.keyboard.down("Alt");
  await expect(editor.getByTestId("dm-ghost")).toBeVisible();
  await expect(editor.getByTestId("dm-cursor")).toHaveText("cursor: pen-plus");
  await page.keyboard.up("Alt");
  await expect(editor.getByTestId("dm-ghost")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("no-badge-on-fine: a fine pointer has no delete badge, and the chrome removes instead", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const handle = await centerOf(editor.getByTestId("dm-handle-p1"));

  await page.mouse.click(handle.x, handle.y);
  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: handle:p1");
  // Nothing destructive appears anywhere near the selected point.
  await expect(editor.getByTestId("dm-remove-badge")).toHaveCount(0);

  await editor.getByTestId("dm-delete-selection").click();
  await expect(editor.getByTestId("dm-point-count")).toHaveText("3");
  await editor.getByTestId("dm-undo").click();
  await expect(editor.getByTestId("dm-point-count")).toHaveText("4");
  expect(errors).toEqual([]);
});

test("edge-parallel-drag: dragging an armed edge translates both of its endpoints", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const onEdge = await svgPoint(editor, 140, 105);
  const dropAt = await svgPoint(editor, 140, 145);

  await page.mouse.click(onEdge.x, onEdge.y);
  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: path:path");
  const before = { p0: await pointAt(editor, "p0"), p1: await pointAt(editor, "p1") };

  await drag(page, onEdge, dropAt);

  const after = { p0: await pointAt(editor, "p0"), p1: await pointAt(editor, "p1") };
  expect(after.p0.y - before.p0.y).toBeCloseTo(40, 0);
  expect(after.p1.y - before.p1.y).toBeCloseTo(40, 0);
  expect(after.p0.x).toBeCloseTo(before.p0.x, 0);
  expect(after.p1.x).toBeCloseTo(before.p1.x, 0);
  // Untouched points stay put, and the whole translation is ONE undo step.
  expect(await pointAt(editor, "p2")).toEqual({ x: 330, y: 90 });
  await editor.getByTestId("dm-undo").click();
  expect(await pointAt(editor, "p0")).toEqual(before.p0);
  expect(await pointAt(editor, "p1")).toEqual(before.p1);
  expect(errors).toEqual([]);
});

test("alt-insert-delete: Alt adds and removes, and nothing does without it", async ({ page }) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const onEdge = await svgPoint(editor, 265, 105);
  const count = editor.getByTestId("dm-point-count");

  await page.mouse.click(onEdge.x, onEdge.y);
  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: path:path");

  // Without Alt: a click on the armed edge changes nothing at all.
  await page.mouse.click(onEdge.x, onEdge.y);
  await expect(count).toHaveText("4");
  await expect(editor.getByTestId("dm-status")).toHaveText("last intent: nothing");

  // With Alt: the point is inserted where the operator pointed.
  await page.keyboard.down("Alt");
  await page.mouse.click(onEdge.x, onEdge.y);
  await page.keyboard.up("Alt");
  await expect(count).toHaveText("5");

  // Alt on a point removes it; without Alt the same click only selects.
  const handle = await centerOf(editor.getByTestId("dm-handle-p2"));
  await page.mouse.click(handle.x, handle.y);
  await expect(count).toHaveText("5");
  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: handle:p2");
  await page.keyboard.down("Alt");
  await page.mouse.click(handle.x, handle.y);
  await page.keyboard.up("Alt");
  await expect(count).toHaveText("4");
  expect(errors).toEqual([]);
});

test("knob-does-not-shadow-neighbour: a waypoint under the knob is still grabbable", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  // Put p2 where p1's heading knob will sit (p1 is at 200,120 with yaw 0, so
  // its knob is 24 px to the right at 224,120).
  const p2 = await centerOf(editor.getByTestId("dm-handle-p2"));
  const beside = await svgPoint(editor, 228, 120);
  await drag(page, p2, beside);
  expect(await pointAt(editor, "p2")).toEqual({ x: 228, y: 120 });

  const onP1 = await centerOf(editor.getByTestId("dm-handle-p1"));
  await page.mouse.click(onP1.x, onP1.y);
  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: handle:p1");

  // Dead on the knob, the knob answers...
  const knob = await svgPoint(editor, 224, 120);
  await page.mouse.move(knob.x, knob.y);
  await expect(editor.getByTestId("dm-affordance")).toHaveText("affordance: knob");

  // ...but nearer the neighbour, the neighbour does. Under the old fixed
  // priority the knob won at every distance and p2 could not be picked at all.
  const nearP2 = await svgPoint(editor, 229, 120);
  await page.mouse.move(nearP2.x, nearP2.y);
  await expect(editor.getByTestId("dm-affordance")).toHaveText("affordance: handle");
  await page.mouse.click(nearP2.x, nearP2.y);
  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: handle:p2");
  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// E3 / E4 — the cursor vocabulary.
// ---------------------------------------------------------------------------

test("cursor-vocabulary: every cursor name is reachable and matches its declared value", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const surface = surfaceFor(page);
  const seen = new Set<string>();

  /** Assert the surface reports this cursor name, and its CSS value agrees. */
  const expectCursor = async (name: keyof typeof EDIT_CURSOR_VALUES) => {
    await expect(surface).toHaveAttribute("data-edit-cursor", name);
    const declared = EDIT_CURSOR_VALUES[name];
    if (declared === null) {
      // The delegation is a DECLARED value: the name is reported and no inline
      // cursor is written, so the host's own resting rule governs the surface.
      expect(await inlineCursor(surface)).toBe("");
    } else if (declared.startsWith("url(")) {
      const computed = await computedCursor(surface);
      expect(computed).toContain("url(");
      // CSS requires the trailing keyword; it is part of the declared value.
      expect(computed).toContain(declared.slice(declared.lastIndexOf(",") + 1).trim());
    } else {
      expect(await computedCursor(surface)).toBe(declared);
    }
    seen.add(name);
  };

  // floor: delegated to the host.
  const floor = await svgPoint(editor, 40, 30);
  await page.mouse.move(floor.x, floor.y);
  await expectCursor("host-resting");

  // floor + Shift: the marquee is about to start.
  await page.keyboard.down("Shift");
  await expectCursor("marquee");
  await page.keyboard.up("Shift");

  // a point, and Alt's promise to remove it.
  const p0 = await centerOf(editor.getByTestId("dm-handle-p0"));
  await page.mouse.move(p0.x, p0.y);
  await expectCursor("grab");
  await page.keyboard.down("Alt");
  await expectCursor("pen-minus");
  await page.keyboard.up("Alt");

  // an unarmed route: the affordance that selects it.
  const onSecond = await svgPoint(editor, 460, 200);
  await page.mouse.move(onSecond.x, onSecond.y);
  await expectCursor("select");

  // an armed edge, and Alt's promise to add to it.
  const onEdge = await svgPoint(editor, 140, 105);
  await page.mouse.click(onEdge.x, onEdge.y);
  await page.mouse.move(onEdge.x, onEdge.y);
  await expectCursor("move");
  await page.keyboard.down("Alt");
  await expectCursor("pen-plus");
  await page.keyboard.up("Alt");

  // the primary's heading knob.
  const p1 = await centerOf(editor.getByTestId("dm-handle-p1"));
  await page.mouse.click(p1.x, p1.y);
  const knob = await svgPoint(editor, 224, 120);
  await page.mouse.move(knob.x, knob.y);
  await expectCursor("rotate");

  // dragging: the live gesture names itself.
  await page.mouse.down();
  await page.mouse.move(knob.x + 12, knob.y + 12, { steps: 3 });
  await expectCursor("rotating");
  await page.mouse.up();

  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  await page.mouse.move(p0.x + 12, p0.y + 12, { steps: 3 });
  await expectCursor("grabbing");
  await page.mouse.up();
  await editor.getByTestId("dm-undo").click();

  // a selected area's interior moves; an unselected one selects.
  const interior = await svgPoint(editor, 190, 300);
  await page.mouse.move(interior.x, interior.y);
  await expectCursor("select");
  await page.mouse.click(interior.x, interior.y);
  await page.mouse.move(interior.x, interior.y);
  await expectCursor("move");
  await page.mouse.click(floor.x, floor.y);

  // armed: the floor draws, the run's ends close and finish.
  await editor.getByTestId("dm-mode-draw-area").click();
  const first = await svgPoint(editor, 400, 60);
  await page.mouse.move(first.x, first.y);
  await expectCursor("draw");
  await page.mouse.click(first.x, first.y);
  const second = await svgPoint(editor, 520, 60);
  await page.mouse.click(second.x, second.y);
  await page.mouse.move(first.x, first.y);
  await expectCursor("close-ring");
  const last = await svgPoint(editor, 520, 60);
  await page.mouse.move(last.x, last.y);
  await expectCursor("finish-run");
  await editor.getByTestId("dm-finish").click();

  // armed append with no run: an existing route's end resumes it.
  await editor.getByTestId("dm-mode-append").click();
  const p0Again = await centerOf(editor.getByTestId("dm-handle-p0"));
  await page.mouse.move(p0Again.x, p0Again.y);
  await expectCursor("resume-run");
  await editor.getByTestId("dm-finish").click();

  // a contradictory declaration refuses, and says so with the cursor.
  await editor.getByTestId("dm-grid-declared-toggle").click();
  await editor.getByTestId("dm-grid-toggle").click();
  await page.mouse.move(floor.x + 3, floor.y + 3);
  await expectCursor("not-allowed");
  await editor.getByTestId("dm-grid-toggle").click();
  await editor.getByTestId("dm-grid-declared-toggle").click();

  // coarse: the persistent midpoint inserts, and the badge removes.
  const midpoint = await svgPoint(editor, 140, 105);
  await touchMove(page, midpoint);
  await expectCursor("insert");
  const handleP1 = await centerOf(editor.getByTestId("dm-handle-p1"));
  await tap(page, handleP1);
  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: handle:p1");
  const badge = await centerOf(editor.getByTestId("dm-remove-badge"));
  await touchMove(page, badge);
  await expectCursor("delete");

  // The accounting: every name the kernel declares was reached above. A name
  // nothing can reach is either dead or a hole in this proof.
  const declared = Object.keys(EDIT_CURSOR_VALUES).sort();
  expect([...seen].sort()).toEqual(declared);
  expect(errors).toEqual([]);
});

test("modifier-cursor-live: a stationary pointer still sees a modifier change", async ({ page }) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const p0 = await centerOf(editor.getByTestId("dm-handle-p0"));

  await page.mouse.move(p0.x, p0.y);
  await expect(editor.getByTestId("dm-cursor")).toHaveText("cursor: grab");
  await expect(editor.getByTestId("dm-modifiers")).toHaveText("modifiers: shift=off alt=off");

  // No pointer movement at all from here: the change comes from the key alone,
  // which is exactly what a pointer-event-only implementation cannot do.
  await page.keyboard.down("Alt");
  await expect(editor.getByTestId("dm-modifiers")).toHaveText("modifiers: shift=off alt=on");
  await expect(editor.getByTestId("dm-cursor")).toHaveText("cursor: pen-minus");
  await page.keyboard.up("Alt");
  await expect(editor.getByTestId("dm-cursor")).toHaveText("cursor: grab");

  await page.keyboard.down("Shift");
  await expect(editor.getByTestId("dm-modifiers")).toHaveText("modifiers: shift=on alt=off");
  await page.keyboard.up("Shift");
  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// E5 / E6 / E7 / E17 — constraint, snapping, and live feedback.
// ---------------------------------------------------------------------------

test("constrain-45: Shift puts a drag on a 45-degree ray and draws the guide", async ({ page }) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const p0 = await centerOf(editor.getByTestId("dm-handle-p0"));
  const target = await svgPoint(editor, 180, 150);

  await page.mouse.move(p0.x, p0.y);
  await page.keyboard.down("Shift");
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 6 });
  // The constraint is visible WHILE it is in force, not only after the release.
  await expect(editor.getByTestId("dm-constraint-guide")).toBeVisible();
  await page.mouse.up();
  await page.keyboard.up("Shift");

  // (80,90) -> (180,150) is 31 degrees, so it rides the 45-degree ray: the
  // component along that ray is (100 + 60) / sqrt(2), i.e. 80 on each axis.
  const moved = await pointAt(editor, "p0");
  expect(moved.x - 80).toBeCloseTo(80, 0);
  expect(moved.y - 90).toBeCloseTo(80, 0);
  await expect(editor.getByTestId("dm-constraint-guide")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("snap-vertex-edge-grid: the magnet catches a vertex, an edge and the grid, in that order", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  await editor.getByTestId("dm-snap-toggle").click();
  await expect(editor.getByTestId("dm-snap-toggle")).toHaveAttribute("aria-pressed", "true");

  // A vertex within the capture radius wins outright.
  const p0 = await centerOf(editor.getByTestId("dm-handle-p0"));
  const nearP1 = await svgPoint(editor, 200, 124);
  await drag(page, p0, nearP1);
  expect(await pointAt(editor, "p0")).toEqual({ x: 200, y: 120 });
  await expect(editor.getByTestId("dm-status")).toHaveText("last intent: move-set");
  await editor.getByTestId("dm-undo").click();

  // An edge, where no vertex is in reach.
  const nearSecondRoute = await svgPoint(editor, 450, 205);
  await drag(page, await centerOf(editor.getByTestId("dm-handle-p0")), nearSecondRoute);
  expect(await pointAt(editor, "p0")).toEqual({ x: 450, y: 200 });
  await editor.getByTestId("dm-undo").click();

  // The grid, only where the geometry offers nothing, and only once declared.
  await editor.getByTestId("dm-grid-toggle").click();
  const nearGrid = await svgPoint(editor, 420, 172);
  await drag(page, await centerOf(editor.getByTestId("dm-handle-p3")), nearGrid);
  expect(await pointAt(editor, "p3")).toEqual({ x: 425, y: 175 });
  await editor.getByTestId("dm-undo").click();
  await editor.getByTestId("dm-grid-toggle").click();

  // Magnet off: the raw pointer position, with nothing caught.
  await editor.getByTestId("dm-snap-toggle").click();
  await drag(page, await centerOf(editor.getByTestId("dm-handle-p0")), nearP1);
  expect(await pointAt(editor, "p0")).toEqual({ x: 200, y: 124 });
  expect(errors).toEqual([]);
});

test("snap-excludes-self: a moving point does not snap to itself or its companions", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  await editor.getByTestId("dm-snap-toggle").click();

  // Select p0 AND p1, then drag p0 to within the capture radius of p1. p1 is
  // travelling with it, so it is not something to catch.
  const p0 = await centerOf(editor.getByTestId("dm-handle-p0"));
  const p1 = await centerOf(editor.getByTestId("dm-handle-p1"));
  await page.mouse.click(p0.x, p0.y);
  await page.keyboard.down("Shift");
  await page.mouse.click(p1.x, p1.y);
  await page.keyboard.up("Shift");
  await expect(editor.getByTestId("dm-selection-count")).toHaveText("selected: 2");

  // Chosen so the only things within the capture radius are p0 and p1
  // themselves (p1's own x and y would otherwise offer alignment axes).
  const target = await svgPoint(editor, 240, 116);
  await drag(page, p0, target);
  const moved = await pointAt(editor, "p0");
  expect(moved.x).toBeCloseTo(240, 0);
  expect(moved.y).toBeCloseTo(116, 0);
  await expect(editor.getByTestId("dm-snap-readout")).toHaveText("snap: none");
  expect(errors).toEqual([]);
});

test("drag-live-feedback: the snap guide appears and updates DURING the drag", async ({ page }) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  await editor.getByTestId("dm-snap-toggle").click();

  const p0 = await centerOf(editor.getByTestId("dm-handle-p0"));
  const nearP1 = await svgPoint(editor, 200, 124);
  // Away from every vertex AND every alignment axis: the second route sits at
  // y = 200, so 150,200 would have caught its axis instead of nothing.
  const away = await svgPoint(editor, 160, 175);

  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  await page.mouse.move(away.x, away.y, { steps: 4 });
  // Mid-drag, away from everything: nothing caught, and the affordance layer is
  // alive rather than frozen for the duration of the gesture.
  await expect(editor.getByTestId("dm-snap-readout")).toHaveText("snap: none");
  await page.mouse.move(nearP1.x, nearP1.y, { steps: 4 });
  await expect(editor.getByTestId("dm-snap-readout")).toHaveText("snap: vertex");
  await expect(editor.getByTestId("dm-snap-guide")).toBeVisible();
  await page.mouse.up();
  await expect(editor.getByTestId("dm-snap-readout")).toHaveText("snap: none");
  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// E8 / E9 / E10 / E18 — the selection as a set.
// ---------------------------------------------------------------------------

test("multi-select-shift-click: Shift toggles, and only the primary carries the knob", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const p0 = await centerOf(editor.getByTestId("dm-handle-p0"));
  const p1 = await centerOf(editor.getByTestId("dm-handle-p1"));

  await page.mouse.click(p0.x, p0.y);
  await page.keyboard.down("Shift");
  await page.mouse.click(p1.x, p1.y);
  await page.keyboard.up("Shift");
  await expect(editor.getByTestId("dm-selection-count")).toHaveText("selected: 2");
  await expect(editor.getByTestId("dm-primary")).toHaveText("primary: handle:p1");

  // The primary is drawn with a second ring; the other member is not.
  await expect(editor.getByTestId("dm-handle-p1").locator('[data-state="primary"]')).toBeVisible();
  await expect(editor.getByTestId("dm-handle-p0").locator('[data-state="selected"]')).toBeVisible();
  await expect(editor.getByTestId("dm-handle-p1").locator("circle")).toHaveCount(2);
  await expect(editor.getByTestId("dm-handle-p0").locator("circle")).toHaveCount(1);

  // Exactly one knob exists, and it belongs to the primary: approaching p1
  // reveals it, approaching p0 does not.
  await page.mouse.move(p1.x + 6, p1.y);
  await expect(editor.getByTestId("dm-heading-knob")).toHaveCount(1);
  await page.mouse.move(p0.x, p0.y);
  await expect(editor.getByTestId("dm-heading-knob")).toHaveCount(0);

  // Shift again removes it from the set.
  await page.keyboard.down("Shift");
  await page.mouse.click(p1.x, p1.y);
  await page.keyboard.up("Shift");
  await expect(editor.getByTestId("dm-selection-count")).toHaveText("selected: 1");
  expect(errors).toEqual([]);
});

test("marquee-select: Shift rubber-bands a set, and a plain floor drag stays the camera's", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const from = await svgPoint(editor, 20, 20);
  const to = await svgPoint(editor, 260, 150);

  // Plain floor drag: the camera's, and the selection is untouched.
  await drag(page, from, to);
  await expect(editor.getByTestId("dm-camera-lock")).toHaveText("camera: free");
  await expect(editor.getByTestId("dm-selection-count")).toHaveText("selected: 0");
  await expect(editor.getByTestId("dm-marquee")).toHaveCount(0);

  // Shift + the same drag: a rectangle, with its candidates shown BEFORE the
  // release commits them.
  await page.mouse.move(from.x, from.y);
  await page.keyboard.down("Shift");
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await expect(editor.getByTestId("dm-marquee")).toBeVisible();
  await expect(editor.getByTestId("dm-marquee-readout")).toHaveText("marquee: 2 candidates");
  await expect(editor.getByTestId("dm-camera-lock")).toHaveText("camera: locked");
  await page.mouse.up();
  await page.keyboard.up("Shift");

  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: handle:p0,handle:p1");
  await expect(editor.getByTestId("dm-marquee")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("multi-drag-one-undo: three points move on one delta and come back on one undo", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const p0 = await centerOf(editor.getByTestId("dm-handle-p0"));
  const p1 = await centerOf(editor.getByTestId("dm-handle-p1"));
  const p2 = await centerOf(editor.getByTestId("dm-handle-p2"));

  await page.mouse.click(p0.x, p0.y);
  await page.keyboard.down("Shift");
  await page.mouse.click(p1.x, p1.y);
  await page.mouse.click(p2.x, p2.y);
  await page.keyboard.up("Shift");
  await expect(editor.getByTestId("dm-selection-count")).toHaveText("selected: 3");

  const before = {
    p0: await pointAt(editor, "p0"),
    p1: await pointAt(editor, "p1"),
    p2: await pointAt(editor, "p2"),
  };
  const undoSteps = await editor.getByTestId("dm-undo-count").innerText();

  await drag(page, p1, { x: p1.x + 30, y: p1.y + 20 });

  for (const id of ["p0", "p1", "p2"] as const) {
    const after = await pointAt(editor, id);
    expect(after.x - before[id].x, id).toBeCloseTo(30, 0);
    expect(after.y - before[id].y, id).toBeCloseTo(20, 0);
  }
  // One gesture, one step.
  const stepsAfter = Number((await editor.getByTestId("dm-undo-count").innerText()).replace(/\D/g, ""));
  expect(stepsAfter).toBe(Number(undoSteps.replace(/\D/g, "")) + 1);
  await editor.getByTestId("dm-undo").click();
  for (const id of ["p0", "p1", "p2"] as const) {
    expect(await pointAt(editor, id), id).toEqual(before[id]);
  }
  expect(errors).toEqual([]);
});

test("selected-area-interior-move: a selected ring translates, an unselected one does not", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const interior = await svgPoint(editor, 190, 300);
  const before = await ringVertices(editor);

  // Unselected: the interior drag belongs to the camera.
  await drag(page, interior, { x: interior.x + 30, y: interior.y + 10 });
  expect(await ringVertices(editor)).toEqual(before);
  await expect(editor.getByTestId("dm-camera-lock")).toHaveText("camera: free");

  // Selected: the whole ring moves on one delta.
  await page.mouse.click(interior.x, interior.y);
  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: area:ring");
  await drag(page, interior, { x: interior.x + 30, y: interior.y + 10 });
  const after = await ringVertices(editor);
  expect(after).toHaveLength(before.length);
  after.forEach((vertex, index) => {
    expect(vertex.x - (before[index]?.x ?? 0)).toBeCloseTo(30, 0);
    expect(vertex.y - (before[index]?.y ?? 0)).toBeCloseTo(10, 0);
  });
  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// E11 – E15, E27 — the pen's rhythm.
// ---------------------------------------------------------------------------

test("sustained-append-rhythm: four clicks place four points without touching the toolbar", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const appendButton = editor.getByTestId("dm-mode-append");

  await appendButton.click();
  await expect(appendButton).toHaveAttribute("aria-pressed", "true");

  const spots = [
    await svgPoint(editor, 100, 180),
    await svgPoint(editor, 150, 195),
    await svgPoint(editor, 200, 180),
    await svgPoint(editor, 250, 195),
  ];
  for (const spot of spots) {
    await page.mouse.click(spot.x, spot.y);
  }
  await expect(editor.getByTestId("dm-point-count")).toHaveText("8");
  await expect(editor.getByTestId("dm-run-length")).toHaveText("run: 4");
  // The mode is still armed: no toolbar round trip per point.
  await expect(editor.getByTestId("dm-mode")).toHaveAttribute("data-mode", "append");
  await expect(appendButton).toHaveAttribute("aria-pressed", "true");

  // The rubber band shows where the next point would land.
  const ahead = await svgPoint(editor, 300, 180);
  await page.mouse.move(ahead.x, ahead.y);
  await expect(editor.getByTestId("dm-rubber-band")).toBeVisible();
  await expect(editor.getByTestId("dm-pending")).toContainText("300.0,180.0");

  // Clicking the run's own last point ends it.
  const lastSpot = spots[spots.length - 1]!;
  await page.mouse.click(lastSpot.x, lastSpot.y);
  await expect(editor.getByTestId("dm-status")).toHaveText("last intent: finish-run");
  await expect(editor.getByTestId("dm-mode")).toHaveAttribute("data-mode", "direct");
  await expect(editor.getByTestId("dm-point-count")).toHaveText("8");
  expect(errors).toEqual([]);
});

test("append-dblclick-finish: a double click ends the run and leaves exactly one point", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  await editor.getByTestId("dm-mode-append").click();

  const first = await svgPoint(editor, 100, 180);
  await page.mouse.click(first.x, first.y);
  await expect(editor.getByTestId("dm-point-count")).toHaveText("5");

  const finishAt = await svgPoint(editor, 180, 190);
  await page.mouse.dblclick(finishAt.x, finishAt.y);

  // A double click's first click places; its second coincides with that point
  // and is collapsed (a duplicate consecutive point is a double click, not an
  // intention), and the double click itself ends the run.
  await expect(editor.getByTestId("dm-point-count")).toHaveText("6");
  await expect(editor.getByTestId("dm-mode")).toHaveAttribute("data-mode", "direct");
  await expect(editor.getByTestId("dm-status")).toHaveText("last intent: finish-run");
  expect(errors).toEqual([]);
});

test("append-shift-constrained: the rubber band and the placement ride the same ray", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  await editor.getByTestId("dm-mode-append").click();

  const start = await svgPoint(editor, 100, 180);
  await page.mouse.click(start.x, start.y);
  const target = await svgPoint(editor, 200, 240);

  await page.mouse.move(target.x, target.y);
  await page.keyboard.down("Shift");
  // (100,180) -> (200,240) is 31 degrees, so the 45-degree ray takes it:
  // (100 + 60) / sqrt(2) = 113.1 along the diagonal, i.e. 80 on each axis.
  await expect(editor.getByTestId("dm-pending")).toContainText("180.0,260.0 constrained");
  await page.mouse.click(target.x, target.y);
  await page.keyboard.up("Shift");

  const ids = await sessionPointIds(editor);
  const placed = await pointAt(editor, ids[ids.length - 1]!);
  expect(placed.x).toBeCloseTo(180, 0);
  expect(placed.y).toBeCloseTo(260, 0);
  expect(errors).toEqual([]);
});

test("draw-area-close-and-refuse: three corners close, two refuse rather than leave it open", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const drawButton = editor.getByTestId("dm-mode-draw-area");

  await drawButton.click();
  const a = await svgPoint(editor, 390, 240);
  const b = await svgPoint(editor, 520, 240);
  const c = await svgPoint(editor, 455, 340);
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(b.x, b.y);
  await page.mouse.click(c.x, c.y);
  await expect(editor.getByTestId("dm-ring-count")).toHaveText("3");
  await page.mouse.dblclick(a.x + 40, a.y + 20);
  await expect(editor.getByTestId("dm-mode")).toHaveAttribute("data-mode", "direct");
  await expect(editor.getByTestId("dm-ring-readout")).toContainText("390.0,240.0");

  // Two corners: refused at the last point AND refused as a close, and the ring
  // is not quietly left open.
  await drawButton.click();
  const d = await svgPoint(editor, 100, 60);
  const e = await svgPoint(editor, 200, 60);
  await page.mouse.click(d.x, d.y);
  await page.mouse.click(e.x, e.y);
  await expect(editor.getByTestId("dm-ring-count")).toHaveText("2");
  await page.mouse.dblclick(e.x, e.y);
  await expect(editor.getByTestId("dm-status")).toContainText("refused");
  await expect(editor.getByTestId("dm-ring-count")).toHaveText("2");
  await expect(editor.getByTestId("dm-mode")).toHaveAttribute("data-mode", "draw-area");
  expect(errors).toEqual([]);
});

test("dblclick-insert-precise: the point lands on the segment that was clicked", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const onSecondSegment = await svgPoint(editor, 265, 105);

  await page.mouse.click(onSecondSegment.x, onSecondSegment.y);
  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: path:path");

  await page.mouse.dblclick(onSecondSegment.x, onSecondSegment.y);
  await expect(editor.getByTestId("dm-point-count")).toHaveText("5");

  // Inserted after p1, not appended at the end: the index comes from the
  // segment, not from the document's length.
  const ids = await sessionPointIds(editor);
  expect(ids[0]).toBe("p0");
  expect(ids[1]).toBe("p1");
  expect(ids[3]).toBe("p2");
  expect(ids[4]).toBe("p3");
  const inserted = await pointAt(editor, ids[2]!);
  expect(inserted.x).toBeCloseTo(265, 0);
  expect(inserted.y).toBeCloseTo(105, 0);
  expect(errors).toEqual([]);
});

test("pen-endpoint-resume: clicking an existing route's end continues that end", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  await editor.getByTestId("dm-mode-append").click();

  // The tail: the next point goes after it.
  const tail = await centerOf(editor.getByTestId("dm-handle-p3"));
  await page.mouse.move(tail.x, tail.y);
  await expect(editor.getByTestId("dm-affordance")).toHaveText("affordance: path-endpoint");
  await page.mouse.click(tail.x, tail.y);
  await expect(editor.getByTestId("dm-status")).toHaveText("last intent: resume-drawing");
  await expect(editor.getByTestId("dm-point-count")).toHaveText("4");

  const afterTail = await svgPoint(editor, 520, 120);
  await page.mouse.click(afterTail.x, afterTail.y);
  await expect(editor.getByTestId("dm-point-count")).toHaveText("5");
  let ids = await sessionPointIds(editor);
  expect(ids[3]).toBe("p3");
  expect(ids[4]).not.toBe("p3");
  await editor.getByTestId("dm-finish").click();

  // The head: the next point goes BEFORE the whole route, which is what makes
  // head-extension a distinct answer rather than a silent fall back to tail.
  await editor.getByTestId("dm-mode-append").click();
  const head = await centerOf(editor.getByTestId("dm-handle-p0"));
  await page.mouse.click(head.x, head.y);
  await expect(editor.getByTestId("dm-status")).toHaveText("last intent: resume-drawing");
  const beforeHead = await svgPoint(editor, 40, 40);
  await page.mouse.click(beforeHead.x, beforeHead.y);
  ids = await sessionPointIds(editor);
  expect(ids[1]).toBe("p0");
  const placed = await pointAt(editor, ids[0]!);
  expect(placed.x).toBeCloseTo(40, 0);
  expect(placed.y).toBeCloseTo(40, 0);
  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// E16 / E19 / E20 — the ladder, the thresholds, the refusal.
// ---------------------------------------------------------------------------

test("escape-ladder: Escape peels the run, then the mode, then the selection", async ({ page }) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  // 1. A live drag: Escape aborts it, and the document does not change.
  const p0 = await centerOf(editor.getByTestId("dm-handle-p0"));
  const away = await svgPoint(editor, 160, 160);
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  await page.mouse.move(away.x, away.y, { steps: 5 });
  await expect(surfaceFor(page)).toHaveAttribute("data-edit-drag", "true");
  await page.keyboard.press("Escape");
  await expect(surfaceFor(page)).not.toHaveAttribute("data-edit-drag", "true");
  await page.mouse.up();
  expect(await pointAt(editor, "p0")).toEqual({ x: 80, y: 90 });

  // 2. A run in progress: Escape abandons the run, and stays armed.
  await editor.getByTestId("dm-mode-append").click();
  const spot = await svgPoint(editor, 120, 200);
  await page.mouse.click(spot.x, spot.y);
  await expect(editor.getByTestId("dm-run-length")).toHaveText("run: 1");
  await page.keyboard.press("Escape");
  await expect(editor.getByTestId("dm-status")).toHaveText("last intent: cancel-run");
  await expect(editor.getByTestId("dm-mode")).toHaveAttribute("data-mode", "append");

  // 3. Armed with no run: Escape leaves the mode.
  await page.keyboard.press("Escape");
  await expect(editor.getByTestId("dm-mode")).toHaveAttribute("data-mode", "direct");

  // 4. A selection: Escape clears it, and one press clears no more than that.
  const p1 = await centerOf(editor.getByTestId("dm-handle-p1"));
  await page.mouse.click(p1.x, p1.y);
  await expect(editor.getByTestId("dm-selection-count")).toHaveText("selected: 1");
  await page.keyboard.press("Escape");
  await expect(editor.getByTestId("dm-selection-count")).toHaveText("selected: 0");
  expect(errors).toEqual([]);
});

test("slop-per-class: a small move commits, and a smaller twist rotates", async ({ page }) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  // 5 px: past the move class's threshold, and under the single 6 px threshold
  // the previous revision used for everything - a correction this size used to
  // be swallowed and reported as a click.
  const p0 = await centerOf(editor.getByTestId("dm-handle-p0"));
  await drag(page, p0, { x: p0.x + 5, y: p0.y }, { steps: 3 });
  await expect(editor.getByTestId("dm-status")).toHaveText("last intent: move-set");
  const moved = await pointAt(editor, "p0");
  expect(moved.x).toBeCloseTo(85, 0);
  await editor.getByTestId("dm-undo").click();

  // 3 px on the knob: a rotation engages almost immediately, because the knob
  // is a small dedicated target and there is nothing else to do with it.
  const p1 = await centerOf(editor.getByTestId("dm-handle-p1"));
  await page.mouse.click(p1.x, p1.y);
  const knob = await svgPoint(editor, 224, 120);
  await drag(page, knob, { x: knob.x, y: knob.y + 3 }, { steps: 2 });
  await expect(editor.getByTestId("dm-status")).toHaveText("last intent: rotate");
  await expect(editor.getByTestId("dm-yaw-readout")).not.toHaveText("yaw: 0.000");
  expect(errors).toEqual([]);
});

test("refused-grid-declaration: grid snapping without a grid is refused, not switched off", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  await editor.getByTestId("dm-grid-declared-toggle").click();
  await expect(editor.getByTestId("dm-grid-declared")).toHaveText("grid: none");
  await editor.getByTestId("dm-grid-toggle").click();

  const p0 = await centerOf(editor.getByTestId("dm-handle-p0"));
  await page.mouse.move(p0.x, p0.y);
  await expect(editor.getByTestId("dm-affordance")).toHaveText("affordance: refused");
  await expect(surfaceFor(page)).toHaveAttribute("data-edit-cursor", "not-allowed");

  // The refusal reaches the operator, and the document is untouched: the
  // contradiction is not silently resolved by ignoring one half of it.
  await page.mouse.click(p0.x, p0.y);
  await expect(editor.getByTestId("dm-status")).toContainText("refused");
  await expect(editor.getByTestId("dm-selection-count")).toHaveText("selected: 0");
  expect(await pointAt(editor, "p0")).toEqual({ x: 80, y: 90 });

  // Declaring the grid resolves it.
  await editor.getByTestId("dm-grid-declared-toggle").click();
  await page.mouse.move(p0.x, p0.y);
  await expect(editor.getByTestId("dm-affordance")).toHaveText("affordance: handle");
  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// E28 — the whole vocabulary, with no keyboard at all.
// ---------------------------------------------------------------------------

test("pointer-only-completeness: place, insert, move, delete, rotate, finish, multi-select, translate", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  // Not one keyboard event is sent in this test. Every gesture below is a
  // pointer gesture or a native chrome control, which is the contract: an
  // operator with a mouse and no keyboard can complete the whole vocabulary.

  // place, then finish through the chrome.
  await editor.getByTestId("dm-mode-append").click();
  const placeAt = await svgPoint(editor, 120, 200);
  await page.mouse.click(placeAt.x, placeAt.y);
  await expect(editor.getByTestId("dm-point-count")).toHaveText("5");
  await editor.getByTestId("dm-finish").click();
  await expect(editor.getByTestId("dm-mode")).toHaveAttribute("data-mode", "direct");

  // select, then insert with a double click (a pointer gesture).
  const onEdge = await svgPoint(editor, 265, 105);
  await page.mouse.click(onEdge.x, onEdge.y);
  await page.mouse.dblclick(onEdge.x, onEdge.y);
  await expect(editor.getByTestId("dm-point-count")).toHaveText("6");

  // translate an armed edge.
  const beforeTranslate = await pointAt(editor, "p0");
  const onFirstEdge = await svgPoint(editor, 140, 105);
  await drag(page, onFirstEdge, { x: onFirstEdge.x, y: onFirstEdge.y + 20 });
  expect((await pointAt(editor, "p0")).y).toBeCloseTo(beforeTranslate.y + 20, 0);

  // move one point.
  const p2 = await centerOf(editor.getByTestId("dm-handle-p2"));
  await drag(page, p2, { x: p2.x + 25, y: p2.y + 15 });
  await expect(editor.getByTestId("dm-status")).toHaveText("last intent: move-set");

  // multi-select through the sticky chrome toggle - no Shift anywhere.
  const floor = await svgPoint(editor, 40, 380);
  await page.mouse.click(floor.x, floor.y);
  await expect(editor.getByTestId("dm-selection-count")).toHaveText("selected: 0");
  await editor.getByTestId("dm-sticky-add").click();
  await page.mouse.click(p2.x + 25, p2.y + 15);
  const p3 = await centerOf(editor.getByTestId("dm-handle-p3"));
  await page.mouse.click(p3.x, p3.y);
  await expect(editor.getByTestId("dm-selection-count")).toHaveText("selected: 2");
  await editor.getByTestId("dm-sticky-add").click();

  // delete the set through the chrome.
  await editor.getByTestId("dm-delete-selection").click();
  await expect(editor.getByTestId("dm-point-count")).toHaveText("4");

  // rotate: select a point, then drag its knob.
  const p1 = await centerOf(editor.getByTestId("dm-handle-p1"));
  await page.mouse.click(p1.x, p1.y);
  const p1Now = await pointAt(editor, "p1");
  const knob = await svgPoint(editor, p1Now.x + 24, p1Now.y);
  await drag(page, knob, { x: knob.x - 10, y: knob.y + 24 });
  await expect(editor.getByTestId("dm-status")).toHaveText("last intent: rotate");
  await expect(editor.getByTestId("dm-yaw-readout")).not.toHaveText("yaw: 0.000");
  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// E21 / E22 / E29 — coarse input, which must not regress at all.
// ---------------------------------------------------------------------------

test("coarse-regression-suite: every touch behaviour of v0.16 still holds", async ({ page }) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  // Persistent midpoints on EVERY route, armed or not: touch has no hover, so
  // this is its edit affordance and it stays ambient.
  const anywhere = await svgPoint(editor, 140, 105);
  await touchMove(page, anywhere);
  await expect(editor.getByTestId("dm-modality")).toHaveText("modality: coarse");
  const ghosts = editor.locator('[data-testid="dm-persistent-ghost"]');
  await expect(ghosts).toHaveCount(4);
  const ghostX = await editor
    .locator('[data-testid="dm-persistent-ghost"] circle')
    .evaluateAll((circles) => circles.map((circle) => Number(circle.getAttribute("cx"))));
  expect(ghostX).toEqual([140, 265, 400, 460]);

  // A tap selects; the 1.6x radius means a finger 12 px off still lands (a
  // fine pointer's 9 px would not).
  const nearP1 = await svgPoint(editor, 212, 120);
  await tap(page, nearP1);
  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: handle:p1");

  // The badge is present in coarse, and it deletes.
  const badge = editor.getByTestId("dm-remove-badge");
  await expect(badge).toBeVisible();
  const badgeAt = await centerOf(badge);
  await tap(page, badgeAt);
  await expect(editor.getByTestId("dm-point-count")).toHaveText("3");
  await editor.getByTestId("dm-undo").click();
  await expect(editor.getByTestId("dm-point-count")).toHaveText("4");

  // A ghost drag inserts.
  await touchDrag(page, await svgPoint(editor, 140, 105), await svgPoint(editor, 150, 140));
  await expect(editor.getByTestId("dm-point-count")).toHaveText("5");
  await editor.getByTestId("dm-undo").click();

  // The knob rotates.
  await tap(page, await svgPoint(editor, 200, 120));
  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: handle:p1");
  await touchDrag(page, await svgPoint(editor, 224, 120), await svgPoint(editor, 200, 160));
  await expect(editor.getByTestId("dm-yaw-readout")).not.toHaveText("yaw: 0.000");

  // A tap on empty floor clears the selection.
  await tap(page, await svgPoint(editor, 40, 380));
  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: none");
  expect(errors).toEqual([]);
});

test("coarse-sustained-exit: touch can always leave an armed mode through the chrome", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  await touchMove(page, await svgPoint(editor, 40, 380));
  await expect(editor.getByTestId("dm-modality")).toHaveText("modality: coarse");

  await editor.getByTestId("dm-mode-append").click();
  await tap(page, await svgPoint(editor, 120, 200));
  await expect(editor.getByTestId("dm-point-count")).toHaveText("5");
  // Still armed: touch gets the same continuous rhythm a mouse does.
  await expect(editor.getByTestId("dm-mode")).toHaveAttribute("data-mode", "append");

  // And it is never trapped there: the chrome's control is always present while
  // armed, which is the only exit a finger has (no Escape, no double tap).
  const finish = editor.getByTestId("dm-finish");
  await expect(finish).toBeVisible();
  await finish.click();
  await expect(editor.getByTestId("dm-mode")).toHaveAttribute("data-mode", "direct");
  expect(errors).toEqual([]);
});

test("coarse-no-doubletap-semantics: a double tap means nothing, declared rather than unhandled", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);

  await touchMove(page, await svgPoint(editor, 40, 380));
  await expect(editor.getByTestId("dm-modality")).toHaveText("modality: coarse");
  await editor.getByTestId("dm-mode-append").click();

  const spot = await svgPoint(editor, 120, 200);
  await tap(page, spot);
  await expect(editor.getByTestId("dm-point-count")).toHaveText("5");

  // The browser's own dblclick, delivered to a coarse surface: nothing happens.
  // A double tap is the platform's zoom gesture and this grammar does not
  // compete with it - stated as "no meaning here", not left as an unhandled
  // case that happens to do nothing today.
  await surfaceFor(page).dispatchEvent("dblclick", {
    bubbles: true,
    clientX: spot.x + 40,
    clientY: spot.y + 10,
  });
  await expect(editor.getByTestId("dm-mode")).toHaveAttribute("data-mode", "append");
  await expect(editor.getByTestId("dm-point-count")).toHaveText("5");
  await expect(editor.getByTestId("dm-status")).toHaveText("last intent: place");

  // The armed ring is the same story: a double tap does not close it, so the
  // chrome's control stays the touch exit.
  await editor.getByTestId("dm-finish").click();
  await editor.getByTestId("dm-mode-draw-area").click();
  await tap(page, await svgPoint(editor, 390, 60));
  await tap(page, await svgPoint(editor, 520, 60));
  await tap(page, await svgPoint(editor, 455, 130));
  await expect(editor.getByTestId("dm-ring-count")).toHaveText("3");
  await surfaceFor(page).dispatchEvent("dblclick", {
    bubbles: true,
    clientX: (await svgPoint(editor, 455, 130)).x,
    clientY: (await svgPoint(editor, 455, 130)).y,
  });
  await expect(editor.getByTestId("dm-mode")).toHaveAttribute("data-mode", "draw-area");
  expect(errors).toEqual([]);
});
