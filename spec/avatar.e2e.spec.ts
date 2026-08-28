/**
 * @file E2E: prove Avatar's rendered geometry in the real browser.
 *
 * These claims are CSS-only and therefore do not belong solely to the jsdom
 * spec: the circular clip is a resolved border radius, the tile dimensions
 * include the border-box calculation, and the silhouette's centering needs
 * layout coordinates.
 *
 * The runner starts the demo vite dev server at http://localhost:5198
 * (LIB_E2E_BASE_URL) before invoking; the harness tears it down after.
 */
import { test, expect, type Locator } from "playwright/test";

const HOST = ".host--omks-web";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

/** One CSS property, computed. */
async function computed(locator: Locator, property: string): Promise<string> {
  return locator.evaluate(
    (el, prop) => window.getComputedStyle(el).getPropertyValue(prop),
    property,
  );
}

test("Avatar: image and fallback tiles use the circular clip", async ({ page }) => {
  const imageTile = page.locator(`${HOST} [data-testid="avatar-image"] [data-size="md"]`);
  await expect(imageTile).toBeVisible();

  const box = await imageTile.boundingBox();
  if (box === null) {
    throw new Error("Avatar image tile not measurable");
  }
  expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(0.5);
  expect(await computed(imageTile, "border-top-left-radius")).toBe("50%");
});

test("Avatar: the four rendered tile diameters match the avatar size tokens", async ({ page }) => {
  const expected: Record<string, number> = {
    xs: 24,
    sm: 32,
    md: 56,
    lg: 96,
  };

  for (const [size, diameter] of Object.entries(expected)) {
    const tile = page.locator(`${HOST} [data-testid="avatar-size-${size}"] [data-size="${size}"]`);
    const box = await tile.boundingBox();
    if (box === null) {
      throw new Error(`Avatar ${size} tile not measurable`);
    }
    expect(box.width).toBeCloseTo(diameter, 0);
    expect(box.height).toBeCloseTo(diameter, 0);
  }
});

test("Avatar: the default fallback silhouette is centered in its tile", async ({ page }) => {
  const tile = page.locator(`${HOST} [data-testid="avatar-default"] [data-fallback="glyph"]`);
  const silhouette = tile.locator("svg");
  await expect(tile).toHaveAttribute("role", "img");
  await expect(tile).toHaveAttribute("aria-label", "Default fallback");
  await expect(silhouette).toHaveAttribute("aria-hidden", "true");
  await expect(silhouette).toHaveAttribute("focusable", "false");

  const tileBox = await tile.boundingBox();
  const silhouetteBox = await silhouette.boundingBox();
  if (tileBox === null || silhouetteBox === null) {
    throw new Error("Avatar fallback silhouette not measurable");
  }

  expect(silhouetteBox.x + silhouetteBox.width / 2).toBeCloseTo(
    tileBox.x + tileBox.width / 2,
    0,
  );
  expect(silhouetteBox.y + silhouetteBox.height / 2).toBeCloseTo(
    tileBox.y + tileBox.height / 2,
    0,
  );
});
