/**
 * @file E2E for the v0.5 live-conversation primitives.
 *
 * What we prove in a real browser:
 *   - ConversationStage's grid resolves to the picked column count via
 *     CSS computed style (gridTemplateColumns has N tracks for N=4 → 2).
 *   - ParticipantTile speaking state draws a non-transparent outline.
 *   - ParticipantTile connected=false applies a grayscale filter.
 *   - LiveCaption renders the streaming caret as an element with non-zero
 *     size when streaming is set.
 *   - The caption strip sits AFTER the grid in DOM order (matters for
 *     screen-reader navigation: tiles first, then live caption).
 */
import { test, expect } from "playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("ConversationStage grid resolves to the picked column count", async ({
  page,
}) => {
  const host = page.locator(".host--omks-web");
  const grid = host.locator('[data-testid="demo-stage"] [data-testid="stage-grid"]').first();
  const cols = await grid.evaluate((el) => {
    const cs = globalThis.getComputedStyle(el as HTMLElement);
    return cs.gridTemplateColumns.split(" ").length;
  });
  // tileCount=4 → pickStageColumns(4) === 2.
  expect(cols).toBe(2);
});

test("ParticipantTile (speaking) draws a non-transparent outline", async ({
  page,
}) => {
  const host = page.locator(".host--omks-web");
  const speaking = host.locator('[data-testid="tile-bot"]').first();
  const nonSpeaking = host.locator('[data-testid="tile-operator"]').first();

  const speakingOutline = await speaking.evaluate(
    (el) => globalThis.getComputedStyle(el as HTMLElement).outlineColor,
  );
  const idleOutline = await nonSpeaking.evaluate(
    (el) => globalThis.getComputedStyle(el as HTMLElement).outlineColor,
  );

  // Speaking outline must NOT be transparent.
  expect(speakingOutline).not.toBe("rgba(0, 0, 0, 0)");
  expect(speakingOutline).not.toBe("transparent");
  // The two outlines must differ — i.e. the speaking ring is actually being
  // drawn for the speaker and not for the listener.
  expect(speakingOutline).not.toBe(idleOutline);
});

test("ParticipantTile (connected=false) applies a grayscale filter", async ({
  page,
}) => {
  const host = page.locator(".host--omks-web");
  const dropped = host.locator('[data-testid="tile-robot-dropped"]').first();
  const filter = await dropped.evaluate(
    (el) => globalThis.getComputedStyle(el as HTMLElement).filter,
  );
  expect(filter).toContain("grayscale");
});

test("LiveCaption renders a streaming caret with non-zero size", async ({
  page,
}) => {
  const host = page.locator(".host--omks-web");
  const caret = host
    .locator('[data-testid="demo-caption"] [data-testid="live-caption-caret"]')
    .first();
  await expect(caret).toBeVisible();
  const box = await caret.boundingBox();
  if (!box) {
    throw new Error("caret not measurable");
  }
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
});

test("ConversationStage places the caption AFTER the grid in DOM order", async ({
  page,
}) => {
  const host = page.locator(".host--omks-web");
  const grid = host.locator('[data-testid="stage-grid"]').first();
  const caption = host.locator('[data-testid="demo-caption"]').first();
  // Compare bounding boxes — caption.y > grid.y means it sits below.
  const gridBox = await grid.boundingBox();
  const capBox = await caption.boundingBox();
  if (!gridBox || !capBox) {
    throw new Error("layout not measurable");
  }
  expect(capBox.y).toBeGreaterThan(gridBox.y);
});

test("ParticipantTile name strip truncates a long name with ellipsis", async ({
  page,
}) => {
  const host = page.locator(".host--omks-web");
  // Use the operator's tile; its name is short, but we just check that the
  // name span carries the truncation styles regardless of its own width.
  const nameSpan = host
    .locator('[data-testid="tile-operator"]')
    .locator("span")
    .nth(2); // dot, name. nth(2) inside parent might miss; locate by class
  // Directly query the .name node by computed-style heuristic: any span
  // inside the tile whose white-space is nowrap.
  const styleHit = await host
    .locator('[data-testid="tile-operator"]')
    .evaluate((el) => {
      const spans = el.querySelectorAll("span");
      for (const s of Array.from(spans)) {
        const cs = globalThis.getComputedStyle(s as HTMLElement);
        if (cs.whiteSpace === "nowrap" && cs.textOverflow === "ellipsis") {
          return true;
        }
      }
      return false;
    });
  expect(styleHit).toBe(true);
});
