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
import { test, expect, type Locator } from "playwright/test";

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

test("Subtle Button resolves a distinct color register in every host and changes on hover", async ({
  page,
}) => {
  const HOSTS = [
    ".host--status-webui",
    ".host--omks-web",
    ".host--robot-inspection-web",
  ] as const;

  async function colors(button: Locator) {
    return button.evaluate((el) => {
      const cs = globalThis.getComputedStyle(el as HTMLButtonElement);
      return {
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        borderTopColor: cs.borderTopColor,
      };
    });
  }

  for (const hostSelector of HOSTS) {
    const host = page.locator(hostSelector);
    const subtle = host.locator('[data-testid="button-subtle"]').first();
    const secondary = host.locator('[data-testid="button-secondary"]').first();
    const subtleResting = await colors(subtle);
    const secondaryResting = await colors(secondary);

    expect(subtleResting.color).not.toBe(secondaryResting.color);

    await subtle.hover();
    await expect.poll(async () => (await colors(subtle)).color).not.toBe(subtleResting.color);
    const subtleHover = await colors(subtle);

    await secondary.hover();
    await expect
      .poll(async () => (await colors(secondary)).backgroundColor)
      .not.toBe(secondaryResting.backgroundColor);
    const secondaryHover = await colors(secondary);

    expect(subtleHover).not.toEqual(secondaryHover);
  }
});

test("Button centers bare SVG children, including icon-only buttons", async ({ page }) => {
  const HOSTS = [
    ".host--status-webui",
    ".host--omks-web",
    ".host--robot-inspection-web",
  ] as const;
  const ICON_BUTTONS = [
    ["button-icon-with-label", "button-icon-with-label-svg"],
    ["button-icon-only", "button-icon-only-svg"],
  ] as const;

  for (const hostSelector of HOSTS) {
    const host = page.locator(hostSelector);
    for (const [buttonTestId, iconTestId] of ICON_BUTTONS) {
      const button = host.locator(`[data-testid="${buttonTestId}"]`).first();
      const icon = button.locator(`[data-testid="${iconTestId}"]`).first();
      await button.scrollIntoViewIfNeeded();
      const buttonBox = await button.boundingBox();
      const iconBox = await icon.boundingBox();
      if (!buttonBox || !iconBox) {
        throw new Error(`Could not measure ${buttonTestId} in ${hostSelector}`);
      }

      const buttonCenter = buttonBox.y + buttonBox.height / 2;
      const iconCenter = iconBox.y + iconBox.height / 2;
      expect(Math.abs(iconCenter - buttonCenter)).toBeLessThanOrEqual(1.75);
    }
  }
});

test("Danger Button carries its danger outline at rest and goes solid on hover", async ({ page }) => {
  const host = page.locator(".host--omks-web");
  const danger = host.getByRole("button", { name: "Delete" });

  const resting = await danger.evaluate((el) => {
    const cs = globalThis.getComputedStyle(el as HTMLButtonElement);
    return {
      borderTopColor: cs.borderTopColor,
      borderTopStyle: cs.borderTopStyle,
      borderTopWidth: cs.borderTopWidth,
      color: cs.color,
    };
  });
  expect(resting.borderTopColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(resting.borderTopColor).toBe(resting.color);
  expect(resting.borderTopWidth).toBe("1px");
  expect(resting.borderTopStyle).toBe("solid");

  await danger.hover();
  await expect(danger).toHaveCSS("background-color", resting.borderTopColor);
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

test("RemovableChip keeps its × glyph inside a constrained chip box", async ({ page }) => {
  const host = page.locator(".host--omks-web");
  const wrapper = host.locator('[data-testid="long-removable-chip"]').first();
  const chip = wrapper.locator('button[role="listitem"]');
  const label = chip.locator('span:not([aria-hidden="true"])');
  const glyph = chip.locator('span[aria-hidden="true"]');

  await chip.scrollIntoViewIfNeeded();
  await expect(chip).toHaveAttribute("aria-label", /Remove Organization/);

  const wrapperBox = await wrapper.boundingBox();
  const chipBox = await chip.boundingBox();
  const glyphBox = await glyph.boundingBox();
  const labelMeta = await label.evaluate((el) => {
    const cs = globalThis.getComputedStyle(el as HTMLElement);
    return {
      textOverflow: cs.textOverflow,
      whiteSpace: cs.whiteSpace,
      clientWidth: (el as HTMLElement).clientWidth,
      scrollWidth: (el as HTMLElement).scrollWidth,
    };
  });
  if (!wrapperBox || !chipBox || !glyphBox) {
    throw new Error("RemovableChip layout not measurable");
  }

  expect(labelMeta.textOverflow).toBe("ellipsis");
  expect(labelMeta.whiteSpace).toBe("nowrap");
  expect(chipBox.width).toBeLessThanOrEqual(wrapperBox.width + 1);
  expect(labelMeta.scrollWidth).toBeGreaterThan(labelMeta.clientWidth);
  expect(glyphBox.x).toBeGreaterThanOrEqual(chipBox.x - 0.5);
  expect(glyphBox.x + glyphBox.width).toBeLessThanOrEqual(
    chipBox.x + chipBox.width + 1,
  );
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

test("Button focus ring width resolves per host — 1px on robot-inspection-web (prototype-matched), 2px default elsewhere (v0.15.2)", async ({
  page,
}) => {
  // The InspecLog prototype that robot-inspection-web is modeled on draws
  //   :focus-visible { outline: 1px solid var(--il-accent); outline-offset: 2px; }
  // (theme/global.css) — a 1px ring, not the library's 2px default. Through
  // v0.15.1 the alias only bridged --ds-focus-ring-color, leaving width on
  // the library fallback; v0.15.2 adds --ri-focus-ring-width so this host
  // resolves the prototype's width exactly. jsdom cannot see outline width
  // resolve through :focus-visible at all, so this is e2e-only.
  const HOSTS = {
    inspection: ".host--robot-inspection-web",
    web: ".host--omks-web",
    robot: ".host--status-webui",
  } as const;

  async function focusRingWidth(hostSelector: string): Promise<string> {
    const button = page
      .locator(`${hostSelector} [data-testid="toolbar-primary"]`)
      .first();
    await button.focus();
    const isFocusVisible = await button.evaluate((el) =>
      (el as HTMLElement).matches(":focus-visible"),
    );
    expect(isFocusVisible).toBe(true);
    return button.evaluate(
      (el) => globalThis.getComputedStyle(el as HTMLElement).outlineWidth,
    );
  }

  expect(await focusRingWidth(HOSTS.inspection)).toBe("1px");

  // Neither of the other two hosts maps --ds-focus-ring-width, so the
  // inspection-only bridge must not leak into the shared component CSS:
  // both stay on the library's 2px default.
  expect(await focusRingWidth(HOSTS.web)).toBe("2px");
  expect(await focusRingWidth(HOSTS.robot)).toBe("2px");
});

test("SearchInput's focus ring frames the whole box, not just the inner input", async ({ page }) => {
  // jsdom cannot resolve :focus-within at all, so this is e2e-only. The
  // component's contract (see SearchInput.module.css) is: the BOX draws
  // border + focus ring via :focus-within; the inner <input> is borderless
  // (border: none, outline: none) so it contributes nothing of its own.
  const host = page.locator(".host--omks-web");
  const input = host.locator('input[aria-label="Search FAQs"]').first();
  await input.scrollIntoViewIfNeeded();

  const restingBoxStyle = await input.evaluate((el) => {
    const box = (el as HTMLElement).parentElement!;
    const cs = globalThis.getComputedStyle(box);
    return { borderColor: cs.borderColor, boxShadow: cs.boxShadow };
  });
  const restingInputStyle = await input.evaluate((el) => {
    const cs = globalThis.getComputedStyle(el as HTMLInputElement);
    return { borderStyle: cs.borderStyle, outlineStyle: cs.outlineStyle };
  });

  // The inner input never draws a border or an outline of its own, resting
  // or focused — the ring has to come from the box around it.
  expect(restingInputStyle.borderStyle).toBe("none");
  expect(restingInputStyle.outlineStyle).toBe("none");

  await input.focus();
  await expect(input).toBeFocused();

  // The ring paints through a --ds-transition-fast (120ms) transition; poll
  // past it instead of reading the computed style at focus time zero.
  await expect
    .poll(async () =>
      input.evaluate((el) => getComputedStyle((el as HTMLElement).parentElement!).borderColor),
    )
    .not.toBe(restingBoxStyle.borderColor);
  const focusedBoxStyle = await input.evaluate((el) => {
    const box = (el as HTMLElement).parentElement!;
    const cs = globalThis.getComputedStyle(box);
    return { borderColor: cs.borderColor, boxShadow: cs.boxShadow };
  });
  const focusedInputStyle = await input.evaluate((el) => {
    const cs = globalThis.getComputedStyle(el as HTMLInputElement);
    return { outlineStyle: cs.outlineStyle };
  });

  // The BOX's border color and box-shadow change on focus (the ring)...
  expect(focusedBoxStyle.borderColor).not.toBe(restingBoxStyle.borderColor);
  expect(focusedBoxStyle.boxShadow).not.toBe(restingBoxStyle.boxShadow);
  expect(focusedBoxStyle.boxShadow).not.toBe("none");
  // ...while the input itself still draws no outline of its own.
  expect(focusedInputStyle.outlineStyle).toBe("none");
});

test("Pager wraps its buttons inside a narrow container without horizontal overflow", async ({ page }) => {
  const host = page.locator(".host--omks-web");
  const container = host.locator('[data-testid="pager-narrow"]').first();
  const nav = container.locator('nav[role="navigation"]').first();
  await nav.scrollIntoViewIfNeeded();

  const metrics = await nav.evaluate((el) => ({
    scrollWidth: (el as HTMLElement).scrollWidth,
    clientWidth: (el as HTMLElement).clientWidth,
    parentClientWidth: (el as HTMLElement).parentElement!.clientWidth,
  }));

  // flex-wrap: wrap means the nav's own box never exceeds its parent's
  // content box, even though First/Prev/window/Next/Last/summary would
  // overflow a single unwrapped row at this width.
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.clientWidth).toBeLessThanOrEqual(metrics.parentClientWidth + 1);

  // And it actually DID wrap — First/Prev and the summary end up on
  // different rows at 220px, proving flex-wrap fired rather than the
  // content merely happening to fit.
  const firstBox = await nav.getByRole("button", { name: "First page" }).boundingBox();
  const summaryBox = await nav.getByText("Page 1 of 12").boundingBox();
  if (!firstBox || !summaryBox) {
    throw new Error("Pager First button / summary not measurable");
  }
  expect(summaryBox.y).toBeGreaterThan(firstBox.y);
});

test("Pager's disabled boundary buttons resolve a visually distinct (lower-opacity) color from the enabled ones", async ({ page }) => {
  const host = page.locator(".host--omks-web");
  const nav = host.locator('[data-testid="pager-narrow"] nav[role="navigation"]').first();

  const disabledFirst = nav.getByRole("button", { name: "First page" });
  const disabledPrevious = nav.getByRole("button", { name: "Previous page" });
  const enabledNext = nav.getByRole("button", { name: "Next page" });
  const enabledLast = nav.getByRole("button", { name: "Last page" });

  await expect(disabledFirst).toBeDisabled();
  await expect(disabledPrevious).toBeDisabled();
  await expect(enabledNext).toBeEnabled();
  await expect(enabledLast).toBeEnabled();

  async function opacityOf(locator: Locator) {
    return locator.evaluate((el) => globalThis.getComputedStyle(el as HTMLElement).opacity);
  }

  const [firstOpacity, previousOpacity, nextOpacity, lastOpacity] = await Promise.all([
    opacityOf(disabledFirst),
    opacityOf(disabledPrevious),
    opacityOf(enabledNext),
    opacityOf(enabledLast),
  ]);

  // The library's disabled recipe is `opacity: var(--ds-disabled-opacity)`
  // (0.55) — both boundary buttons at page 1 resolve it, and it reads
  // strictly lower than the enabled boundary buttons' full opacity.
  expect(Number(firstOpacity)).toBeCloseTo(0.55, 2);
  expect(Number(previousOpacity)).toBeCloseTo(0.55, 2);
  expect(Number(nextOpacity)).toBe(1);
  expect(Number(lastOpacity)).toBe(1);
});
