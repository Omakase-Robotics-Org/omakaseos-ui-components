/**
 * @file Shared helpers for `aui-visual.e2e.spec.ts` — the Phase 1
 * visual-regression baseline for the aui -> CSS Modules migration
 * (see `omksos_web/reports/aui-css-modules-visual-baseline/README.md`).
 *
 * Two capture kinds per scene:
 *   - Screenshots (`toHaveScreenshot`, driven directly in the spec).
 *   - Computed-style dumps (this file): walk every element under a scene
 *     root in DOM order, record its tag, a STRUCTURAL path (tag + sibling
 *     index — stable across a CSS Modules rewrite), the element's STABLE
 *     literal `aui-*` classes (filtered out of whatever else is on the
 *     className — Tailwind's generated utility soup is expected to
 *     disappear in Phase 2; the `aui-*` hooks are the contract that must
 *     survive), and a broad-but-curated set of computed style properties.
 *
 * Baselines live in `spec/aui-baselines/<name>.json`, committed. Missing
 * baseline -> written and the assertion passes (first run). Regenerate
 * intentionally with:
 *
 *   AUI_VISUAL_UPDATE=1 LIB_E2E_PORT=5312 bun run test:e2e -- aui-visual
 *
 * (or delete the specific file(s) under spec/aui-baselines/ and re-run
 * normally — same effect, only for the missing ones).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Locator } from "playwright/test";
import { expect } from "playwright/test";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Broad-but-curated computed-style property set (camelCase — indexable
 * directly on `CSSStyleDeclaration`). Grouped by the categories called out
 * in the visual-baseline report: layout, typography, visuals.
 */
export const STYLE_PROPERTIES: readonly string[] = [
  // layout
  "display",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "boxSizing",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "flexDirection",
  "flexWrap",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "alignItems",
  "alignSelf",
  "justifyContent",
  "justifyItems",
  "alignContent",
  "gridTemplateColumns",
  "gridTemplateRows",
  "gridColumn",
  "gridRow",
  "gap",
  "rowGap",
  "columnGap",
  "overflow",
  "overflowX",
  "overflowY",
  // typography
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "color",
  "textAlign",
  "textDecorationLine",
  "textOverflow",
  "textTransform",
  "whiteSpace",
  "wordBreak",
  "overflowWrap",
  // visuals
  "backgroundColor",
  "backgroundImage",
  "backgroundPosition",
  "backgroundSize",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderTopStyle",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "boxShadow",
  "outlineWidth",
  "outlineColor",
  "outlineStyle",
  "outlineOffset",
  "opacity",
  "transform",
  "transitionProperty",
  "animationName",
  "cursor",
  "zIndex",
  "visibility",
];

export type ElementStyleSnapshot = {
  tag: string;
  path: string;
  auiClasses: string[];
  style: Record<string, string>;
};

/**
 * Walk every element under `root` (inclusive) in DOM order and capture its
 * tag, structural path, stable `aui-*` classes, and computed styles.
 */
export async function captureComputedStyles(
  root: Locator,
): Promise<ElementStyleSnapshot[]> {
  return root.evaluate((rootEl, properties) => {
    const out: {
      tag: string;
      path: string;
      auiClasses: string[];
      style: Record<string, string>;
    }[] = [];

    const pathFor = (el: Element): string => {
      const parts: string[] = [];
      let node: Element | null = el;
      while (node) {
        const parent: Element | null = node.parentElement;
        const idx = parent ? Array.from(parent.children).indexOf(node) : 0;
        parts.unshift(`${node.tagName}:${String(idx)}`);
        if (node === rootEl) break;
        node = parent;
      }
      return parts.join(">");
    };

    const walk = (el: Element) => {
      const cs = globalThis.getComputedStyle(el);
      const style: Record<string, string> = {};
      for (const prop of properties) {
        style[prop] = (cs as unknown as Record<string, string>)[prop] ?? "";
      }
      const auiClasses = Array.from(el.classList)
        .filter((c) => c.startsWith("aui-"))
        .sort();
      out.push({ tag: el.tagName, path: pathFor(el), auiClasses, style });
      for (const child of Array.from(el.children)) walk(child);
    };

    walk(rootEl);
    return out;
  }, STYLE_PROPERTIES);
}

/** Deterministic JSON serialization: object keys sorted at every level. */
export function sortedJson(value: unknown): string {
  const sortKeys = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === "object") {
      const rec = v as Record<string, unknown>;
      return Object.fromEntries(
        Object.keys(rec)
          .sort()
          .map((k) => [k, sortKeys(rec[k])]),
      );
    }
    return v;
  };
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}

const BASELINE_DIR = resolve(here, "aui-baselines");
const FORCE_UPDATE = process.env["AUI_VISUAL_UPDATE"] === "1";

/**
 * Compare `actual` against the committed baseline `spec/aui-baselines/
 * <name>.json`. Writes the baseline (and passes) when it does not exist yet,
 * or when `AUI_VISUAL_UPDATE=1` is set. Otherwise asserts byte-equality
 * against the committed file.
 */
export function expectMatchesStyleBaseline(name: string, actual: unknown): void {
  const path = resolve(BASELINE_DIR, `${name}.json`);
  const actualJson = sortedJson(actual);

  if (FORCE_UPDATE || !existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, actualJson);
    return;
  }

  const expected = readFileSync(path, "utf-8");
  expect(actualJson, {
    message: `Computed-style baseline drift for "${name}" (spec/aui-baselines/${name}.json). Regenerate intentionally with AUI_VISUAL_UPDATE=1 if this is an accepted change.`,
  } as never).toBe(expected);
}

/** Move the mouse to a neutral, empty page coordinate — used between
 * sequential `.hover()` calls so radix's grace-area / pointerleave timing
 * doesn't bleed one hover's state into the next (same caution as the
 * service repo's ui-check harness). */
export async function moveMouseToNeutralSpot(page: {
  mouse: { move(x: number, y: number): Promise<void> };
}): Promise<void> {
  await page.mouse.move(1250, 10);
}
