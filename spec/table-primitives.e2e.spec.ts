/**
 * @file E2E: the Table skin family's CSS-engine-only behaviors.
 *
 * vitest's jsdom cannot tell us whether `fill` actually produces internal
 * scrolling with a header that STAYS PUT (sticky positioning + scroll are
 * both real-layout concerns), whether a wide table's horizontal overflow
 * is contained by `TableSurface` rather than leaking onto the page, or
 * whether the zebra tint / hover wash resolve to genuinely different
 * paint colors per host (a jsdom `getComputedStyle` never runs the
 * cascade against each host's real `--ds-*` alias values the way a real
 * browser does). This spec measures all four in a real browser.
 *
 * The runner is expected to start the demo vite dev server before
 * invoking (see basics-overflow-and-focus.e2e.spec.ts); the harness tears
 * it down after.
 */
import { test, expect, type Locator, type Page } from "playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

function fillSurface(page: Page, host: string): Locator {
  return page.locator(host).locator('[data-testid="table-fill-demo"] > div');
}

function wideSurface(page: Page, host: string): Locator {
  return page.locator(host).locator('[data-testid="table-wide-demo"] > div');
}

function zebraSurface(page: Page, host: string, hostId: string): Locator {
  return page.locator(host).locator(`[data-testid="table-zebra-demo-${hostId}"] > div`);
}

function styleOf(target: Locator, property: string): Promise<string> {
  return target.evaluate(
    (element, prop) => getComputedStyle(element).getPropertyValue(prop),
    property,
  );
}

test("fill: the surface scrolls internally while the page does not, and the sticky header's divider survives the scroll", async ({
  page,
}) => {
  const host = ".host--omks-web";
  const surface = fillSurface(page, host);
  await expect(surface).toBeVisible();

  // (b) The surface is the scroller: its content is taller than its box.
  const overflow = await surface.evaluate((element) => ({
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));
  expect(overflow.scrollHeight).toBeGreaterThan(overflow.clientHeight);

  const thead = surface.locator("thead").first();
  const headerCell = thead.locator("th").first();
  const beforeTop = (await thead.boundingBox())?.y;
  const dividerBefore = await styleOf(headerCell, "box-shadow");
  // The sticky-header divider is painted as an inset box-shadow on the
  // header cell (see Table.module.css) precisely because a plain
  // `border-collapse` border would stay behind a scrolling sticky thead.
  expect(dividerBefore).not.toBe("none");

  await surface.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  // Let the scroll settle before re-measuring.
  await page.waitForTimeout(50);

  // (a) The PAGE did not scroll — only the surface did.
  const pageScrollY = await page.evaluate(() => window.scrollY);
  expect(pageScrollY).toBe(0);
  const surfaceScrollTop = await surface.evaluate((element) => element.scrollTop);
  expect(surfaceScrollTop).toBeGreaterThan(0);

  // The header stayed exactly where it was on screen (sticky positioning),
  // and its divider is still drawn — a plain `border-collapse` divider
  // would have scrolled out of view along with the rows.
  const afterTop = (await thead.boundingBox())?.y;
  expect(afterTop).toBeCloseTo(beforeTop ?? Number.NaN, 0);
  const dividerAfter = await styleOf(headerCell, "box-shadow");
  expect(dividerAfter).not.toBe("none");
  expect(dividerAfter).toBe(dividerBefore);
});

test("a wide table's horizontal overflow is contained by TableSurface, not its ancestor", async ({
  page,
}) => {
  const host = ".host--omks-web";
  // The wrapper the demo caps at 420px — the ancestor TableSurface's own
  // overflow-x must keep the wide table's columns from bursting past.
  const wrapper = page.locator(host).locator('[data-testid="table-wide-demo"]');
  const surface = wideSurface(page, host);
  await expect(surface).toBeVisible();

  const metrics = await surface.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  // The wide table's columns exceed the surface's own box...
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);

  // ...but the capped wrapper around it does not grow to accommodate that
  // content: TableSurface's own `overflow-x: auto` is what contains it,
  // not a lucky layout. (This spec scopes the "does not leak out"
  // assertion to the table's own ancestor, the same way every other
  // overflow-containment e2e in this repo does — e.g.
  // basics-overflow-and-focus.e2e.spec.ts's Pager/Heading checks — rather
  // than to `document.documentElement`: this two-column demo harness
  // already renders wider than the 1280px viewport for reasons that
  // predate this task and have nothing to do with Table, so a
  // whole-page scrollWidth assertion would be measuring the harness's
  // pre-existing layout, not this component's containment.)
  const wrapperWidth = await wrapper.evaluate((element) => element.getBoundingClientRect().width);
  expect(wrapperWidth).toBeLessThanOrEqual(421);
});

const HOSTS = [
  { selector: ".host--status-webui", id: "status-webui" },
  { selector: ".host--omks-web", id: "omks-web" },
  { selector: ".host--robot-inspection-web", id: "robot-inspection-web" },
] as const;

test("zebra tint and hover wash resolve to different, host-distinct computed colors", async ({
  page,
}) => {
  const zebraColors: string[] = [];
  const hoverColors: string[] = [];

  for (const { selector, id } of HOSTS) {
    const surface = zebraSurface(page, selector, id);
    await expect(surface).toBeVisible();

    const rows = surface.locator("tbody tr");
    // tr:nth-child(1) is odd (no zebra tint) — the resting color a hover
    // wash is measured against without the zebra tint also in play.
    const restingCell = rows.nth(0).locator("td").first();
    // tr:nth-child(2) is even — the zebra-tinted row.
    const zebraCell = rows.nth(1).locator("td").first();

    const restingColor = await styleOf(restingCell, "background-color");
    const zebraColor = await styleOf(zebraCell, "background-color");
    expect(zebraColor).not.toBe(restingColor);
    zebraColors.push(zebraColor);

    await restingCell.hover();
    const hoverColor = await styleOf(restingCell, "background-color");
    expect(hoverColor).not.toBe(restingColor);
    hoverColors.push(hoverColor);

    // Clear the hover before the next host's iteration starts.
    await page.mouse.move(0, 0);
  }

  // Distinct per host: each alias maps --ds-table-zebra / --ds-hover-wash
  // through that host's own palette, not a library-wide constant.
  expect(new Set(zebraColors).size).toBe(HOSTS.length);
  expect(new Set(hoverColors).size).toBe(HOSTS.length);
});
