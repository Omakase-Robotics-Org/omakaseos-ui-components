/**
 * @file E2E: prove the v0.15 shape-carried Status primitives (StatusGlyph,
 *           RankChip, SegmentedMeter) actually distinguish their registers
 *           WITHOUT hue, in a real browser — and that they do it on the
 *           desaturated third host (robot-inspection-web) as well as on the
 *           two that have colour to spare.
 *
 * vitest's jsdom cannot show any of the claims these primitives are made of:
 *   - `border-style` (solid vs dashed) is never computed there, and it is the
 *     ONLY thing separating `warning` from `neutral` and `neutral` from `idle`
 *     once hue is gone
 *   - `color-mix()` is not resolved, so the meter's four opacity tiers and the
 *     glyph rings all read as the literal function text
 *   - a percentage width has no pixels, so "the division drawn is the division
 *     given" is unmeasurable
 *   - identical box sizes across five states (the anti-jitter contract) needs
 *     layout
 *
 * The runner starts the demo vite dev server at http://localhost:5198
 * (LIB_E2E_BASE_URL) before invoking; the harness tears it down after.
 */
import { test, expect, type Locator, type Page } from "playwright/test";

const HOSTS = {
  inspection: ".host--robot-inspection-web",
  web: ".host--omks-web",
  robot: ".host--status-webui",
} as const;

const GLYPH_TONES = ["success", "danger", "warning", "neutral", "idle"] as const;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

/** The glyph element itself (the demo wraps each in a labelled cell). */
function glyph(page: Page, host: string, tone: string): Locator {
  return page.locator(`${host} [data-testid="glyph-${tone}"] [data-tone="${tone}"]`);
}

/** One CSS property, computed. */
async function computed(locator: Locator, property: string): Promise<string> {
  return locator.evaluate(
    (el, prop) => window.getComputedStyle(el).getPropertyValue(prop),
    property,
  );
}

/**
 * Alpha channel of a computed colour.
 *
 * Two serializations occur here and both have to be read: plain token values
 * come back as `rgb()` / `rgba()`, while anything Chromium resolved from
 * `color-mix()` (the meter's four tiers, the glyph rings) comes back in the
 * modern form `color(srgb r g b / a)`, with the `/ a` omitted when opaque.
 *
 * Throws rather than defaulting: a colour this cannot read is a colour the
 * assertions below would otherwise silently pass on.
 */
function alphaOf(color: string): number {
  const text = color.trim();
  const legacy = /^rgba?\(([^)]+)\)$/.exec(text);
  const modern = /^color\(\s*srgb\s+([^)]+)\)$/.exec(text);
  const body = legacy?.[1] ?? modern?.[1];
  if (body === undefined) {
    throw new Error(`unrecognized colour serialization: ${color}`);
  }
  // Both forms put alpha last, after a comma or a slash; an omitted alpha
  // means opaque.
  const parts = body.split(/[,/\s]+/).filter((part) => part !== "");
  if (parts.length === 3) {
    return 1;
  }
  if (parts.length !== 4) {
    throw new Error(`unexpected channel count in: ${color}`);
  }
  const alpha = Number(parts[3]);
  if (Number.isNaN(alpha)) {
    throw new Error(`unparsable alpha in: ${color}`);
  }
  return alpha;
}

/** True when a computed colour paints nothing. */
const isTransparent = (color: string) => alphaOf(color) === 0;

test("StatusGlyph: the five registers are pairwise distinct with no hue available", async ({
  page,
}) => {
  // The inspection host's palette is fully desaturated, so anything that
  // separates the registers here separates them by shape/line/opacity alone.
  const signatures = await Promise.all(
    GLYPH_TONES.map(async (tone) => {
      const el = glyph(page, HOSTS.inspection, tone);
      await expect(el).toBeVisible();
      const [borderStyle, borderColor, background, ink] = await Promise.all([
        computed(el, "border-top-style"),
        computed(el, "border-top-color"),
        computed(el, "background-color"),
        computed(el, "color"),
      ]);
      return { tone, signature: `${borderStyle}|${borderColor}|${background}|${ink}` };
    }),
  );

  expect(new Set(signatures.map((s) => s.signature)).size).toBe(GLYPH_TONES.length);
});

test("StatusGlyph: line style is what separates the open registers from the closed ones", async ({
  page,
}) => {
  const styles = await Promise.all(
    GLYPH_TONES.map((tone) => computed(glyph(page, HOSTS.inspection, tone), "border-top-style")),
  );
  // success / danger / neutral are closed lines; warning and idle are open.
  expect(styles).toEqual(["solid", "solid", "dashed", "solid", "dashed"]);
});

test("StatusGlyph: only danger is a solid disc; the other four are unfilled or washed", async ({
  page,
}) => {
  const fills = await Promise.all(
    GLYPH_TONES.map((tone) => computed(glyph(page, HOSTS.inspection, tone), "background-color")),
  );
  const [success, danger, warning, neutral, idle] = fills as [
    string,
    string,
    string,
    string,
    string,
  ];

  // danger is fully opaque — the one mark findable by weight while scrolling.
  expect(alphaOf(danger)).toBe(1);
  // success is a wash: visible, but nowhere near solid.
  expect(alphaOf(success)).toBeGreaterThan(0);
  expect(alphaOf(success)).toBeLessThan(0.5);
  // The three open/empty registers paint no fill at all on this host except
  // the faint tone washes the palette gives them.
  for (const fill of [warning, neutral, idle]) {
    expect(alphaOf(fill)).toBeLessThan(0.1);
  }
});

test("StatusGlyph: idle's fill resolves to the --ds-tone-idle-bg token, not a hardcoded transparent", async ({
  page,
}) => {
  const idleGlyph = glyph(page, HOSTS.inspection, "idle");
  const idleFill = await computed(idleGlyph, "background-color");

  // Probe: what does this host itself resolve `var(--ds-tone-idle-bg)` to,
  // read from an unrelated element in the same cascade scope? If the glyph
  // is truly bound to the register (rather than some fixed literal that
  // happens to look faint), the two must match exactly, on every host.
  const probeFill = await page.evaluate((hostSelector) => {
    const host = document.querySelector(hostSelector);
    if (host === null) {
      throw new Error(`host not found: ${hostSelector}`);
    }
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--ds-tone-idle-bg)";
    host.appendChild(probe);
    const value = window.getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  }, HOSTS.inspection);

  expect(idleFill).toBe(probeFill);
  // And the register is still a wash, not a fill that would make idle read
  // as "settled" the way success does.
  expect(alphaOf(idleFill)).toBeGreaterThan(0);
  expect(alphaOf(idleFill)).toBeLessThan(0.1);
});

test("StatusGlyph: every register occupies an identical box, so a column cannot jitter", async ({
  page,
}) => {
  const boxes = await Promise.all(
    GLYPH_TONES.map(async (tone) => {
      const box = await glyph(page, HOSTS.inspection, tone).boundingBox();
      if (box === null) {
        throw new Error(`glyph ${tone} not measurable`);
      }
      return box;
    }),
  );

  const first = boxes[0];
  if (first === undefined) {
    throw new Error("no glyphs measured");
  }
  expect(first.width).toBeCloseTo(22, 0);
  for (const box of boxes) {
    expect(Math.abs(box.width - first.width)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(box.height - first.height)).toBeLessThanOrEqual(0.5);
    // Round: the border radius is a pill, so width and height must agree.
    expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(0.5);
  }
});

test("StatusGlyph: sizes step, and the box stays square at each step", async ({ page }) => {
  const row = page.locator(`${HOSTS.inspection} [data-testid="glyph-sizes"] [data-tone="success"]`);
  const widths = await Promise.all(
    [0, 1, 2].map(async (i) => {
      const box = await row.nth(i).boundingBox();
      if (box === null) {
        throw new Error(`size ${i} not measurable`);
      }
      expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(0.5);
      return box.width;
    }),
  );
  expect(widths[0]).toBeLessThan(widths[1] ?? 0);
  expect(widths[1]).toBeLessThan(widths[2] ?? 0);
});

test("StatusGlyph: the same register renders at the same size on all three hosts", async ({
  page,
}) => {
  // A host theme shifts colour and radius, not the glyph's geometry — the
  // sizes are component-intrinsic and deliberately not bound to --ds-control-*.
  const widths = await Promise.all(
    Object.values(HOSTS).map(async (host) => {
      const box = await glyph(page, host, "success").boundingBox();
      if (box === null) {
        throw new Error(`glyph not measurable in ${host}`);
      }
      return box.width;
    }),
  );
  for (const width of widths) {
    expect(Math.abs(width - (widths[0] ?? 0))).toBeLessThanOrEqual(0.5);
  }
});

test("RankChip: high is filled, medium outlined, low dashed — an ordering by weight", async ({
  page,
}) => {
  const chip = (rank: string) =>
    page.locator(`${HOSTS.inspection} [data-testid="rank-${rank}"] [data-rank="${rank}"]`);

  const [highFill, mediumFill, lowFill] = await Promise.all([
    computed(chip("high"), "background-color"),
    computed(chip("medium"), "background-color"),
    computed(chip("low"), "background-color"),
  ]);
  expect(alphaOf(highFill)).toBe(1);
  expect(isTransparent(mediumFill)).toBe(true);
  expect(isTransparent(lowFill)).toBe(true);

  const [mediumStyle, lowStyle] = await Promise.all([
    computed(chip("medium"), "border-top-style"),
    computed(chip("low"), "border-top-style"),
  ]);
  expect(mediumStyle).toBe("solid");
  expect(lowStyle).toBe("dashed");

  // medium and low are separated by ink as well as by line: either alone is
  // hard to read at 20px, which is why the CSS moves both.
  const [mediumInk, lowInk] = await Promise.all([
    computed(chip("medium"), "color"),
    computed(chip("low"), "color"),
  ]);
  expect(mediumInk).not.toBe(lowInk);
});

test("RankChip: --ds-radius-chip keeps a chip square-cornered where controls are round", async ({
  page,
}) => {
  // This is the whole reason the token level was added in v0.15: this host
  // rounds controls at 12px, which on a 24px tile would be a pill.
  const chipRadius = await computed(
    page.locator(`${HOSTS.inspection} [data-testid="rank-high"] [data-rank="high"]`),
    "border-top-left-radius",
  );
  const controlRadius = await computed(
    page.locator(`${HOSTS.inspection} input[aria-label="search"]`),
    "border-top-left-radius",
  );
  expect(chipRadius).toBe("6px");
  expect(controlRadius).toBe("12px");
});

test("RankChip: all three ranks occupy an identical square box", async ({ page }) => {
  const boxes = await Promise.all(
    ["high", "medium", "low"].map(async (rank) => {
      const box = await page
        .locator(`${HOSTS.inspection} [data-testid="rank-${rank}"] [data-rank="${rank}"]`)
        .boundingBox();
      if (box === null) {
        throw new Error(`chip ${rank} not measurable`);
      }
      return box;
    }),
  );
  for (const box of boxes) {
    expect(box.width).toBeCloseTo(24, 0);
    expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(0.5);
  }
});

test("SegmentedMeter: the division drawn is the division given", async ({ page }) => {
  const meter = page.locator(`${HOSTS.inspection} [data-testid="meter-sheet"] [role="img"]`);
  await expect(meter).toBeVisible();

  const track = await meter.boundingBox();
  if (track === null) {
    throw new Error("meter not measurable");
  }

  // 30 / 8 / 4 / 2 out of 44.
  const expected: ReadonlyArray<readonly [string, number]> = [
    ["ok", 30 / 44],
    ["ng", 8 / 44],
    ["pending", 4 / 44],
    ["na", 2 / 44],
  ];

  for (const [id, share] of expected) {
    const box = await meter.locator(`[data-segment="${id}"]`).boundingBox();
    if (box === null) {
      throw new Error(`segment ${id} not measurable`);
    }
    // Within a pixel: the segment must not be redistributed by flex.
    expect(Math.abs(box.width - track.width * share)).toBeLessThanOrEqual(1);
  }
});

test("SegmentedMeter: the four weights are ordered tiers of one ink", async ({ page }) => {
  const meter = page.locator(`${HOSTS.inspection} [data-testid="meter-sheet"] [role="img"]`);
  const alphas = await Promise.all(
    ["full", "strong", "medium", "faint"].map(async (weight) =>
      alphaOf(await computed(meter.locator(`[data-weight="${weight}"]`), "background-color")),
    ),
  );

  // Strictly decreasing: the ordering IS the meaning, so a tie would make two
  // categories indistinguishable.
  for (const i of [0, 1, 2]) {
    expect(alphas[i]).toBeGreaterThan(alphas[i + 1] ?? 0);
  }
  // And the heaviest is not itself transparent.
  expect(alphas[0]).toBeGreaterThan(0.5);
});

test("SegmentedMeter: a larger total leaves the remainder as visible track", async ({ page }) => {
  const meter = page.locator(`${HOSTS.inspection} [data-testid="meter-remainder"] [role="img"]`);
  const track = await meter.boundingBox();
  if (track === null) {
    throw new Error("meter not measurable");
  }

  const filled = await meter.evaluate((el) =>
    Array.from(el.querySelectorAll<HTMLElement>("[data-segment]")).reduce(
      (sum, segment) => sum + segment.getBoundingClientRect().width,
      0,
    ),
  );

  // 44 of 60 accounted for; the other 16/60 must remain unpainted.
  expect(Math.abs(filled - track.width * (44 / 60))).toBeLessThanOrEqual(1);
  expect(filled).toBeLessThan(track.width - 1);
});

test("SegmentedMeter: an empty whole is bare track, not a collapsed box", async ({ page }) => {
  const meter = page.locator(`${HOSTS.inspection} [data-testid="meter-empty"] [role="img"]`);
  await expect(meter.locator("[data-segment]")).toHaveCount(0);

  const box = await meter.boundingBox();
  if (box === null) {
    throw new Error("empty meter not measurable");
  }
  expect(box.height).toBeGreaterThan(0);
  expect(box.width).toBeGreaterThan(100);

  const trackFill = await computed(meter, "background-color");
  expect(isTransparent(trackFill)).toBe(false);
});

test("SegmentedMeter: shrinks inside a narrow row instead of widening it", async ({ page }) => {
  const row = page.locator(`${HOSTS.inspection} [data-testid="sheet-row"]`);
  const rowBox = await row.boundingBox();
  const meterBox = await row.locator('[role="img"][aria-label="row progress"]').boundingBox();
  if (rowBox === null || meterBox === null) {
    throw new Error("sheet row not measurable");
  }

  // The row declares max-width: 260 — a meter that did not shrink would push
  // past it (AGENTS.md rule 5: min-width: 0 on flex children).
  expect(rowBox.width).toBeLessThanOrEqual(261);
  expect(meterBox.width).toBeGreaterThan(0);
  expect(meterBox.x + meterBox.width).toBeLessThanOrEqual(rowBox.x + rowBox.width + 1);
});

test("the third host renders the shared primitives on its own palette, not the library defaults", async ({
  page,
}) => {
  // The library's fallbacks are LIGHT. If the alias had not been mirrored into
  // the harness, a card here would be white — visibly wrong rather than
  // quietly plausible, which is the point of not shipping a dark fallback.
  const host = page.locator(HOSTS.inspection);
  const ground = await computed(host, "background-color");
  expect(ground).toBe("rgb(10, 11, 12)");

  const badge = host.locator('[data-testid="badge-plain"] > span');
  const badgeInk = await computed(badge, "color");
  // The desaturated palette's neutral: red, green and blue within a few
  // points of each other. A saturated value here means the host block lost
  // its mapping and the library default (a blue-grey) took over.
  const channels = (/^rgba?\(([^)]+)\)$/.exec(badgeInk)?.[1] ?? "")
    .split(/[,/\s]+/)
    .filter((p) => p !== "")
    .slice(0, 3)
    .map(Number);
  expect(channels).toHaveLength(3);
  const spread = Math.max(...channels) - Math.min(...channels);
  expect(spread).toBeLessThanOrEqual(16);
});
