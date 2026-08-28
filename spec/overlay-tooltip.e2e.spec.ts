/**
 * @file E2E: Tooltip (v0.19) — the claims a real pointer timeline and a
 * real layout engine have to prove that jsdom cannot: side="right"
 * placement + vertical centering, the collision flip (and the arrow
 * following the RESOLVED side), immediate pointerleave/focus-blur/Escape
 * dismissal under a real event sequence, and the shared open-delay clock
 * across two adjacent triggers (`Tooltip.spec.tsx` pins the clock's LOGIC
 * with fake timers; this file proves the same behavior with a real pointer
 * moving between two real elements).
 *
 * `demo/main.tsx`'s `TooltipEdgeFlipDemo` anchor is pinned to a VIEWPORT-
 * relative coordinate (`position: fixed`, top-left corner) — the
 * harness's Playwright viewport is pinned to 1280x800
 * (`playwright.config.ts`) — deliberately at a DIFFERENT corner than
 * `FlipAboveDemo`'s (bottom-left) / `RightClampDemo`'s (top-right) fixed
 * anchors from `spec/overlay-popover-menu.e2e.spec.ts`, so this (longer)
 * page's scrolling can never put a Tooltip hover target under one of
 * those unrelated fixed elements.
 */
import { test, expect } from "playwright/test";
import type { Locator } from "playwright/test";

const HOSTS = ["status-webui", "omks-web", "robot-inspection-web"] as const;

/**
 * Hover a target with the scroll separated from the pointer move —
 * `spec/overlay-popover-menu.e2e.spec.ts`'s `clickSettled` documents why:
 * Playwright's `hover()` auto-scrolls the target into view as part of the
 * action, and that scroll's event can be delivered AFTER the hover starts.
 * Tooltip does not dismiss on scroll (unlike Popover/Menu), so this is
 * belt-and-suspenders here rather than a fix for a real race — kept for
 * the same reason `clickSettled` is: a hand-rolled overlay that later
 * grows a scroll-dismiss rule would immediately inherit this exact
 * Playwright auto-scroll hazard, and a settled interaction is what proves
 * it either way.
 */
async function hoverSettled(target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  await target.page().waitForTimeout(80);
  await target.hover();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

for (const host of HOSTS) {
  test(`${host}: side="right" places the label to the right of the trigger, vertically centered`, async ({
    page,
  }) => {
    const trigger = page.getByTestId(`tooltip-right-trigger-${host}`);
    await hoverSettled(trigger);

    const label = page.getByRole("tooltip", { name: "Battery 82%" });
    await expect(label).toBeVisible();
    await expect(label).toHaveAttribute("data-side", "right");

    const triggerBox = await trigger.boundingBox();
    const labelBox = await label.boundingBox();
    expect(triggerBox).not.toBeNull();
    expect(labelBox).not.toBeNull();

    // To the right of the trigger (past its own 8px offset).
    expect(labelBox!.x).toBeGreaterThanOrEqual(triggerBox!.x + triggerBox!.width);
    // Vertically centered on the trigger — align: "center" (the arrow's
    // cross-axis math shares this same anchor midpoint; see below).
    const triggerMidY = triggerBox!.y + triggerBox!.height / 2;
    const labelMidY = labelBox!.y + labelBox!.height / 2;
    expect(Math.abs(triggerMidY - labelMidY)).toBeLessThanOrEqual(1);
  });

  test(`${host}: a trigger pinned near the top edge flips to the bottom, and the arrow follows`, async ({
    page,
  }) => {
    // The fixed edge fixture mounts on demand (it floats over other panels).
    await page.getByTestId(`tooltip-edge-arm-${host}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(80);
    await page.getByTestId(`tooltip-edge-arm-${host}`).click();
    const trigger = page.getByTestId(`tooltip-edge-flip-trigger-${host}`);
    const triggerBox = await trigger.boundingBox();
    expect(triggerBox).not.toBeNull();

    await hoverSettled(trigger);
    const label = page.getByRole("tooltip", { name: "Near the top edge" });
    await expect(label).toBeVisible();
    // Default side="top" cannot fit above an anchor this close to the top
    // edge — the core flips the RESOLVED side to "bottom".
    await expect(label).toHaveAttribute("data-side", "bottom");

    const labelBox = await label.boundingBox();
    expect(labelBox).not.toBeNull();
    // Sits BELOW the trigger (its top edge at or after the trigger's
    // bottom), not above it — the above-placement this anchor position
    // cannot fit.
    expect(labelBox!.y).toBeGreaterThanOrEqual(triggerBox!.y + triggerBox!.height - 1);

    // KEEP #7: the arrow's OWN data-side follows the resolved side too,
    // not just the panel it is drawn inside.
    const arrow = label.locator("svg");
    await expect(arrow).toHaveAttribute("data-side", "bottom");
  });

  test(`${host}: pointerleave closes the tooltip immediately`, async ({ page }) => {
    const trigger = page.getByTestId(`tooltip-dismiss-trigger-${host}`);
    await hoverSettled(trigger);
    const label = page.getByRole("tooltip", { name: "Dismiss me" });
    await expect(label).toBeVisible();

    // A neutral coordinate well away from any trigger — the pointer
    // simply leaving, not landing on anything else.
    await page.mouse.move(20, 20);
    await expect(label).toHaveCount(0);
  });

  test(`${host}: focus opens the tooltip with no delay; blur closes it`, async ({ page }) => {
    const trigger = page.getByTestId(`tooltip-dismiss-trigger-${host}`);
    await trigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(80);

    await trigger.focus();
    const label = page.getByRole("tooltip", { name: "Dismiss me" });
    await expect(label).toBeVisible();

    await trigger.evaluate((el) => (el as HTMLElement).blur());
    await expect(label).toHaveCount(0);
  });

  test(`${host}: Escape closes an open tooltip`, async ({ page }) => {
    const trigger = page.getByTestId(`tooltip-dismiss-trigger-${host}`);
    await hoverSettled(trigger);
    const label = page.getByRole("tooltip", { name: "Dismiss me" });
    await expect(label).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(label).toHaveCount(0);
  });

  test(`${host}: shared delay clock — the first trigger waits the full delay, an adjacent one opens instantly`, async ({
    page,
  }) => {
    const first = page.getByTestId(`tooltip-shared-first-${host}`);
    const second = page.getByTestId(`tooltip-shared-second-${host}`);

    await hoverSettled(first);
    const firstLabel = page.getByRole("tooltip", { name: "First" });
    await expect(firstLabel).toBeVisible();
    // No recent close on this provider's clock — the default fade applies.
    await expect(firstLabel).toHaveAttribute("data-state", "delayed-open");

    // Move directly to the adjacent trigger (already on screen — no
    // separate settle needed) — well within the default 300ms
    // skipDelayDuration of the first tooltip's close.
    await second.hover();
    const secondLabel = page.getByRole("tooltip", { name: "Second" });
    await expect(secondLabel).toBeVisible();
    // KEEP #3: opens INSTANTLY, tagged for the ref CSS's no-fade rule.
    await expect(secondLabel).toHaveAttribute("data-state", "instant-open");
    // The first is gone — pointerleave closed it before the second opened.
    await expect(firstLabel).toHaveCount(0);
  });
}
