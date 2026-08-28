/**
 * @file E2E: prove the v0.11 primitives (Spinner, Toast, Panel, FactGrid),
 *           FactColumns, and StatusBadge's opt-in live region behave in a
 *           real browser.
 *
 * vitest's jsdom cannot show:
 *   - a spinner's rendered diameter (the size vocabulary is CSS-only) nor
 *     that the ring is actually turning (a `@keyframes` animation)
 *   - that a spinner with no `tone` really inherits the surrounding ink
 *     (`currentColor` resolution)
 *   - that a tone resolves to each HOST's own token — the whole point of
 *     the `--ds-*` indirection, and only visible with both alias sets
 *     mounted side by side
 *   - that a closed Toast has stopped taking pointer events (the card is
 *     still in the DOM; `pointer-events` is a computed style)
 *   - that `fullWidth` actually spans a grid, or that FactGrid lays two
 *     tiles per row: grid tracks do not exist in jsdom
 *   - that FactColumns reflows from multiple tracks to one at a narrow width
 *
 * The runner is expected to start the demo vite dev server at
 * http://localhost:5198 (LIB_E2E_BASE_URL) before invoking; the harness
 * tears it down after.
 */
import { test, expect } from "playwright/test";
import type { Locator } from "playwright/test";

/** Computed value of one CSS property, as the browser resolved it. */
function computed(locator: Locator, property: string): Promise<string> {
  return locator.evaluate(
    (el, prop) => getComputedStyle(el).getPropertyValue(prop),
    property,
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("Spinner: each size renders its own diameter", async ({ page }) => {
  const host = page.locator(".host--omks-web");
  const expected: Record<string, number> = {
    "spinner-sm": 16,
    "spinner-md": 24,
    "spinner-lg": 36,
  };

  for (const [testid, diameter] of Object.entries(expected)) {
    const box = await host.locator(`[data-testid="${testid}"] [role="status"]`).boundingBox();
    if (!box) {
      throw new Error(`${testid} not measurable`);
    }
    expect(box.width).toBeCloseTo(diameter, 0);
    expect(box.height).toBeCloseTo(diameter, 0);
  }
});

test("Spinner: the ring is actually turning", async ({ page }) => {
  const ring = page.locator('.host--omks-web [data-testid="spinner-md"] [role="status"] > span');

  // No scrolling, and nothing else that waits for actionability: this
  // element never stops moving, so Playwright's stability check (the
  // bounding box has to hold still for two consecutive frames) can never
  // converge on it. `evaluate` needs neither — getComputedStyle reads the
  // element wherever it is, including outside the viewport.
  const first = await computed(ring, "transform");
  // A fifth of the 1s rotation — far from a full turn, so the two samples
  // cannot coincide by landing on the same phase.
  await page.waitForTimeout(200);
  const second = await computed(ring, "transform");

  expect(first).not.toBe("none");
  expect(second).not.toBe(first);
});

test("Spinner: an untoned ring takes the surrounding ink, a toned one takes its token", async ({
  page,
}) => {
  const host = page.locator(".host--omks-web");
  const inherited = host.locator('[data-testid="spinner-inherit"] [role="status"] > span');
  const toned = host.locator('[data-testid="spinner-tone-success"] [role="status"] > span');

  // The untoned spinner sits inside a danger-colored line, and the danger
  // toast's border is bound to the same token: currentColor resolved.
  const dangerBorder = await computed(
    host.locator('[data-testid="toast-danger"] > div'),
    "border-top-color",
  );
  expect(await computed(inherited, "border-top-color")).toBe(dangerBorder);

  // The toned one is the success token instead — a different color, and not
  // the ring's own track color either.
  const head = await computed(toned, "border-top-color");
  expect(head).not.toBe(dangerBorder);
  expect(head).not.toBe(await computed(toned, "border-bottom-color"));
});

test("Toast: the register that means 'it did not happen' is the only one that interrupts", async ({
  page,
}) => {
  const host = page.locator(".host--omks-web");
  const expected: Record<string, string> = {
    "toast-success": "status",
    "toast-warning": "status",
    "toast-danger": "alert",
    "toast-info": "status",
    "toast-neutral": "status",
  };

  for (const [testid, role] of Object.entries(expected)) {
    await expect(host.locator(`[data-testid="${testid}"] > div`)).toHaveRole(
      role as "status" | "alert",
    );
  }
});

test("Toast: a closed card is invisible AND out of the way of a click", async ({ page }) => {
  const host = page.locator(".host--omks-web");
  const open = host.locator('[data-testid="toast-info"] > div');
  const closed = host.locator('[data-testid="toast-closed"] > div');

  expect(await computed(open, "opacity")).toBe("1");
  expect(await computed(open, "pointer-events")).toBe("auto");

  expect(await computed(closed, "opacity")).toBe("0");
  expect(await computed(closed, "pointer-events")).toBe("none");
});

test("Toast: a tone resolves to each host's own token, not to a library color", async ({
  page,
}) => {
  const lightDanger = await computed(
    page.locator('.host--omks-web [data-testid="toast-danger"] > div'),
    "border-top-color",
  );
  const darkDanger = await computed(
    page.locator('.host--status-webui [data-testid="toast-danger"] > div'),
    "border-top-color",
  );
  expect(lightDanger).not.toBe(darkDanger);

  // Within one host, the danger toast and the danger badge state the same
  // register, so they resolve to the same token value.
  const badgeInk = await computed(
    page.locator('.host--omks-web [data-testid="badge-live"] > span'),
    "color",
  );
  expect(badgeInk).toBe(lightDanger);
});

test("Panel: fullWidth spans every column of the grid; its peers take one", async ({ page }) => {
  const grid = page.locator('.host--omks-web [data-testid="panel-grid"]');
  const cell = await grid.locator("section:not([data-full-width])").first().boundingBox();
  const spanning = await grid.locator('section[data-full-width="true"]').boundingBox();
  if (!cell || !spanning) {
    throw new Error("panels not measurable");
  }

  // Two columns plus one gap: the spanning panel is close to twice a cell,
  // and unambiguously wider than one.
  expect(spanning.width).toBeGreaterThan(cell.width * 1.9);
  // ...and it starts on a later row, not beside them.
  expect(spanning.y).toBeGreaterThan(cell.y);
});

test("FactGrid: two tiles per row, on an inset surface distinct from the panel", async ({
  page,
}) => {
  const grid = page.locator('.host--omks-web [data-testid="fact-grid"]');
  const tiles = grid.locator("[data-direction]");
  await expect(tiles).toHaveCount(4);

  const boxes = await Promise.all(
    [0, 1, 2, 3].map(async (i) => {
      const box = await tiles.nth(i).boundingBox();
      if (!box) {
        throw new Error(`tile ${i} not measurable`);
      }
      return box;
    }),
  );

  // First two share a row; the third starts the next one.
  expect(boxes[0]!.y).toBeCloseTo(boxes[1]!.y, 0);
  expect(boxes[1]!.x).toBeGreaterThan(boxes[0]!.x);
  expect(boxes[2]!.y).toBeGreaterThan(boxes[0]!.y);

  // The tile is a recessed surface, not the panel's own.
  const tileBg = await computed(tiles.first(), "background-color");
  const panelBg = await computed(
    page.locator('.host--omks-web [data-testid="panel-grid"] section').first(),
    "background-color",
  );
  expect(tileBg).not.toBe(panelBg);
});

test("FactGrid: a figure is display-sized, a text value steps down", async ({ page }) => {
  const grid = page.locator('.host--omks-web [data-testid="fact-grid"]');
  const figure = grid.locator('[data-size="md"]').first().locator("span").nth(1);
  const text = grid.locator('[data-size="sm"]').first().locator("span").nth(1);

  const figureSize = Number.parseFloat(await computed(figure, "font-size"));
  const textSize = Number.parseFloat(await computed(text, "font-size"));
  expect(figureSize).toBeGreaterThan(textSize);

  // Both are monospaced: columns of readings line up.
  expect(await computed(figure, "font-family")).toBe(await computed(text, "font-family"));
});

test("FactColumns: auto-fit uses multiple tracks wide and one track when narrow", async ({
  page,
}) => {
  const frame = page.locator('.host--omks-web [data-testid="fact-columns-frame"]');
  const facts = frame.locator("dl > div");
  await expect(facts).toHaveCount(4);

  const wideFirst = await facts.nth(0).boundingBox();
  const wideSecond = await facts.nth(1).boundingBox();
  if (!wideFirst || !wideSecond) {
    throw new Error("wide FactColumns facts not measurable");
  }
  expect(wideSecond.y).toBeCloseTo(wideFirst.y, 0);
  expect(wideSecond.x).toBeGreaterThan(wideFirst.x);

  await frame.evaluate((element) => {
    (element as HTMLElement).style.width = "220px";
  });

  const narrowFirst = await facts.nth(0).boundingBox();
  const narrowSecond = await facts.nth(1).boundingBox();
  if (!narrowFirst || !narrowSecond) {
    throw new Error("narrow FactColumns facts not measurable");
  }
  expect(narrowSecond.y).toBeGreaterThan(narrowFirst.y);
  expect(narrowSecond.x).toBeCloseTo(narrowFirst.x, 0);
});

test("StatusBadge: only the badge that reports a changing value is a live region", async ({
  page,
}) => {
  const host = page.locator(".host--omks-web");
  const plain = host.locator('[data-testid="badge-plain"] > span');
  const live = host.locator('[data-testid="badge-live"] > span');

  await expect(plain).toHaveCount(1);
  await expect(plain).not.toHaveAttribute("role");
  await expect(live).toHaveRole("status");

  // The pulse dot is decoration and says nothing the badge does not.
  await expect(live.locator('[data-pulse="true"]')).toHaveAttribute("aria-hidden", "true");
});
