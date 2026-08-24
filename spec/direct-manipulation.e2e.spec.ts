/**
 * @file Real-browser proof of the direct-manipulation demo grammar.
 *
 * The SVG is intentionally driven through mouse and pointer events here. The
 * hook's preview/session split, SVG hit geometry, cursor vocabulary, and touch
 * modality all need a browser's pointer dispatch and layout to be meaningful.
 */
import { expect, test, type Locator, type Page } from "playwright/test";

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

async function sessionPointIds(editor: Locator): Promise<string[]> {
  return editor.locator('[data-testid="dm-session-point"]').evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-point-id") ?? ""),
  );
}

test("hovering an open-path segment follows it with a ghost handle", async ({ page }) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const first = await svgPoint(editor, 140, 105);
  const second = await svgPoint(editor, 170, 112);

  await page.mouse.move(first.x, first.y);
  const ghost = editor.getByTestId("dm-ghost").locator("circle");
  await expect(ghost).toBeVisible();
  const firstX = Number(await ghost.getAttribute("cx"));

  await page.mouse.move(second.x, second.y);
  await expect(ghost).toBeVisible();
  const secondX = Number(await ghost.getAttribute("cx"));

  expect(secondX).not.toBe(firstX);
  expect(secondX).toBeCloseTo(170, 0);
  expect(errors).toEqual([]);
});

test("clicking an open-path segment changes neither the document nor selection", async ({ page }) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const segment = await svgPoint(editor, 140, 105);
  const count = editor.getByTestId("dm-point-count");

  await expect(count).toHaveText("4");
  await page.mouse.click(segment.x, segment.y);
  await expect(count).toHaveText("4");
  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: none");
  expect(errors).toEqual([]);
});

test("dragging a path ghost inserts in order and one undo removes it", async ({ page }) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const start = await svgPoint(editor, 140, 105);
  const drop = await svgPoint(editor, 175, 115);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(drop.x, drop.y, { steps: 4 });
  await page.mouse.up();

  await expect(editor.getByTestId("dm-point-count")).toHaveText("5");
  const ids = await sessionPointIds(editor);
  expect(ids[0]).toBe("p0");
  expect(ids[2]).toBe("p1");
  expect(ids[4]).toBe("p3");
  const inserted = editor.locator('[data-testid="dm-session-point"]').nth(1);
  expect(Number(await inserted.getAttribute("data-x"))).toBeCloseTo(175, 0);
  expect(Number(await inserted.getAttribute("data-y"))).toBeCloseTo(115, 0);

  await editor.getByTestId("dm-undo").click();
  await expect(editor.getByTestId("dm-point-count")).toHaveText("4");
  expect(await sessionPointIds(editor)).toEqual(["p0", "p1", "p2", "p3"]);
  expect(errors).toEqual([]);
});

test("handle dragging previews without committing until release", async ({ page }) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const handle = editor.getByTestId("dm-handle-p0");
  const start = await centerOf(handle);
  const readout = editor.getByTestId("dm-path-readout");
  const before = await readout.innerText();
  const target = await svgPoint(editor, 120, 145);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 5 });
  await expect(surfaceFor(page)).toHaveAttribute("data-edit-drag", "true");
  await expect(readout).toHaveText(before);
  await page.mouse.up();
  await expect(readout).not.toHaveText(before);

  await editor.getByTestId("dm-undo").click();
  await expect(readout).toHaveText(before);
  expect(errors).toEqual([]);
});

test("cursor affordances are grab, grabbing, and copy", async ({ page }) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const surface = surfaceFor(page);
  const handle = editor.getByTestId("dm-handle-p0");
  const handleCenter = await centerOf(handle);
  const target = await svgPoint(editor, 120, 145);

  await page.mouse.move(handleCenter.x, handleCenter.y);
  await expect.poll(() => computedCursor(surface)).toBe("grab");
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 4 });
  await expect.poll(() => computedCursor(surface)).toBe("grabbing");
  await page.mouse.up();

  const ghostPoint = await svgPoint(editor, 260, 105);
  await page.mouse.move(ghostPoint.x, ghostPoint.y);
  await expect(editor.getByTestId("dm-ghost")).toBeVisible();
  await expect.poll(() => computedCursor(surface)).toBe("copy");
  expect(errors).toEqual([]);
});

test("selecting a handle exposes a badge that deletes it and undo restores it", async ({ page }) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const handle = editor.getByTestId("dm-handle-p1");
  const handleCenter = await centerOf(handle);

  await page.mouse.click(handleCenter.x, handleCenter.y);
  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: handle:p1");
  await expect(handle.locator('[data-state="selected"]')).toBeVisible();
  const badge = editor.getByTestId("dm-remove-badge").first().locator("circle");
  await expect(badge).toBeVisible();
  // The badge's two-stroke "x" mark is a decorative aria-hidden overlay whose
  // diagonals cross exactly through the circle's center — the same point
  // Playwright's default click targets — so the native hit test can land on
  // the mark's stroke instead of the circle underneath. That does not change
  // real behavior: the click is handled by the ancestor surface's pointer
  // handlers via world-position hit testing (grammar.ts), not DOM event
  // target identity, so force is safe here.
  await badge.click({ force: true });
  await expect(editor.getByTestId("dm-point-count")).toHaveText("3");

  await editor.getByTestId("dm-undo").click();
  await expect(editor.getByTestId("dm-point-count")).toHaveText("4");
  expect(errors).toEqual([]);
});

test("dragging the selected heading knob changes the yaw document value", async ({ page }) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const handleCenter = await centerOf(editor.getByTestId("dm-handle-p1"));

  await page.mouse.click(handleCenter.x, handleCenter.y);
  const yaw = editor.getByTestId("dm-yaw-readout");
  await expect(yaw).toHaveText("yaw: 0.000");
  const knob = editor.getByTestId("dm-heading-knob");
  const knobCenter = await centerOf(knob);
  const target = await svgPoint(editor, 200, 145);

  await page.mouse.move(knobCenter.x, knobCenter.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 4 });
  await page.mouse.up();

  await expect(yaw).not.toHaveText("yaw: 0.000");
  await expect(knob).toHaveAttribute("data-angle", /1\.5/);
  expect(errors).toEqual([]);
});

test("touch pointer modality makes every path ghost persistent", async ({ page }) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const point = await svgPoint(editor, 140, 105);

  // The pointer handlers live on the dm-surface div itself (React attaches
  // them there, not on the broader host section), and a dispatched event
  // only bubbles up from its target — it never propagates down into
  // descendants. So this must target dm-surface directly, or the surface's
  // onPointerMove never sees it.
  await surfaceFor(page).dispatchEvent("pointermove", {
    bubbles: true,
    pointerId: 42,
    pointerType: "touch",
    buttons: 0,
    clientX: point.x,
    clientY: point.y,
  });
  await expect(editor.locator('[data-testid="dm-persistent-ghost"]')).toHaveCount(3);
  await expect(editor.locator('[data-testid="dm-persistent-ghost"]').first()).toBeVisible();
  const persistentX = await editor
    .locator('[data-testid="dm-persistent-ghost"] circle')
    .evaluateAll((circles) => circles.map((circle) => Number(circle.getAttribute("cx"))));
  expect(persistentX).toEqual([140, 265, 400]);
  expect(errors).toEqual([]);
});

test("selected polygon edges and vertices edit, and draw-area closes a new ring", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const editor = await openEditor(page);
  const interior = await svgPoint(editor, 190, 300);
  await page.mouse.click(interior.x, interior.y);
  await expect(editor.getByTestId("dm-selection")).toHaveText("selection: area:ring");

  const edge = await svgPoint(editor, 190, 250);
  const edgeDrop = await svgPoint(editor, 220, 250);
  await page.mouse.move(edge.x, edge.y);
  await expect(editor.getByTestId("dm-ghost-vertex")).toBeVisible();
  await page.mouse.down();
  await page.mouse.move(edgeDrop.x, edgeDrop.y, { steps: 4 });
  await page.mouse.up();
  await expect(editor.getByTestId("dm-ring-count")).toHaveText("4");

  const insertedVertex = await centerOf(editor.getByTestId("dm-ring-vertex-1"));
  // The selected ring shows a per-vertex delete badge offset down-right (at
  // 45°) from every vertex, at exactly the badge's own pick radius — by the
  // documented priority (badge > knob > handle > vertex), grabbing dead
  // center ties with that badge and resolves to it instead of the vertex
  // grip. Grabbing from the opposite (up-left) side stays inside the
  // vertex's own pick radius while clearing the badge's, so this drags the
  // vertex the way an operator avoiding the visible badge would.
  const grabVertex = { x: insertedVertex.x - 5, y: insertedVertex.y - 5 };
  const movedVertex = await svgPoint(editor, 230, 265);
  const ringBeforeVertexMove = await editor.getByTestId("dm-ring-readout").innerText();
  await page.mouse.move(grabVertex.x, grabVertex.y);
  await page.mouse.down();
  await page.mouse.move(movedVertex.x, movedVertex.y, { steps: 4 });
  await page.mouse.up();
  await expect(editor.getByTestId("dm-ring-readout")).not.toHaveText(ringBeforeVertexMove);

  const drawButton = editor.getByTestId("dm-mode-draw-area");
  await drawButton.click();
  await expect(drawButton).toHaveAttribute("aria-pressed", "true");
  const first = await svgPoint(editor, 390, 240);
  const second = await svgPoint(editor, 520, 240);
  const third = await svgPoint(editor, 455, 340);
  await page.mouse.click(first.x, first.y);
  await page.mouse.click(second.x, second.y);
  await page.mouse.click(third.x, third.y);
  await expect(editor.getByTestId("dm-ring-count")).toHaveText("3");

  await page.mouse.click(first.x, first.y);
  await expect(editor.getByTestId("dm-mode")).toHaveAttribute("data-mode", "direct");
  await expect(drawButton).toHaveAttribute("aria-pressed", "false");
  await expect(editor.getByTestId("dm-ring-readout")).toContainText("390.0,240.0");
  expect(errors).toEqual([]);
});
