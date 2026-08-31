/**
 * @file The affordance-geometry contract, accounted over the WHOLE glyph set.
 *
 * The rule this file mechanizes, stated once (and again in src/tokens.css):
 *
 *   1. A glyph's DRAWN geometry belongs to the design system. Every length
 *      resolves to a `--ds-edit-*` token through a CSS geometry property; no
 *      component computes a size, and no call site passes one.
 *   2. Interaction STATE is carried by fill and stroke pattern, never by size.
 *      A selected anchor is a filled anchor of the same size (Illustrator's
 *      rule). Before v0.20 it was 1.7x, and a hovered one 1.15x.
 *   3. PICK tolerance is a different quantity, owned by
 *      `src/direct-manipulation/constants.ts` (`*_PICK_RADIUS_PX`), and it is
 *      the only place pointer modality may matter (`COARSE_PICK_SCALE`).
 *
 * The accounting is derived from the DIRECTORY and from each component's own
 * source, never from a list written here: the fixture table below must match
 * `src/Edit*.tsx` in BOTH directions, so a new glyph fails this file on the day
 * it is written rather than quietly sitting outside the rule. Every parser
 * throws on unparsable input instead of reporting green.
 */
import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { EditGhostHandle } from "./EditGhostHandle";
import { EditHandle } from "./EditHandle";
import { EditHeadingKnob } from "./EditHeadingKnob";
import { EditMarquee } from "./EditMarquee";
import { EditRemoveBadge } from "./EditRemoveBadge";
import { EditRubberBand } from "./EditRubberBand";
import { EditSnapGuide } from "./EditSnapGuide";

const srcDir = resolve(__dirname);
const tokensPath = resolve(srcDir, "tokens.css");

/** Geometry attributes/properties: the things a state may never touch. */
const GEOMETRY_NAMES = ["r", "cx", "cy", "x", "y", "width", "height", "rx", "ry", "d"];

/**
 * What a STATE selector in a glyph's CSS module is allowed to declare.
 *
 * Paint and pattern only. `stroke-width` is deliberately NOT here: the
 * complaint that started this revision was that the affordances grow, and a
 * state that fattens an outline grows the mark too. A property missing from
 * this list fails rather than being ignored.
 */
const PAINT_PROPERTIES = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-linecap",
  "opacity",
  "transition",
];

/** Declarations whose VALUE must resolve to a --ds-edit-* token. */
const TOKEN_BACKED_PROPERTIES = [
  "r",
  "x",
  "y",
  "width",
  "height",
  "rx",
  "ry",
  "stroke-width",
  "stroke-dasharray",
];

/**
 * How a glyph gets its drawn geometry.
 *
 *  - `body` — it draws a mark of its own at a position, so it has a
 *    `[data-edit-glyph]` element sized entirely by tokens.
 *  - `spanning` — it has no mark: it spans two host positions (a marquee's
 *    corners, a pending leg's ends), so its geometry IS host coordinates and
 *    its only drawn quantities are weight and dash.
 */
type GlyphShape = "body" | "spanning";

type GlyphFixture = {
  readonly shape: GlyphShape;
  readonly render: (unionValue: string) => ReactElement;
};

const AT = { x: 40, y: 50 };

/**
 * One fixture per glyph. Pinned against the directory listing in both
 * directions below, which is what makes "the complete set" mechanical.
 */
const GLYPHS: Record<string, GlyphFixture> = {
  EditGhostHandle: {
    shape: "body",
    render: (state) => (
      <EditGhostHandle x={AT.x} y={AT.y} state={state as "idle" | "hover" | "target"} />
    ),
  },
  EditHandle: {
    shape: "body",
    render: (state) => (
      <EditHandle
        x={AT.x}
        y={AT.y}
        kind="place"
        heading={0}
        state={state as "idle" | "hover" | "selected" | "primary" | "dragging"}
      />
    ),
  },
  EditHeadingKnob: {
    shape: "body",
    render: (state) => (
      <EditHeadingKnob
        x={AT.x}
        y={AT.y}
        angle={0}
        armPx={26}
        state={state as "idle" | "hover" | "dragging"}
      />
    ),
  },
  EditMarquee: {
    shape: "spanning",
    render: () => <EditMarquee from={{ x: 10, y: 20 }} to={{ x: 60, y: 80 }} />,
  },
  EditRemoveBadge: {
    shape: "body",
    render: (state) => (
      <EditRemoveBadge x={AT.x} y={AT.y} state={state as "idle" | "hover"} />
    ),
  },
  EditRubberBand: {
    shape: "spanning",
    render: (state) => (
      <EditRubberBand
        from={{ x: 10, y: 20 }}
        to={{ x: 60, y: 80 }}
        state={state as "free" | "constrained"}
      />
    ),
  },
  EditSnapGuide: {
    shape: "body",
    render: () => <EditSnapGuide at={AT} kind="vertex" />,
  },
};

/** The glyph components, from the directory — the same predicate the boundary spec uses. */
function glyphFiles(): readonly string[] {
  const files = readdirSync(srcDir)
    .filter((file) => /^Edit[^.]+\.tsx$/.test(file))
    .sort();
  if (files.length === 0) {
    throw new Error(
      "EditAffordanceGeometry.spec.tsx: found no src/Edit*.tsx glyph components. Either they " +
        "moved or this parser is broken — do not let it report green over nothing.",
    );
  }
  return files;
}

function glyphNames(): readonly string[] {
  return glyphFiles().map((file) => file.replace(/\.tsx$/, ""));
}

function read(relativePath: string): string {
  return readFileSync(resolve(srcDir, relativePath), "utf8");
}

/** The `state: "a" | "b";` union of one glyph's props, or [] if it declares none. */
function stateValuesOf(component: string): readonly string[] {
  const source = read(`${component}.tsx`);
  const propsBlock = source.match(
    new RegExp(`export type ${component}Props = \\{([\\s\\S]*?)\\n\\};`),
  )?.[1];
  if (propsBlock === undefined) {
    throw new Error(
      `EditAffordanceGeometry.spec.tsx: no \`export type ${component}Props = { ... };\` in ` +
        `src/${component}.tsx. This parser needs updating — do not let it silently pass.`,
    );
  }
  const union = propsBlock.match(/^\s*state\??:\s*((?:"[^"]+"\s*\|\s*)+"[^"]+")\s*;/m)?.[1];
  if (union === undefined) {
    return [];
  }
  return [...union.matchAll(/"([^"]+)"/g)].map((match) => match[1]!);
}

type CssRule = { readonly selectors: readonly string[]; readonly declarations: readonly [string, string][] };

/** Every rule of one CSS module, comments stripped. Throws if none parse. */
function cssRules(component: string): readonly CssRule[] {
  const source = read(`${component}.module.css`).replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selectors: match[1]!.split(",").map((selector) => selector.trim()),
    declarations: match[2]!
      .split(";")
      .map((declaration) => declaration.trim())
      .filter((declaration) => declaration.length > 0)
      .map((declaration) => {
        const at = declaration.indexOf(":");
        if (at < 0) {
          throw new Error(
            `EditAffordanceGeometry.spec.tsx: unparsable declaration "${declaration}" in ` +
              `${component}.module.css.`,
          );
        }
        return [declaration.slice(0, at).trim(), declaration.slice(at + 1).trim()] as [string, string];
      }),
  }));
  if (rules.length === 0) {
    throw new Error(
      `EditAffordanceGeometry.spec.tsx: parsed zero rules out of ${component}.module.css.`,
    );
  }
  return rules;
}

/**
 * What a state may NOT change: the glyph's drawn geometry.
 *
 * For a `body` glyph that is the body element itself (with the state register
 * stripped) plus the placement group's transform. A state may add or drop an
 * ANNOTATION (the primary's ring, a place's facing tick) — that is what an
 * annotation is — but it may never restate the body. For a `spanning` glyph
 * there is no body, so it is the whole fragment minus the register.
 */
function drawnGeometryOf(container: HTMLElement, shape: GlyphShape): string {
  const strip = (markup: string) =>
    markup.replace(/\sclass="[^"]*"/g, "").replace(/\sdata-state="[^"]*"/g, "");
  if (shape === "spanning") {
    return strip(container.querySelector("svg")?.innerHTML ?? "");
  }
  return [...container.querySelectorAll("[data-edit-glyph]")]
    .map(
      (body) =>
        `${strip(body.outerHTML)}@${body.closest("g[transform]")?.getAttribute("transform") ?? ""}`,
    )
    .join(" ");
}

describe("affordance geometry — the glyph set is complete and every member is under the rule", () => {
  it("has a fixture for exactly the glyphs in src/ (both directions)", () => {
    expect(Object.keys(GLYPHS).sort()).toEqual([...glyphNames()]);
  });

  it("found the seven glyphs the vocabulary is built from (parser sanity)", () => {
    expect(glyphNames().length).toBeGreaterThanOrEqual(7);
  });
});

describe("affordance geometry — no glyph carries a drawn size", () => {
  it.each(glyphNames())("%s draws its body from tokens alone", (component) => {
    const fixture = GLYPHS[component]!;
    const states = stateValuesOf(component);
    const { container } = render(<svg>{fixture.render(states[0] ?? "")}</svg>);
    const bodies = [...container.querySelectorAll("[data-edit-glyph]")];

    if (fixture.shape === "spanning") {
      // Nothing to size: this glyph's geometry is the two host positions it
      // spans, so it must not claim a body hook at all.
      expect(bodies).toEqual([]);
      return;
    }

    expect(bodies.length).toBeGreaterThan(0);
    // Annotations (the primary's ring, a place's facing tick) are not bodies,
    // but they are drawn marks all the same and are held to the same rule.
    for (const annotation of container.querySelectorAll("[data-edit-annotation]")) {
      const carried = GEOMETRY_NAMES.filter((name) => annotation.hasAttribute(name));
      expect(carried, `${component}: annotation ${annotation.tagName} carries drawn geometry`).toEqual(
        [],
      );
    }
    for (const body of bodies) {
      const carried = GEOMETRY_NAMES.filter((name) => body.hasAttribute(name));
      expect(carried, `${component}: ${body.tagName} carries drawn geometry as an attribute`).toEqual(
        [],
      );
      // ...and it is placed by the shared placement rule, so the size it is
      // drawn at is screen pixels on any host surface.
      const placement = body.closest("g[transform]")?.getAttribute("transform") ?? "";
      expect(placement, `${component}: body is not inside a placement group`).toMatch(
        /^translate\(-?[\d.]+ -?[\d.]+\) scale\([\d.]+\)$/,
      );
    }
  });
});

describe("affordance geometry — state is fill and stroke, never size", () => {
  it.each(glyphNames())("%s renders every state at the identical geometry", (component) => {
    const states = stateValuesOf(component);
    if (states.length === 0) {
      // No interaction state to vary. Verified rather than assumed: the props
      // type genuinely declares no `state` union.
      expect(read(`${component}.tsx`)).not.toMatch(/^\s*state\??:\s*"/m);
      return;
    }
    const fixture = GLYPHS[component]!;
    const drawn = states.map((state) => {
      const { container } = render(<svg>{fixture.render(state)}</svg>);
      const group = container.querySelector("svg > g");
      return { state, markup: drawnGeometryOf(container, fixture.shape), register: group?.getAttribute("class") ?? "" };
    });
    const first = drawn[0]!;
    for (const entry of drawn) {
      expect(entry.markup, `${component}: "${entry.state}" is not drawn like "${first.state}"`).toBe(
        first.markup,
      );
    }
    // ...and each state really does select a different register, so identical
    // geometry is not the same thing as an identical glyph.
    expect(new Set(drawn.map((entry) => entry.register)).size).toBe(states.length);
  });

  it.each(glyphNames())("%s's state selectors declare paint only", (component) => {
    const states = stateValuesOf(component);
    const offences: string[] = [];
    for (const rule of cssRules(component)) {
      const statesTouched = rule.selectors.filter((selector) =>
        states.some((state) => new RegExp(`(^|\\s)\\.${state}(\\s|$)`).test(selector)),
      );
      if (statesTouched.length === 0) {
        continue;
      }
      for (const [property, value] of rule.declarations) {
        if (!PAINT_PROPERTIES.includes(property)) {
          offences.push(`${rule.selectors.join(", ")} { ${property}: ${value} }`);
        }
      }
    }
    expect(offences, {
      message:
        `${component}.module.css declares non-paint properties inside a STATE selector: ` +
        `${offences.join(" | ")}. A state may change fill, stroke and dash — never geometry ` +
        "or weight. That is the whole point of this revision.",
    } as never).toEqual([]);
  });

  it.each(glyphNames())("%s never transitions a geometry property", (component) => {
    // A transition on `r` or `width` is a size change with an easing curve.
    const offences = cssRules(component).flatMap((rule) =>
      rule.declarations
        .filter(
          ([property, value]) =>
            property === "transition" &&
            GEOMETRY_NAMES.some((name) => new RegExp(`(^|[\\s,])${name}([\\s,]|$)`).test(value)),
        )
        .map(([, value]) => value),
    );
    expect(offences).toEqual([]);
  });
});

describe("affordance geometry — every drawn length is a declared --ds-edit-* token", () => {
  it.each(glyphNames())("%s writes no bare length", (component) => {
    const offences = cssRules(component).flatMap((rule) =>
      rule.declarations
        .filter(
          ([property, value]) =>
            TOKEN_BACKED_PROPERTIES.includes(property) &&
            value !== "none" &&
            !value.includes("var(--ds-edit-"),
        )
        .map(([property, value]) => `${rule.selectors.join(", ")} { ${property}: ${value} }`),
    );
    expect(offences, {
      message:
        `${component}.module.css states a drawn length as a literal: ${offences.join(" | ")}. ` +
        "Every one of them belongs in src/tokens.css as a --ds-edit-* token, related to " +
        "--ds-edit-anchor-edge, so there is one number to move.",
    } as never).toEqual([]);
  });

  it("declares in tokens.css exactly the --ds-edit-* tokens the glyphs use (both directions)", () => {
    const tokens = readFileSync(tokensPath, "utf8");
    const declared = new Set(
      [...tokens.matchAll(/^\s*(--ds-edit-[a-z0-9-]+)\s*:/gm)].map((match) => match[1]!),
    );
    expect(declared.size).toBeGreaterThan(8);
    const used = new Set<string>();
    for (const component of glyphNames()) {
      for (const match of read(`${component}.module.css`).matchAll(/var\((--ds-edit-[a-z0-9-]+)\)/g)) {
        used.add(match[1]!);
      }
    }
    // Every token a module reads is declared...
    expect([...used].filter((token) => !declared.has(token)).sort()).toEqual([]);
    // ...and every token declared is read, by a module or by another token
    // (the relations that keep the vocabulary in proportion).
    const referencedByTokens = new Set(
      [...tokens.matchAll(/var\((--ds-edit-[a-z0-9-]+)\)/g)].map((match) => match[1]!),
    );
    const unused = [...declared]
      .filter((token) => !used.has(token) && !referencedByTokens.has(token))
      .sort();
    expect(unused, {
      message:
        `These --ds-edit-* tokens are declared but nothing reads them: ${unused.join(", ")}. ` +
        "Remove them, or state where they apply.",
    } as never).toEqual([]);
  });
});
