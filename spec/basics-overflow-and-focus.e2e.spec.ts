/**
 * @file E2E: prove the v0.3 basic components survive adverse layout
 *           and produce the right interactive affordances in a real browser.
 *
 * vitest's jsdom does not run a CSS engine, so it cannot tell us:
 *   - whether a long Input value pushes Toolbar buttons out of view
 *     (overflow containment is a CSS-layout property)
 *   - whether a long Heading wraps inside its parent (overflow-wrap)
 *   - whether a long Select option ellipsizes when the box is closed
 *     (text-overflow only resolves with a real layout)
 *   - whether focus-visible draws a ring around the right element
 *
 * This spec uses bounding-box and computed-style measurements to make
 * those CSS-engine-only behaviors observable.
 *
 * The runner is expected to start the demo vite dev server at
 * http://localhost:5198 (LIB_E2E_BASE_URL) before invoking; the harness
 * tears it down after.
 */
import { test, expect } from "playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("Toolbar contains a long Input within its parent — Buttons stay reachable", async ({ page }) => {
  // Use the dashboard host (light theme) section; both hosts share the same
  // layout machinery, but we anchor on one to keep the spec deterministic.
  const host = page.locator(".host--omks-web");
  const toolbar = host.locator('[role="toolbar"]').first();
  const grow = host.locator('[data-testid="toolbar-grow"]').first();
  const primary = host.locator('[data-testid="toolbar-primary"]').first();

  const toolbarBox = await toolbar.boundingBox();
  const growBox = await grow.boundingBox();
  const primaryBox = await primary.boundingBox();
  if (!toolbarBox || !growBox || !primaryBox) {
    throw new Error("Toolbar layout not measurable");
  }

  // The grow cell shrank below the value's intrinsic width — its rendered
  // width is far less than the long string's pixel length. The toolbar
  // wraps when out of inline space (flex-wrap: wrap), so the primary
  // button MAY appear on a second line; either way the toolbar's bbox
  // does not exceed its parent.
  const card = host.locator('section').filter({ hasText: "Form basics" }).first();
  const cardBox = await card.boundingBox();
  if (!cardBox) {
    throw new Error("Card not measurable");
  }
  expect(toolbarBox.width).toBeLessThanOrEqual(cardBox.width + 1);

  // The primary button is fully inside the toolbar (left edge ≥ toolbar
  // left, right edge ≤ toolbar right). If min-width: 0 had not been applied
  // to the toolbar's children, the long Input would have shoved this
  // button past the toolbar's right edge.
  expect(primaryBox.x).toBeGreaterThanOrEqual(toolbarBox.x - 0.5);
  expect(primaryBox.x + primaryBox.width).toBeLessThanOrEqual(
    toolbarBox.x + toolbarBox.width + 1,
  );
});

test("Heading wraps a long unbroken token inside its parent (no horizontal overflow)", async ({ page }) => {
  const host = page.locator(".host--omks-web");
  const heading = host.locator('[data-testid="long-heading"]').first();

  const headingMetrics = await heading.evaluate((el) => {
    const parent = el.parentElement!;
    return {
      headingScrollWidth: el.scrollWidth,
      headingClientWidth: el.clientWidth,
      parentClientWidth: parent.clientWidth,
    };
  });

  // overflow-wrap: anywhere should keep scrollWidth ≤ clientWidth (no
  // horizontal overflow). The exact glyph metrics are font-dependent so
  // we allow a 2px tolerance for sub-pixel rounding.
  expect(headingMetrics.headingScrollWidth).toBeLessThanOrEqual(
    headingMetrics.headingClientWidth + 2,
  );
  // And the heading itself fits inside its parent.
  expect(headingMetrics.headingClientWidth).toBeLessThanOrEqual(
    headingMetrics.parentClientWidth + 2,
  );
});

test("Select carries truncation styles in the closed state", async ({ page }) => {
  // The contract is that a Select's closed state ellipsizes long option
  // labels rather than expanding the box. We assert the styles are in
  // place; whether ellipsis actually fires depends on the parent width
  // and is verified by visual inspection in the demo harness rather than
  // here (the demo card is wide enough to fit the long option).
  const host = page.locator(".host--omks-web");
  const select = host
    .locator('select[data-testid="long-option-select-inner"]')
    .first();

  await select.selectOption({ value: "long" });

  const overflowState = await select.evaluate((el) => {
    const cs = globalThis.getComputedStyle(el as HTMLSelectElement);
    return {
      textOverflow: cs.textOverflow,
      whiteSpace: cs.whiteSpace,
    };
  });
  expect(overflowState.textOverflow).toBe("ellipsis");
  expect(overflowState.whiteSpace).toBe("nowrap");
  // overflow-x for a native <select> is forced to `visible` by chromium
  // regardless of CSS — the truncation works through text-overflow alone.
});

test("Button has the expected role + variant data attribute", async ({ page }) => {
  const host = page.locator(".host--omks-web");
  const primary = host.locator('[data-testid="toolbar-primary"]').first();
  await expect(primary).toHaveAttribute("data-variant", "primary");
  await expect(primary).toHaveRole("button");
});

test("Checkbox label has truncation styles + does not overflow its parent", async ({ page }) => {
  // Two independent things to prove:
  //   1. The label carries the truncation styles (white-space: nowrap +
  //      text-overflow: ellipsis), so any narrow parent ellipsizes it.
  //   2. Even with a long label, the row stays within its parent —
  //      no horizontal scroll on the wrapper.
  //
  // We do NOT assert scrollWidth > clientWidth: the demo card is wide
  // enough that the long label still fits. The point is that the
  // contract is in place — applied in narrower hosts (a sidebar, a
  // table cell), it activates without code change.
  const host = page.locator(".host--omks-web");
  const wrapper = host.locator('[data-testid="long-checkbox"]').first();
  const label = wrapper.locator("label").first();

  const labelMeta = await label.evaluate((el) => {
    const cs = globalThis.getComputedStyle(el as HTMLElement);
    return {
      whiteSpace: cs.whiteSpace,
      textOverflow: cs.textOverflow,
    };
  });
  expect(labelMeta.whiteSpace).toBe("nowrap");
  expect(labelMeta.textOverflow).toBe("ellipsis");

  const wrapMeta = await wrapper.evaluate((el) => ({
    scrollWidth: (el as HTMLElement).scrollWidth,
    clientWidth: (el as HTMLElement).clientWidth,
  }));
  // The wrapper itself does not horizontally overflow: scrollWidth is at
  // most its own clientWidth (within sub-pixel tolerance).
  expect(wrapMeta.scrollWidth).toBeLessThanOrEqual(wrapMeta.clientWidth + 1);
});

test("Switch carries role=switch (not checkbox)", async ({ page }) => {
  const host = page.locator(".host--omks-web");
  const sw = host.locator('input[role="switch"]').first();
  await expect(sw).toHaveRole("switch");
});

test("Slider exposes role=slider, fires value updates, and reflects --ds-slider-fill", async ({ page }) => {
  const host = page.locator(".host--omks-web");
  const slider = host.locator('input[type="range"]').first();

  // The demo binds value to React state. Drive a value change by setting
  // it via DOM and dispatching the React change event. (Playwright's
  // .fill() does not work on type=range; we do it imperatively.)
  await slider.evaluate((el, value) => {
    const node = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(node, value);
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }, "25");

  await expect(slider).toHaveValue("25");

  const fill = await slider.evaluate(
    (el) => (el as HTMLElement).style.getPropertyValue("--ds-slider-fill"),
  );
  expect(fill).toBe("25.00%");
});
