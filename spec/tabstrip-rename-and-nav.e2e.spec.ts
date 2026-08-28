/**
 * @file E2E: the two claims about `TabStrip` that jsdom cannot see (v1.13).
 *
 * `TabStrip.spec.tsx` (vitest + jsdom) proves the structural / behavioral
 * contract — roving tabindex, the Escape-suppresses-blur-commit latch, which
 * tab carries `data-editing`. What it CANNOT prove is layout, because jsdom
 * has no CSS engine:
 *
 *   - the in-place rename editor's whole reason for existing is that the
 *     tab's slot never shifts width — not when editing starts, not while
 *     typing, not when it commits. That is a `getBoundingClientRect()`
 *     claim, so only a real layout engine can check it.
 *   - the active tab's underline is drawn on the SLOT (not the label
 *     button) specifically so it spans the label AND any adornment, sitting
 *     on top of the tablist's shared rule via the `-1px` margin. Whether
 *     that visually holds is a paint-and-position question.
 *
 * The harness renders one `TabStrip` per host (`demo/main.tsx`,
 * `TabStripDemoPanel`); this file anchors on the `@omks-robo/web` host the
 * way `basics-overflow-and-focus.e2e.spec.ts` does; the layout claims here
 * do not vary by host palette.
 */
import { test, expect, type Locator, type Page } from "playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

/** The demo's single TabStrip instance, scoped to the light-theme host. */
function tabstrip(page: Page): Locator {
  return page.locator(".host--omks-web").locator('[data-testid="tabstrip-demo"]');
}

/** The tab's own slot (label button + adornment + rename editor, ONE
 * underline) — the direct child `<span>` of the tablist, addressed by
 * document order rather than by class (the CSS module class is hashed). */
function slot(page: Page, index: number): Locator {
  return tabstrip(page).locator('[role="tablist"] > span').nth(index);
}

const OVERVIEW = 0;
const CONFIG = 1;
const LOGS = 2;

test("the rename slot does not shift at edit-start, and is already final at commit", async ({
  page,
}) => {
  // "Logs" (index 2) is the demo's renamable tab. Make it active first so
  // the width we measure is the same one carrying the active underline.
  await slot(page, LOGS).getByRole("tab").click();
  await expect(slot(page, LOGS).getByRole("tab")).toHaveAttribute("aria-selected", "true");

  const restBox = await slot(page, LOGS).boundingBox();
  if (!restBox) {
    throw new Error("rest-state slot not measurable");
  }

  // Start the rename. defaultValue = the current label ("Logs"), so the
  // ghost renders the SAME text the button just showed — the slot's width
  // must not jump the instant editing starts.
  await slot(page, LOGS).getByRole("tab").dblclick();
  const input = tabstrip(page).getByRole("textbox", { name: "Rename view" });
  await expect(input).toBeFocused();

  const editStartBox = await slot(page, LOGS).boundingBox();
  if (!editStartBox) {
    throw new Error("edit-start slot not measurable");
  }
  expect(Math.abs(editStartBox.width - restBox.width)).toBeLessThanOrEqual(0.5);

  // Type a draft LONGER than the original label. The slot must grow to
  // follow it (the ghost, not the input's intrinsic ~20ch, decides width).
  const longDraft = "Logs (streaming, verbose)";
  await input.fill(longDraft);
  const midTypingBox = await slot(page, LOGS).boundingBox();
  if (!midTypingBox) {
    throw new Error("mid-typing slot not measurable");
  }
  expect(midTypingBox.width).toBeGreaterThan(restBox.width + 10);

  // Commit. The button that reappears shows the SAME text, same font and
  // padding as the ghost that was just sizing the slot — no jump at commit.
  await input.press("Enter");
  const committedTab = slot(page, LOGS).getByRole("tab");
  await expect(committedTab).toHaveText(longDraft);

  const afterCommitBox = await slot(page, LOGS).boundingBox();
  if (!afterCommitBox) {
    throw new Error("after-commit slot not measurable");
  }
  expect(Math.abs(afterCommitBox.width - midTypingBox.width)).toBeLessThanOrEqual(0.5);
});

test("Escape cancels the rename in the real browser too, and the tab keeps its old label", async ({
  page,
}) => {
  await slot(page, LOGS).getByRole("tab").dblclick();
  const input = tabstrip(page).getByRole("textbox", { name: "Rename view" });
  await input.fill("Should not stick");
  await input.press("Escape");

  // The editor is gone and the original label is back — Escape cancelled,
  // and the blur that follows (Escape moves focus away in some browsers,
  // and the input in any case loses focus once it unmounts) did not
  // re-commit the cancelled draft.
  await expect(tabstrip(page).getByRole("textbox", { name: "Rename view" })).toHaveCount(0);
  await expect(slot(page, LOGS).getByRole("tab")).toHaveText("Logs");
});

test("the active underline is drawn on the slot: it spans the label AND the adornment, over the shared rule", async ({
  page,
}) => {
  const tablist = tabstrip(page).locator('[role="tablist"]');

  const logsTab = slot(page, LOGS).getByRole("tab");
  await logsTab.click();
  await expect(logsTab).toHaveAttribute("aria-selected", "true");

  const adornment = tabstrip(page).getByTestId("tabstrip-adornment-logs");
  await expect(adornment).toBeVisible();

  const slotBox = await slot(page, LOGS).boundingBox();
  const labelBox = await logsTab.boundingBox();
  const adornmentBox = await adornment.boundingBox();
  const tablistBox = await tablist.boundingBox();
  if (!slotBox || !labelBox || !adornmentBox || !tablistBox) {
    throw new Error("layout not measurable");
  }

  // The slot's box — not just the label button's — is what carries the
  // underline (border-bottom-color), so it has to physically contain both
  // the label and the adornment: if the underline lived on the button
  // alone, the adornment would sit outside it.
  expect(slotBox.x).toBeLessThanOrEqual(labelBox.x + 0.5);
  expect(slotBox.x + slotBox.width).toBeGreaterThanOrEqual(adornmentBox.x + adornmentBox.width - 0.5);
  expect(slotBox.width).toBeGreaterThan(labelBox.width); // room for the adornment beyond the label alone

  const activeSlotStyle = await slot(page, LOGS).evaluate((el) => {
    const cs = getComputedStyle(el);
    return { borderBottomColor: cs.borderBottomColor, borderBottomWidth: cs.borderBottomWidth };
  });
  expect(activeSlotStyle.borderBottomWidth).toBe("2px");
  expect(activeSlotStyle.borderBottomColor).not.toBe("rgba(0, 0, 0, 0)");

  // An inactive tab's slot reserves the SAME 2px border-bottom box (so
  // nothing shifts when the active tab changes) but paints it transparent.
  const inactiveSlotStyle = await slot(page, OVERVIEW).evaluate((el) => {
    const cs = getComputedStyle(el);
    return { borderBottomColor: cs.borderBottomColor, borderBottomWidth: cs.borderBottomWidth };
  });
  expect(inactiveSlotStyle.borderBottomWidth).toBe("2px");
  expect(inactiveSlotStyle.borderBottomColor).toBe("rgba(0, 0, 0, 0)");

  // "Over the shared rule": the slot's own border-bottom (2px) is pulled up
  // by `margin-bottom: -1px`, so it contributes only 1px of extra height to
  // the row — exactly the tablist's own shared border-bottom (1px) — rather
  // than sitting beside it. Derive the expected tablist height from the tab
  // button's own (border-free) box: button height + 1px (slot's net
  // contribution) + 1px (the tablist's shared border). If the -1px margin
  // were dropped, the slot would add its full 2px instead of 1px and this
  // would be off by exactly 1px — too large to be sub-pixel noise.
  const buttonHeight = labelBox.height;
  expect(Math.abs(tablistBox.height - (buttonHeight + 2))).toBeLessThanOrEqual(0.75);
});

test("ArrowRight moves focus AND selection together", async ({ page }) => {
  const overviewTab = slot(page, OVERVIEW).getByRole("tab");
  const configTab = slot(page, CONFIG).getByRole("tab");

  await overviewTab.click();
  await expect(overviewTab).toHaveAttribute("aria-selected", "true");
  await overviewTab.focus();
  await expect(overviewTab).toBeFocused();

  await page.keyboard.press("ArrowRight");

  // Selection followed the key (Config is now the active tab)...
  await expect(configTab).toHaveAttribute("aria-selected", "true");
  await expect(overviewTab).toHaveAttribute("aria-selected", "false");
  // ...and so did focus (roving tabindex: only the active tab is tabbable,
  // and this component moves focus itself rather than leaving it stranded
  // on a tab that just became unreachable via Tab).
  await expect(configTab).toBeFocused();
});
