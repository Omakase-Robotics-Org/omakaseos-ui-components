/**
 * @file E2E: prove the v0.10 robot-console primitives (ToggleSwitch,
 *           SignalBars, ReservedText) render and behave correctly in a
 *           real browser — the demo coverage this promotion adds.
 *
 * vitest's jsdom cannot show:
 *   - whether an empty ReservedText occupies the same rendered height as a
 *     filled one (a CSS `calc()` height contract, the entire point of the
 *     primitive)
 *   - a real click driving ToggleSwitch's controlled checked state through
 *     to the DOM
 *
 * The runner is expected to start the demo vite dev server at
 * http://localhost:5198 (LIB_E2E_BASE_URL) before invoking; the harness
 * tears it down after.
 */
import { test, expect } from "playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("ToggleSwitch: on / off / disabled states expose role=switch with the right checked + disabled", async ({
  page,
}) => {
  const host = page.locator(".host--omks-web");

  const on = host.locator('[data-testid="toggle-on"] input[role="switch"]');
  const off = host.locator('[data-testid="toggle-off"] input[role="switch"]');
  const disabled = host.locator('[data-testid="toggle-disabled"] input[role="switch"]');

  await expect(on).toHaveRole("switch");
  await expect(on).toBeChecked();
  await expect(off).toHaveRole("switch");
  await expect(off).not.toBeChecked();
  await expect(disabled).toBeChecked();
  await expect(disabled).toBeDisabled();
});

test("ToggleSwitch: clicking an unchecked switch checks it", async ({ page }) => {
  // The input itself is a zero-size, opacity:0 element (the visible track/
  // thumb is a sibling <span>); the native <label> wrapping both is what
  // forwards a click to the checkbox, so the click target is the label.
  const host = page.locator(".host--omks-web");
  const offLabel = host.locator('[data-testid="toggle-off"] label');
  const offInput = host.locator('[data-testid="toggle-off"] input[role="switch"]');

  await expect(offInput).not.toBeChecked();
  await offLabel.click();
  await expect(offInput).toBeChecked();
});

test("SignalBars: active bar count matches the signal level at every threshold", async ({ page }) => {
  const host = page.locator(".host--omks-web");
  const expected: Record<string, number> = {
    "signalbars-zero": 0,
    "signalbars-low": 1,
    "signalbars-mid": 2,
    "signalbars-high": 3,
    "signalbars-full": 4,
  };

  for (const [testid, activeCount] of Object.entries(expected)) {
    const group = host.locator(`[data-testid="${testid}"]`);
    await expect(group.locator('[data-active="true"]')).toHaveCount(activeCount);
  }
});

test("SignalBars: an unknown signal renders no bars at all", async ({ page }) => {
  const host = page.locator(".host--omks-web");
  const unknown = host.locator('[data-testid="signalbars-unknown"]');
  await expect(unknown.locator('[data-active]')).toHaveCount(0);
});

test("ReservedText: reserves identical height whether or not it holds content", async ({ page }) => {
  const host = page.locator(".host--omks-web");
  const empty = host.locator('[data-testid="reserved-text-empty"]');
  const filled = host.locator('[data-testid="reserved-text-filled"]');

  const emptyBox = await empty.boundingBox();
  const filledBox = await filled.boundingBox();
  if (!emptyBox || !filledBox) {
    throw new Error("ReservedText slots not measurable");
  }

  // Sub-pixel rounding tolerance only — the whole contract is that content
  // arriving/leaving does not change the box height.
  expect(Math.abs(emptyBox.height - filledBox.height)).toBeLessThanOrEqual(1);

  // And the empty slot really has no visible text (not just short text).
  const emptyText = await empty.innerText();
  expect(emptyText.trim()).toBe("");
});
