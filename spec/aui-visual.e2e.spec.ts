/**
 * @file Phase 1 visual-regression baseline for the `src/aui/` surface
 * (aui -> CSS Modules migration; see
 * `omksos_web/reports/aui-css-modules/README.md`).
 *
 * This spec does NOT test behavior in the usual sense — it captures the
 * CURRENT Tailwind implementation's rendered output (screenshots +
 * computed-style dumps) so Phase 2's CSS Modules rewrite can be diffed
 * against it pixel-for-pixel and property-for-property. Every scene lives
 * in `demo/aui-main.tsx` / `demo/aui-fixtures.ts` and is reachable at
 * `/aui.html#[data-scene=...]` (a real hash isn't used for routing — the
 * page renders every scene at once; `data-scene` is just the locator key).
 *
 * Run:
 *   LIB_E2E_PORT=5312 bun run test:e2e                       # full suite
 *   LIB_E2E_PORT=5312 bunx playwright test spec/aui-visual.e2e.spec.ts
 *
 * Regenerate baselines (screenshots):
 *   LIB_E2E_PORT=5312 bunx playwright test spec/aui-visual.e2e.spec.ts --update-snapshots
 * Regenerate baselines (computed-style JSON):
 *   AUI_VISUAL_UPDATE=1 LIB_E2E_PORT=5312 bunx playwright test spec/aui-visual.e2e.spec.ts
 *
 * Screenshot baselines are platform-sensitive (font hinting / subpixel AA
 * differ across OS+GPU) — these are captured and compared on darwin/arm64
 * ONLY. Regenerate locally if you're on a different platform; do not treat
 * a first-time mismatch on a new machine as a real regression.
 */
import { expect, test } from "playwright/test";
import {
  captureComputedStyles,
  expectMatchesStyleBaseline,
  moveMouseToNeutralSpot,
} from "./aui-visual-helpers";

test.use({ viewport: { width: 1280, height: 900 } });

const SCREENSHOT_OPTS = { animations: "disabled" as const };

function trackErrors(page: import("playwright/test").Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${String(err)}`));
  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/aui.html");
  await page.waitForLoadState("networkidle");
});

// ---------------------------------------------------------------------------
// thread-empty
// ---------------------------------------------------------------------------
test("thread-empty — welcome view", async ({ page }) => {
  const errors = trackErrors(page);
  const scene = page.locator('[data-scene="thread-empty"]');
  await expect(scene).toHaveScreenshot("thread-empty.png", SCREENSHOT_OPTS);
  expectMatchesStyleBaseline("thread-empty", await captureComputedStyles(scene));
  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// thread-conversation — default view, action-bar hover, edit mode, more-menu.
// ---------------------------------------------------------------------------
test("thread-conversation — default, action-bar hover, edit mode, more-menu", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const scene = page.locator('[data-scene="thread-conversation"]');
  await expect(scene).toHaveScreenshot("thread-conversation-default.png", SCREENSHOT_OPTS);
  expectMatchesStyleBaseline(
    "thread-conversation",
    await captureComputedStyles(scene),
  );

  // Last assistant message: action bar is visible by DEFAULT
  // (ActionBarPrimitive.Root `autohide="not-last"`) — no hover needed to
  // reveal it, only to demonstrate the hover state itself.
  const lastAssistant = scene
    .locator('[data-slot="aui_assistant-message-root"]')
    .last();
  const copyBtn = lastAssistant.getByRole("button", { name: "Copy" });
  await copyBtn.hover();
  await expect(lastAssistant).toHaveScreenshot(
    "thread-conversation-actionbar-hover-copy.png",
    SCREENSHOT_OPTS,
  );
  await moveMouseToNeutralSpot(page);

  const refreshBtn = lastAssistant.getByRole("button", { name: "Refresh" });
  await refreshBtn.hover();
  await expect(lastAssistant).toHaveScreenshot(
    "thread-conversation-actionbar-hover-refresh.png",
    SCREENSHOT_OPTS,
  );
  await moveMouseToNeutralSpot(page);

  const moreBtn = lastAssistant.getByRole("button", { name: "More" });
  await moreBtn.hover();
  await expect(lastAssistant).toHaveScreenshot(
    "thread-conversation-actionbar-hover-more.png",
    SCREENSHOT_OPTS,
  );
  await moreBtn.click();
  const exportItem = page.getByText("Export as Markdown");
  await expect(exportItem).toBeVisible();
  await expect(exportItem).toHaveScreenshot(
    "thread-conversation-more-menu-item.png",
    SCREENSHOT_OPTS,
  );
  await page.keyboard.press("Escape");
  await moveMouseToNeutralSpot(page);

  // Edit mode on the FIRST user message: its action bar autohides (not the
  // last message), so hover to reveal the Edit button first.
  const firstUser = scene.locator('[data-slot="aui_user-message-root"]').first();
  await firstUser.hover();
  const editBtn = firstUser.getByRole("button", { name: "Edit" });
  await expect(editBtn).toBeVisible();
  await editBtn.click();
  await expect(scene).toHaveScreenshot(
    "thread-conversation-edit-mode.png",
    SCREENSHOT_OPTS,
  );
  await page.getByRole("button", { name: "Cancel" }).click();

  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// thread-markdown
// ---------------------------------------------------------------------------
test("thread-markdown — full remark-gfm sweep", async ({ page }) => {
  const errors = trackErrors(page);
  const scene = page.locator('[data-scene="thread-markdown"]');
  await expect(scene).toHaveScreenshot("thread-markdown.png", SCREENSHOT_OPTS);
  expectMatchesStyleBaseline("thread-markdown", await captureComputedStyles(scene));

  // Code block copy button — hover + click, exercised separately since it
  // sits far down the message (scrollIntoViewIfNeeded happens implicitly).
  const codeHeader = scene.locator(".aui-code-header-root").first();
  await expect(codeHeader).toBeVisible();
  await expect(codeHeader).toHaveScreenshot("thread-markdown-code-header.png", SCREENSHOT_OPTS);

  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// thread-tool-calls — 4 ToolFallback states, each double-nested inside its
// own size-1 ToolGroupRoot ("N tool call(s)" — assistant-ui groups EVERY
// tool-call, even a lone one; see aui-fixtures.ts header note).
// ---------------------------------------------------------------------------
test("thread-tool-calls — complete / error / approval / running (frozen)", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const scene = page.locator('[data-scene="thread-tool-calls"]');
  const messages = scene.locator('[data-slot="aui_assistant-message-root"]');
  await expect(messages).toHaveCount(4);

  const names = ["complete", "error", "approval", "running"] as const;
  for (const [index, name] of names.entries()) {
    const msg = messages.nth(index);
    await msg.scrollIntoViewIfNeeded();

    // Collapsed (outer ToolGroupRoot, default closed).
    await expect(msg).toHaveScreenshot(`thread-tool-calls-${name}-collapsed.png`, SCREENSHOT_OPTS);

    // Expand the outer group; the inner ToolFallback auto-opens itself only
    // for the "approval" (requires-action) case, so open it explicitly
    // otherwise.
    await msg.locator('[data-slot="tool-group-trigger"]').click();
    const fallbackTrigger = msg.locator('[data-slot="tool-fallback-trigger"]');
    if ((await fallbackTrigger.getAttribute("data-state")) !== "open") {
      await fallbackTrigger.click();
    }

    const mask =
      name === "running"
        ? [
            msg.locator('[data-slot="tool-group-trigger-loader"]'),
            msg.locator('[data-slot$="-shimmer"]'),
            msg.locator('[data-slot="tool-fallback-trigger-icon"]'),
          ]
        : [];
    await expect(msg).toHaveScreenshot(`thread-tool-calls-${name}-expanded.png`, {
      ...SCREENSHOT_OPTS,
      mask,
    });

    expectMatchesStyleBaseline(
      `thread-tool-calls-${name}`,
      await captureComputedStyles(msg),
    );
  }

  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// thread-tool-group — 3 consecutive complete tool-calls, one real group.
// ---------------------------------------------------------------------------
test("thread-tool-group — collapsed and expanded", async ({ page }) => {
  const errors = trackErrors(page);
  const scene = page.locator('[data-scene="thread-tool-group"]');
  await expect(scene).toHaveScreenshot("thread-tool-group-collapsed.png", SCREENSHOT_OPTS);

  await scene.locator('[data-slot="tool-group-trigger"]').click();
  await expect(scene).toHaveScreenshot("thread-tool-group-expanded.png", SCREENSHOT_OPTS);
  expectMatchesStyleBaseline("thread-tool-group", await captureComputedStyles(scene));

  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// thread-reasoning — done/collapsed group + frozen running group.
// ---------------------------------------------------------------------------
test("thread-reasoning — done (collapsed/expanded) + running (frozen)", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const scene = page.locator('[data-scene="thread-reasoning"]');
  const messages = scene.locator('[data-slot="aui_assistant-message-root"]');
  await expect(messages).toHaveCount(2);

  const done = messages.nth(0);
  await done.scrollIntoViewIfNeeded();
  await expect(done).toHaveScreenshot("thread-reasoning-done-collapsed.png", SCREENSHOT_OPTS);
  await done.locator('[data-slot="reasoning-trigger"]').click();
  await expect(done).toHaveScreenshot("thread-reasoning-done-expanded.png", SCREENSHOT_OPTS);
  expectMatchesStyleBaseline("thread-reasoning-done", await captureComputedStyles(done));

  const running = messages.nth(1);
  await running.scrollIntoViewIfNeeded();
  await expect(running).toHaveScreenshot("thread-reasoning-running.png", {
    ...SCREENSHOT_OPTS,
    mask: [running.locator('[data-slot$="-shimmer"]')],
  });
  expectMatchesStyleBaseline("thread-reasoning-running", await captureComputedStyles(running));

  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// thread-attachments — sent message (image + document) + preview dialog +
// one seeded, unsent composer attachment.
// ---------------------------------------------------------------------------
test("thread-attachments — sent + composer, preview dialog", async ({ page }) => {
  const errors = trackErrors(page);
  const scene = page.locator('[data-scene="thread-attachments"]');
  await expect(scene).toHaveScreenshot("thread-attachments.png", SCREENSHOT_OPTS);
  expectMatchesStyleBaseline("thread-attachments", await captureComputedStyles(scene));

  const sentImage = scene
    .locator('[data-slot="aui_user-message-root"]')
    .getByRole("button", { name: /image attachment/i });
  await sentImage.click();
  const dialogContent = page.locator(".aui-attachment-preview-dialog-content");
  await expect(dialogContent).toBeVisible();
  await expect(dialogContent).toHaveScreenshot(
    "thread-attachments-preview-dialog.png",
    SCREENSHOT_OPTS,
  );
  await page.keyboard.press("Escape");
  await expect(dialogContent).toBeHidden();

  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// thread-composer-states — empty / typed / focus-visible.
// ---------------------------------------------------------------------------
test("thread-composer-states — empty, typed, focus-visible", async ({ page }) => {
  const errors = trackErrors(page);
  const scene = page.locator('[data-scene="thread-composer-states"]');
  await expect(scene).toHaveScreenshot("thread-composer-empty.png", SCREENSHOT_OPTS);
  expectMatchesStyleBaseline(
    "thread-composer-states-empty",
    await captureComputedStyles(scene),
  );

  const input = scene.locator(".aui-composer-input");
  await input.click();
  await expect(scene.locator(".aui-composer-root")).toHaveScreenshot(
    "thread-composer-focus-input.png",
    SCREENSHOT_OPTS,
  );

  await input.fill("Any update on G1-042's charge?");
  await expect(scene.locator(".aui-composer-root")).toHaveScreenshot(
    "thread-composer-typed.png",
    SCREENSHOT_OPTS,
  );
  expectMatchesStyleBaseline(
    "thread-composer-states-typed",
    await captureComputedStyles(scene.locator(".aui-composer-root")),
  );

  // Keyboard-driven Tab from the input lands on the next focusable control
  // (Add Attachment) — a real focus-visible ring on a BUTTON, not just the
  // text-input's native ring.
  await page.keyboard.press("Tab");
  await expect(scene.locator(".aui-composer-root")).toHaveScreenshot(
    "thread-composer-focus-visible-next-control.png",
    SCREENSHOT_OPTS,
  );

  expect(errors).toEqual([]);
});

test("thread-composer-running — frozen mid-run, Cancel replaces Send", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const scene = page.locator('[data-scene="thread-composer-running"]');
  await expect(scene).toHaveScreenshot("thread-composer-running.png", SCREENSHOT_OPTS);
  expectMatchesStyleBaseline(
    "thread-composer-running",
    await captureComputedStyles(scene),
  );
  await expect(scene.getByRole("button", { name: "Stop generating" })).toBeVisible();
  await expect(scene.getByRole("button", { name: "Send message" })).toHaveCount(0);

  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// thread-voice — VoiceControl interaction (fake adapter) + VoiceOrb swatches.
// ---------------------------------------------------------------------------
test("thread-voice — connect / mute / unmute / disconnect + orb swatches", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const scene = page.locator('[data-scene="thread-voice"]');
  const orbMask = scene.locator("canvas.aui-voice-orb");

  await expect(scene).toHaveScreenshot("thread-voice-idle.png", {
    ...SCREENSHOT_OPTS,
    mask: [orbMask],
  });
  expectMatchesStyleBaseline("thread-voice-idle", await captureComputedStyles(scene));

  await scene.getByRole("button", { name: "Connect" }).click();
  await expect(scene.getByRole("button", { name: "Disconnect" })).toBeVisible();
  await expect(scene).toHaveScreenshot("thread-voice-connected.png", {
    ...SCREENSHOT_OPTS,
    mask: [orbMask],
  });

  await scene.getByRole("button", { name: "Mute" }).click();
  await expect(scene).toHaveScreenshot("thread-voice-muted.png", {
    ...SCREENSHOT_OPTS,
    mask: [orbMask],
  });

  await scene.getByRole("button", { name: "Unmute" }).click();
  await scene.getByRole("button", { name: "Disconnect" }).click();
  await expect(scene.getByRole("button", { name: "Connect" })).toBeVisible();

  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// primitives — Button/Avatar/Collapsible grid + portaled Tooltip/Dialog.
// ---------------------------------------------------------------------------
test("primitives — buttons, avatars, collapsible, tooltip, dialog", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const scene = page.locator('[data-scene="primitives"]');
  await expect(scene.locator(".demo-primitives")).toHaveScreenshot(
    "primitives-grid.png",
    SCREENSHOT_OPTS,
  );
  expectMatchesStyleBaseline(
    "primitives-grid",
    await captureComputedStyles(scene.locator(".demo-primitives")),
  );

  // Tooltip content portals to document.body — addressed directly, not
  // scoped to the scene section.
  const tooltipContent = page.locator('[data-testid="tooltip-content"]');
  await expect(tooltipContent).toBeVisible();
  await expect(tooltipContent).toHaveScreenshot("primitives-tooltip-content.png", SCREENSHOT_OPTS);
  expectMatchesStyleBaseline(
    "primitives-tooltip-content",
    await captureComputedStyles(tooltipContent),
  );

  // Dialog: closed by default (its overlay is `fixed inset-0` and would
  // otherwise tint every other scene gray for the page's whole lifetime —
  // see the comment in demo/aui-main.tsx). Click-open, screenshot, close.
  const dialogContent = page.locator('[data-testid="dialog-content"]');
  await expect(dialogContent).toBeHidden();
  await scene.locator('[data-testid="dialog-trigger"]').click();
  await expect(dialogContent).toBeVisible();
  await expect(dialogContent).toHaveScreenshot("primitives-dialog-content.png", SCREENSHOT_OPTS);
  expectMatchesStyleBaseline(
    "primitives-dialog-content",
    await captureComputedStyles(dialogContent),
  );
  await page.keyboard.press("Escape");
  await expect(dialogContent).toBeHidden();

  expect(errors).toEqual([]);
});
