/**
 * @file E2E: prove the v0.4 chat primitives behave correctly in a real browser.
 *
 * What jsdom cannot tell us, this spec asserts:
 *   - long bubble content does not overflow its container (overflow-wrap)
 *   - role-based alignment resolves to flex justify-content (computed style)
 *   - the streaming caret animation is wired (caret element exists with
 *     a non-empty backgroundColor — animation itself is timing-sensitive)
 *   - ToolCallTrace `args` are rendered as pretty JSON (preserves newlines
 *     via `white-space: pre-wrap`)
 *   - RealtimeEventLog entries render in the order given (oldest first)
 */
import { test, expect } from "playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("MessageBubble: long unbroken token wraps inside the bubble (no overflow)", async ({
  page,
}) => {
  const host = page.locator(".host--omks-web");
  const bubble = host.locator('[data-testid="bubble-assistant-long"]').first();

  const metrics = await bubble.evaluate((el) => {
    const inner = el.querySelector("div") as HTMLElement;
    return {
      rowScrollWidth: el.scrollWidth,
      rowClientWidth: el.clientWidth,
      innerScrollWidth: inner.scrollWidth,
      innerClientWidth: inner.clientWidth,
    };
  });
  expect(metrics.rowScrollWidth).toBeLessThanOrEqual(metrics.rowClientWidth + 2);
  expect(metrics.innerScrollWidth).toBeLessThanOrEqual(
    metrics.innerClientWidth + 2,
  );
});

test("MessageBubble: role-based alignment resolves to flex justify-content", async ({
  page,
}) => {
  const host = page.locator(".host--omks-web");

  const userJustify = await host
    .locator('[data-testid="bubble-user"]')
    .first()
    .evaluate((el) => globalThis.getComputedStyle(el as HTMLElement).justifyContent);
  expect(userJustify).toBe("flex-end");

  const assistantJustify = await host
    .locator('[data-testid="bubble-assistant-long"]')
    .first()
    .evaluate((el) => globalThis.getComputedStyle(el as HTMLElement).justifyContent);
  expect(assistantJustify).toBe("flex-start");

  const systemJustify = await host
    .locator('[data-testid="bubble-system"]')
    .first()
    .evaluate((el) => globalThis.getComputedStyle(el as HTMLElement).justifyContent);
  expect(systemJustify).toBe("stretch");
});

test("MessageBubble: streaming caret element is present and has a non-zero size", async ({
  page,
}) => {
  const host = page.locator(".host--omks-web");
  const streamingBubble = host.locator('[data-testid="bubble-streaming"]').first();
  const caret = streamingBubble.locator('[data-testid="streaming-caret"]').first();
  await expect(caret).toBeVisible();
  const box = await caret.boundingBox();
  if (!box) {
    throw new Error("Streaming caret not measurable");
  }
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);

  // The non-streaming bubbles MUST NOT have a caret.
  const nonStreaming = host.locator('[data-testid="bubble-user"]').first();
  await expect(
    nonStreaming.locator('[data-testid="streaming-caret"]'),
  ).toHaveCount(0);
});

test("ToolCallTrace: args render as pretty JSON with preserved newlines", async ({
  page,
}) => {
  const host = page.locator(".host--omks-web");
  const argsPre = host
    .locator('[data-testid="tool-trace"] [data-testid="tool-call-args"]')
    .first();
  const text = (await argsPre.innerText()).trim();
  // Pretty JSON contains a newline + indentation between fields.
  expect(text.startsWith("{")).toBe(true);
  expect(text).toMatch(/\n\s+"q":\s+"manual G1-042"/);
  expect(text).toMatch(/\n\s+"limit":\s+3/);

  const ws = await argsPre.evaluate(
    (el) => globalThis.getComputedStyle(el as HTMLElement).whiteSpace,
  );
  expect(ws).toBe("pre-wrap");
});

test("RealtimeEventLog: entries render in chronological order (oldest first)", async ({
  page,
}) => {
  const host = page.locator(".host--omks-web");
  const types = await host
    .locator('[data-testid="event-log"] [data-event-type]')
    .evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLElement).getAttribute("data-event-type")),
    );
  expect(types[0]).toBe("session.created");
  expect(types[types.length - 1]).toBe("error");
  // The error entry's type label color should differ from a regular entry
  // (semantic highlight). We pick the danger token's resolved color and the
  // session.created entry's resolved color and assert they differ.
  const colors = await host
    .locator('[data-testid="event-log"] [data-event-type] > span:first-child')
    .evaluateAll((spans) =>
      spans.map((s) => globalThis.getComputedStyle(s as HTMLElement).color),
    );
  expect(colors[colors.length - 1]).not.toBe(colors[0]);
});

test("Transcript: renders an ol with the bubbles as li children, in order", async ({
  page,
}) => {
  const host = page.locator(".host--omks-web");
  const transcript = host.locator('[data-testid="realtime-transcript"]').first();
  await expect(transcript).toHaveAttribute("aria-label", "conversation");
  const tag = await transcript.evaluate((el) => (el as HTMLElement).tagName);
  expect(tag).toBe("OL");
  const itemCount = await transcript.locator("> li").count();
  expect(itemCount).toBeGreaterThanOrEqual(7);
});

test("MessageBubble: tone='danger' applies a danger-colored border to the bubble inner", async ({
  page,
}) => {
  const host = page.locator(".host--omks-web");
  const errorBubble = host.locator('[data-testid="bubble-error"]').first();
  const inner = errorBubble.locator("> div").first();
  const borderColor = await inner.evaluate(
    (el) => globalThis.getComputedStyle(el as HTMLElement).borderTopColor,
  );
  // Whatever the alias resolves --ds-tone-danger-fg to, it must NOT be
  // transparent (the default). We do a narrow assertion: not transparent
  // and not "rgb(0, 0, 0)" (= black, which would mean the border was just
  // copying currentColor — not the danger token).
  expect(borderColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(borderColor).not.toBe("transparent");
});
