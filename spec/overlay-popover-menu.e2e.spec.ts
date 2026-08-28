/**
 * @file E2E: Popover / Menu (v0.18) — the claims a layout engine has to
 * prove that jsdom cannot.
 *
 * `src/floating/anchored-position.spec.ts` pins `anchoredPanelPosition`'s
 * math directly (hand-derived numbers, no DOM). What THAT file cannot show
 * is that a real anchor, a real panel, and a real viewport actually drive
 * that function to the same conclusion — flipping when the bottom edge
 * would clip, clamping when the right edge would clip, and (this is the
 * part jsdom is structurally unable to show at all) that the portaled
 * panel really escapes an `overflow: hidden` ancestor rather than being
 * clipped invisible inside it. `Menu`'s roving-focus + Escape-return and
 * `Popover`'s `dialog[open]` carve-out are behavior jsdom COULD show
 * (`Popover.spec.tsx` / `Menu.spec.tsx` already do, with fireEvent) but are
 * repeated here against the real anchors this harness measures, so a
 * regression that only shows up under a real layout/focus engine cannot
 * hide behind "the unit spec is green".
 *
 * `demo/main.tsx`'s `FlipAboveDemo` / `RightClampDemo` anchors are pinned
 * to VIEWPORT-relative coordinates (`position: fixed`) rather than relying
 * on scroll position — the harness's Playwright viewport is pinned to
 * 1280x800 (`playwright.config.ts`), so "near the bottom edge" / "near the
 * right edge" are deterministic regardless of where the rest of the page
 * happens to lay out. All three hosts render simultaneously; only the one
 * host under test ever has an open panel (Popover/Menu return `null` while
 * closed), so the always-rendered anchor BUTTONS are the only thing that
 * needs a per-host offset to avoid colliding on screen.
 */
import { test, expect } from "playwright/test";

const HOSTS = ["status-webui", "omks-web", "robot-inspection-web"] as const;

/**
 * Open an anchored panel by clicking its trigger with the scroll separated
 * from the click. Popover/Menu dismiss on any capture-phase window scroll;
 * Playwright's click() auto-scrolls the target into view as part of the
 * action, and that scroll's event can be delivered AFTER the panel opened,
 * dismissing it on arrival. Real users never scroll and open in the same
 * instant; the separation reproduces the real sequence.
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
  test(`${host}: flip-above — a panel that cannot fit below a bottom-edge anchor flips to the top`, async ({
    page,
  }) => {
    const anchor = page.locator(`[data-testid="overlay-flip-${host}"] button`);
    const anchorBox = await anchor.boundingBox();
    expect(anchorBox).not.toBeNull();

    await clickSettled(anchor);
    const panel = page.getByRole("dialog", { name: "Flip-above demo" });
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("data-side", "top");

    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    // Sits ABOVE the anchor (its bottom edge at or before the anchor's top),
    // not below it — the below-placement this anchor position cannot fit.
    expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(anchorBox!.y + 1);
  });

  test(`${host}: right-edge clamp — align:start against a right-edge anchor still stays on screen`, async ({
    page,
  }) => {
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const anchor = page.locator(`[data-testid="overlay-clamp-${host}"] button`);
    await clickSettled(anchor);

    const panel = page.getByRole("dialog", { name: "Right-clamp demo" });
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("data-side", "bottom");

    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    const margin = 8;
    const maxRight = viewport!.width - margin;
    // Inside the viewport (the clamp engaged)...
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(maxRight + 1);
    // ...and pinned AT the clamp boundary, not merely "happens to fit" —
    // proof the unclamped (anchor-aligned) position would have overflowed.
    expect(panelBox!.x + panelBox!.width).toBeGreaterThan(maxRight - 2);
  });

  test(`${host}: the panel escapes an overflow:hidden ancestor (portal claim)`, async ({ page }) => {
    const wrapperTestId = `overlay-overflow-clip-${host}`;
    await clickSettled(page.locator(`[data-testid="${wrapperTestId}"] button`));

    const content = page.getByTestId("overlay-overflow-content");
    await expect(content).toBeVisible();

    const structurallyEscaped = await page.evaluate((testid) => {
      const wrapper = document.querySelector(`[data-testid="${testid}"]`);
      const panelContent = document.querySelector('[data-testid="overlay-overflow-content"]');
      if (wrapper === null || panelContent === null) {
        return null;
      }
      return {
        wrapperContainsPanel: wrapper.contains(panelContent),
        bodyContainsPanel: document.body.contains(panelContent),
      };
    }, wrapperTestId);
    expect(structurallyEscaped).toEqual({ wrapperContainsPanel: false, bodyContainsPanel: true });

    // Visual corollary: the content paints below the 40px-tall clipping
    // ancestor. If it were (wrongly) rendered inside that ancestor instead
    // of portaled, this part would be clipped to zero height / invisible.
    const wrapperBox = await page.locator(`[data-testid="${wrapperTestId}"]`).boundingBox();
    const contentBox = await content.boundingBox();
    expect(wrapperBox).not.toBeNull();
    expect(contentBox).not.toBeNull();
    expect(contentBox!.y + contentBox!.height).toBeGreaterThan(wrapperBox!.y + wrapperBox!.height);
  });

  test(`${host}: Menu ArrowDown moves the active item`, async ({ page }) => {
    const trigger = page.getByTestId(`overlay-menu-trigger-${host}`);
    await clickSettled(trigger);

    const menu = page.getByRole("menu", { name: "Robot actions" });
    await expect(menu).toBeVisible();
    const rename = menu.getByRole("menuitem", { name: "Rename" });
    const duplicate = menu.getByRole("menuitem", { name: "Duplicate" });

    await expect(rename).toHaveAttribute("tabindex", "0");
    await expect(rename).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(duplicate).toHaveAttribute("tabindex", "0");
    await expect(rename).toHaveAttribute("tabindex", "-1");
    await expect(duplicate).toBeFocused();
  });

  test(`${host}: Escape closes the menu and returns focus to the trigger`, async ({ page }) => {
    const trigger = page.getByTestId(`overlay-menu-trigger-${host}`);
    await clickSettled(trigger);
    await expect(page.getByRole("menu", { name: "Robot actions" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu", { name: "Robot actions" })).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test(`${host}: dialog[open] carve-out — a click inside a dialog stacked over the popover does not close it`, async ({
    page,
  }) => {
    const wrapper = page.getByTestId(`overlay-dialog-above-${host}`);
    await clickSettled(wrapper.getByRole("button", { name: "Open editor" }));

    const popover = page.getByRole("dialog", { name: "Editor with a nested dialog" });
    await expect(popover).toBeVisible();

    await page.getByTestId("overlay-dialog-open-button").click();
    const stacked = page.getByTestId("overlay-stacked-dialog");
    await expect(stacked).toBeVisible();

    // The pointerdown that lands on this button is inside an open <dialog>,
    // which Popover's outside-pointerdown listener carves out as NOT
    // "outside" — see .codex/ref/Popover.tsx's `isAboveThePanel` and its
    // file header's reasoning.
    await page.getByTestId("overlay-stacked-dialog-pick").click();
    await expect(popover).toBeVisible();
  });

  test(`${host}: without the stacked dialog, an outside click still closes the popover (control)`, async ({
    page,
  }) => {
    const wrapper = page.getByTestId(`overlay-dialog-above-${host}`);
    await clickSettled(wrapper.getByRole("button", { name: "Open editor" }));

    const popover = page.getByRole("dialog", { name: "Editor with a nested dialog" });
    await expect(popover).toBeVisible();

    // A plain outside click (no dialog[open] in the way) dismisses it —
    // the case the dialog[open] carve-out is an exception TO.
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await expect(popover).toHaveCount(0);
  });
}
