/**
 * @file E2E: prove the v0.12 rule "elevation is not nested" in a real browser.
 *
 * Panel and Card are drawn from the same recipe (--ds-border +
 * --ds-shadow-card). A Card inside a Panel body therefore has to stop
 * restating that elevation, or the pair reads as a frame inside a frame
 * (omksos_web `reports/monitor-ia-recomposition/`). The rule is a CSS
 * ancestor selector with no prop and no class of its own, so:
 *
 *   - vitest/jsdom can only show the structure it stands on (Panel's scope
 *     marker, and the nested card being a descendant of it) — done in
 *     `src/Card.spec.tsx`;
 *   - whether the cascade actually resolves — the right specificity, the
 *     token really bound in this host — is only observable where a style
 *     engine runs. That is this file.
 *
 * Both host sections are checked, because the two consuming apps map
 * --ds-border / --ds-border-subtle / --ds-shadow-card to different palettes
 * and a rule that resolves in one is not evidence for the other.
 *
 * The runner is expected to start the demo vite dev server at
 * http://localhost:5198 (LIB_E2E_BASE_URL) before invoking; the harness
 * tears it down after.
 */
import { test, expect, type Locator, type Page } from "playwright/test";

/**
 * `shadowBound` is the host's own answer to "does a card float by shadow at
 * all". The dashboard binds --ds-shadow-card to a real shadow; the robot
 * console's dark palette binds `--shadow-card: none` (rssa
 * `src/styles/variables.css`), so there the shadow half of the rule is a no-op
 * and the border step is the entire visible change. That is stated here rather
 * than skipped: a host that gains a shadow later fails this expectation and
 * gets the full nested-vs-bare comparison, instead of quietly passing a check
 * that compares "none" with "none".
 */
const HOSTS = [
  { selector: ".host--omks-web", shadowBound: true },
  { selector: ".host--status-webui", shadowBound: false },
] as const;

/** The <section> the Card component renders, inside a testid-bearing wrapper. */
function card(page: Page, host: string, testid: string): Locator {
  return page.locator(host).locator(`[data-testid="${testid}"] > section`);
}

function styleOf(target: Locator, property: string): Promise<string> {
  return target.evaluate(
    (element, prop) => getComputedStyle(element).getPropertyValue(prop),
    property,
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

for (const { selector: host, shadowBound } of HOSTS) {
  test(`${host}: a card inside a panel body carries no shadow of its own`, async ({ page }) => {
    const bare = card(page, host, "bare-card");
    const nestedFirst = card(page, host, "nested-card-first");
    const nestedSecond = card(page, host, "nested-card-second");

    await expect(bare).toBeVisible();
    await expect(nestedFirst).toBeVisible();

    expect(await styleOf(nestedFirst, "box-shadow")).toBe("none");
    expect(await styleOf(nestedSecond, "box-shadow")).toBe("none");

    const bareShadow = await styleOf(bare, "box-shadow");
    if (shadowBound) {
      expect(bareShadow).not.toBe("none");
      expect(bareShadow.trim()).not.toBe("");
    } else {
      expect(bareShadow).toBe("none");
    }
  });

  test(`${host}: the nested border steps down a rung, and it is the subtle token's value`, async ({
    page,
  }) => {
    const bare = card(page, host, "bare-card");
    const nested = card(page, host, "nested-card-first");

    const bareBorder = await styleOf(bare, "border-top-color");
    const nestedBorder = await styleOf(nested, "border-top-color");
    expect(nestedBorder).not.toBe(bareBorder);

    // Not merely "different": it resolves to exactly what this host maps
    // --ds-border-subtle / --ds-border to, so a typo'd token (which computes
    // to a bare initial colour, also "different") fails here.
    const [subtle, border] = await nested.evaluate((element) => {
      const computed = getComputedStyle(element);
      return [
        computed.getPropertyValue("--ds-border-subtle").trim(),
        computed.getPropertyValue("--ds-border").trim(),
      ];
    });
    expect(subtle).not.toBe("");
    expect(subtle).not.toBe(border);

    const resolve = async (value: string): Promise<string> =>
      page.evaluate((raw) => {
        const probe = document.createElement("div");
        probe.style.borderTopStyle = "solid";
        probe.style.borderTopColor = raw;
        document.body.append(probe);
        const painted = getComputedStyle(probe).borderTopColor;
        probe.remove();
        return painted;
      }, value);

    expect(nestedBorder).toBe(await resolve(subtle));
    expect(bareBorder).toBe(await resolve(border));
  });

  test(`${host}: only elevation steps down — radius and header type are untouched`, async ({
    page,
  }) => {
    const bare = card(page, host, "bare-card");
    const nested = card(page, host, "nested-card-first");

    // Shape stays continuous with an un-nested card…
    expect(await styleOf(nested, "border-top-left-radius")).toBe(
      await styleOf(bare, "border-top-left-radius"),
    );
    expect(await styleOf(nested, "padding-top")).toBe(await styleOf(bare, "padding-top"));

    // …and a title is the same title wherever the card sits.
    const heading = (target: Locator): Locator => target.getByRole("heading", { name: "Prompt" });
    await expect(heading(nested)).toBeVisible();
    expect(await styleOf(heading(nested), "font-size")).toBe(
      await styleOf(heading(bare), "font-size"),
    );
    expect(await styleOf(heading(nested), "font-weight")).toBe(
      await styleOf(heading(bare), "font-weight"),
    );
  });
}
