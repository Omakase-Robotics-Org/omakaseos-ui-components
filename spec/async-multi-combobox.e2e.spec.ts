/**
 * @file E2E: AsyncMultiCombobox (v0.18) — the claims a real layout +
 * focus engine has to prove that jsdom cannot.
 *
 * `src/AsyncMultiCombobox.spec.tsx` (jsdom) already pins the ARIA wiring,
 * the keyboard model, exclusion of already-selected candidates, and the
 * seen-label / resolveLabel fallback order with `fireEvent`. What jsdom
 * cannot show at all:
 *   - whether the chip row actually WRAPS inside one bordered control box
 *     as chips accumulate, rather than breaking the box or spilling
 *     outside its parent (no CSS layout engine);
 *   - whether the candidate panel's rendered width really tracks the
 *     control box it is anchored under (`left: 0; right: 0` resolving
 *     against a real ancestor width);
 *   - whether `document.activeElement` really stays the `<input>` through
 *     a pointer pick — jsdom's focus model does not reproduce a real
 *     browser's mousedown → focus-shift → click sequencing closely
 *     enough to trust this claim from `fireEvent.mouseDown` alone.
 *
 * `demo/main.tsx`'s `AsyncMultiComboboxDemo` pre-selects 6 chips inside a
 * `maxWidth: 320` frame — enough chips, in a narrow enough box, that
 * wrapping is forced deterministically regardless of viewport width.
 *
 * Per this task's binding amendments, pointer interactions here use the
 * same settled-click pattern as `overlay-popover-menu.e2e.spec.ts`
 * (`clickSettled`): Playwright's `.click()` auto-scrolls its target into
 * view as part of the action, and that scroll can be delivered to the
 * page in between mousedown and the focus-retention assertion that
 * follows a pick. This widget's own panel is `display:none` when closed
 * (not scroll-dismissed the way Popover/Menu are), so there is no
 * dismissal race to reproduce — but a real user never scrolls and clicks
 * in the same instant either, so the same separation is used for every
 * focus-retention assertion below regardless.
 */
import { test, expect } from "playwright/test";
import type { Locator } from "playwright/test";

const HOSTS = ["status-webui", "omks-web", "robot-inspection-web"] as const;

/** Click `target` with the scroll separated from the click — see file header. */
async function clickSettled(target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  await target.page().waitForTimeout(80);
  await target.click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

for (const host of HOSTS) {
  test(`${host}: chip-row wraps inside ONE control box at 6+ chips`, async ({ page }) => {
    const frame = page.locator(`[data-testid="multi-combobox-demo-${host}"]`);
    // AsyncMultiCombobox's own outer `wrap` div is the frame's sole child;
    // its FIRST child div is the bordered "control" box (chips + input),
    // its SECOND is the candidate panel.
    const wrap = frame.locator("> div").first();
    const control = wrap.locator("> div").first();
    const chips = wrap.getByRole("listitem");
    await expect(chips).toHaveCount(6);

    const frameBox = await frame.boundingBox();
    const controlBox = await control.boundingBox();
    expect(frameBox).not.toBeNull();
    expect(controlBox).not.toBeNull();
    // ONE control box: it never grows wider than the frame it sits in.
    // A broken layout (a chip escaping the border, or the box expanding
    // past its container instead of wrapping) would show up as the
    // control box wider than the frame.
    expect(controlBox!.width).toBeLessThanOrEqual(frameBox!.width + 1);

    // The 6 chips wrap onto more than one line of that ONE box (not six
    // separate boxes, and not clipped): the last chip sits on a lower
    // line than the first, and both stay within the control box's own
    // bottom edge.
    const firstChipBox = await chips.first().boundingBox();
    const lastChipBox = await chips.last().boundingBox();
    expect(firstChipBox).not.toBeNull();
    expect(lastChipBox).not.toBeNull();
    expect(lastChipBox!.y).toBeGreaterThan(firstChipBox!.y);
    expect(lastChipBox!.y + lastChipBox!.height).toBeLessThanOrEqual(
      controlBox!.y + controlBox!.height + 1,
    );
  });

  test(`${host}: the candidate panel's width tracks the control box`, async ({ page }) => {
    const frame = page.locator(`[data-testid="multi-combobox-demo-${host}"]`);
    const wrap = frame.locator("> div").first();
    const control = wrap.locator("> div").first();
    const panel = wrap.locator("> div").nth(1);
    const input = wrap.getByRole("combobox");

    await clickSettled(input);
    await expect(panel).toBeVisible();

    const controlBox = await control.boundingBox();
    const panelBox = await panel.boundingBox();
    expect(controlBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    expect(Math.abs(panelBox!.width - controlBox!.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(panelBox!.x - controlBox!.x)).toBeLessThanOrEqual(1);
  });

  test(`${host}: a pointer pick on a candidate keeps focus on the input`, async ({ page }) => {
    const frame = page.locator(`[data-testid="multi-combobox-demo-${host}"]`);
    const wrap = frame.locator("> div").first();
    const input = wrap.getByRole("combobox");

    await clickSettled(input);
    // "Glow" is one of the 2 unselected candidates (8 total minus the 6
    // pre-selected chips) — always present regardless of query state.
    const option = wrap.getByRole("option", { name: "Glow" });
    await expect(option).toBeVisible();
    await clickSettled(option);

    const isInputFocused = await input.evaluate((el) => el === document.activeElement);
    expect(isInputFocused).toBe(true);
    // The pick committed (chip count grew) — the focus check above is
    // not vacuously true because the click missed the option.
    await expect(wrap.getByRole("listitem")).toHaveCount(7);
  });

  test(`${host}: Backspace on an empty query removes the last chip`, async ({ page }) => {
    const frame = page.locator(`[data-testid="multi-combobox-demo-${host}"]`);
    const wrap = frame.locator("> div").first();
    const input = wrap.getByRole("combobox");
    const chips = wrap.getByRole("listitem");
    await expect(chips).toHaveCount(6);
    const lastChipLabel = await chips.last().evaluate((el) => el.getAttribute("aria-label"));

    await clickSettled(input);
    await input.press("Backspace");

    await expect(chips).toHaveCount(5);
    expect(lastChipLabel).not.toBeNull();
    await expect(wrap.getByRole("listitem", { name: lastChipLabel! })).toHaveCount(0);
  });
}
