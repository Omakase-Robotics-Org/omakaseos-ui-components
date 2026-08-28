/**
 * @file E2E: Dialog / ConfirmDialog (v0.19) — the claims a real layout/UA
 * engine has to prove that jsdom cannot (`Dialog.spec.tsx` covers the
 * open/close protocol, ARIA wiring, and DOM-order placement in jsdom; see
 * its own header for the same split `overlay-popover-menu.e2e.spec.ts`
 * already draws for Popover/Menu):
 *
 *   - Centering survives a host-side `* { margin: 0 }` reset — the "hard-
 *     won CSS detail" `Dialog.module.css`'s header argues for. jsdom
 *     cannot show this at all (no layout engine).
 *   - `::backdrop` actually paints `--ds-scrim` — a pseudo-element jsdom
 *     does not render.
 *   - `md` vs `lg` resolve to visibly different on-screen widths.
 *   - `footerStart` sits to the LEFT of the footer's Cancel button on
 *     screen (a real `getBoundingClientRect()` comparison, not DOM order —
 *     `Dialog.spec.tsx` already pins the DOM order; this pins the paint).
 *   - ConfirmDialog's `busy` state actually resolves visible aria-disabled
 *     styling (folded in here per the task's "cheap" instruction rather
 *     than a separate spec file).
 *
 * `demo/main.tsx`'s `DialogDemo` / `ConfirmDialogDemo` render one instance
 * per host (`dialog-*-${host}` / `confirmdialog-*-${host}` testids), same
 * per-host loop `overlay-popover-menu.e2e.spec.ts` uses.
 */
import { test, expect } from "playwright/test";

const HOSTS = ["status-webui", "omks-web", "robot-inspection-web"] as const;

/**
 * Click a trigger with the scroll separated from the click. Playwright's
 * click() auto-scrolls the target into view as part of the action, and
 * (per `overlay-popover-menu.e2e.spec.ts`'s own note) that scroll's event
 * can be delivered after an open action lands. Native `<dialog>` has no
 * scroll-dismiss behavior of its own, but the settled-click pattern is
 * followed anyway for consistency with every other trigger click in this
 * harness.
 */
async function clickSettled(target: import("playwright/test").Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  await target.page().waitForTimeout(80);
  await target.click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

for (const host of HOSTS) {
  test(`${host}: Dialog centers under a host-side "* { margin: 0 }" reset`, async ({ page }) => {
    await clickSettled(page.getByTestId(`dialog-margin-reset-toggle-${host}`));
    await clickSettled(page.getByTestId(`dialog-open-md-${host}`));

    const dialog = page.locator("dialog[open]", { hasText: "Delete robot" });
    await expect(dialog).toBeVisible();

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();

    // Centered, not pinned to the top-left corner: roughly equal space on
    // both sides horizontally, and NOT flush against x=0/y=0.
    const leftGap = box!.x;
    const rightGap = viewport!.width - (box!.x + box!.width);
    expect(leftGap).toBeGreaterThan(4);
    expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(2);
    expect(box!.y).toBeGreaterThan(4);

    // Clean up: turn the reset back off so it cannot leak into a later
    // test on the SAME page instance (each `test` gets its own page via
    // beforeEach's fresh goto, but this closes the dialog for hygiene).
    await page.getByTestId(`dialog-footer-cancel-${host}`).click();
  });

  test(`${host}: Dialog's ::backdrop paints --ds-scrim`, async ({ page }) => {
    await clickSettled(page.getByTestId(`dialog-open-md-${host}`));
    const dialog = page.locator("dialog[open]", { hasText: "Delete robot" });
    await expect(dialog).toBeVisible();

    const backdropColor = await page.evaluate(() => {
      const el = document.querySelector("dialog[open]");
      if (el === null) {
        return null;
      }
      return getComputedStyle(el, "::backdrop").backgroundColor;
    });
    // A real, non-transparent color was resolved (the scrim), not the
    // initial `rgba(0, 0, 0, 0)` / "transparent" a missing rule would
    // leave the pseudo-element at.
    expect(backdropColor).not.toBeNull();
    expect(backdropColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(backdropColor).not.toBe("transparent");

    await page.getByTestId(`dialog-footer-cancel-${host}`).click();
  });

  test(`${host}: md vs lg resolve to visibly different widths`, async ({ page }) => {
    await clickSettled(page.getByTestId(`dialog-open-md-${host}`));
    const dialog = page.locator("dialog[open]", { hasText: "Delete robot" });
    await expect(dialog).toBeVisible();
    const mdBox = await dialog.boundingBox();
    expect(mdBox).not.toBeNull();
    await page.getByTestId(`dialog-footer-cancel-${host}`).click();
    await expect(dialog).toHaveCount(0);

    await clickSettled(page.getByTestId(`dialog-open-lg-${host}`));
    await expect(dialog).toBeVisible();
    const lgBox = await dialog.boundingBox();
    expect(lgBox).not.toBeNull();

    expect(lgBox!.width).toBeGreaterThan(mdBox!.width + 100);

    await page.getByTestId(`dialog-footer-cancel-${host}`).click();
  });

  test(`${host}: footerStart sits to the LEFT of Cancel, on screen, in one footer row`, async ({
    page,
  }) => {
    await clickSettled(page.getByTestId(`dialog-open-md-${host}`));
    const dialog = page.locator("dialog[open]", { hasText: "Delete robot" });
    await expect(dialog).toBeVisible();

    const footerStart = page.getByTestId(`dialog-footerstart-delete-${host}`);
    const cancel = page.getByTestId(`dialog-footer-cancel-${host}`);
    await expect(footerStart).toBeVisible();
    await expect(cancel).toBeVisible();

    const footerStartBox = await footerStart.boundingBox();
    const cancelBox = await cancel.boundingBox();
    expect(footerStartBox).not.toBeNull();
    expect(cancelBox).not.toBeNull();

    // Same row: vertically overlapping.
    expect(Math.abs(footerStartBox!.y - cancelBox!.y)).toBeLessThan(footerStartBox!.height);
    // footerStart is on the LEFT of the row, Cancel to its right.
    expect(footerStartBox!.x).toBeLessThan(cancelBox!.x);

    await cancel.click();
  });

  test(`${host}: ConfirmDialog busy resolves visible aria-disabled styling on both buttons`, async ({
    page,
  }) => {
    // Enabled register first — measured for the opacity comparison. A
    // showModal() dialog inerts the page outside it, so busy cannot be
    // toggled mid-dialog from outside; the demo opens each register from
    // its own entry point instead.
    await clickSettled(page.getByTestId(`confirmdialog-open-${host}`));
    const confirmDialog = page.locator("dialog[open]", { hasText: "Delete robot" });
    await expect(confirmDialog).toBeVisible();

    const cancelButton = confirmDialog.getByRole("button", { name: "Cancel" });
    const deleteButton = confirmDialog.getByRole("button", { name: "Delete" });
    const cancelOpacityBefore = await cancelButton.evaluate((el) => getComputedStyle(el).opacity);
    const deleteOpacityBefore = await deleteButton.evaluate((el) => getComputedStyle(el).opacity);
    await cancelButton.click();
    await expect(confirmDialog).toHaveCount(0);

    await clickSettled(page.getByTestId(`confirmdialog-open-busy-${host}`));
    await expect(confirmDialog).toBeVisible();

    await expect(cancelButton).toHaveAttribute("aria-disabled", "true");
    await expect(deleteButton).toHaveAttribute("aria-disabled", "true");

    const cancelOpacityAfter = await cancelButton.evaluate((el) => getComputedStyle(el).opacity);
    const deleteOpacityAfter = await deleteButton.evaluate((el) => getComputedStyle(el).opacity);
    // The disabled visual (--ds-disabled-opacity) actually resolved to a
    // lower opacity than the enabled state, not just an inert attribute.
    expect(Number(cancelOpacityAfter)).toBeLessThan(Number(cancelOpacityBefore));
    expect(Number(deleteOpacityAfter)).toBeLessThan(Number(deleteOpacityBefore));

    // Clicking while busy must not close the dialog (onConfirm/onCancel
    // are not invoked) — the click on an aria-disabled Button is refused
    // at the Button level.
    await deleteButton.click({ force: true });
    await expect(confirmDialog).toBeVisible();

    // No hygiene close: each test gets a fresh page, and in the busy
    // register both buttons are deliberately inert.
  });
}
