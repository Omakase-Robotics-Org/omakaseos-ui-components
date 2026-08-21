/**
 * @file Boundary contract — the demo's scoped copy of a host block must not
 *       drift from its alias file.
 *
 * `demo/hosts.css` says of `.host--robot-inspection-web` (its own header
 * comment): "the SAME --ds-* mappings aliases/robot-inspection-web.css
 * declares. The alias is the SoT; this block is its scoped copy." That
 * sameness was true by construction at v0.15.0 (confirmed byte-identical by
 * the independent audit recorded in
 * `omksos_web/reports/ui-components-inspect-theme/README.md`) but nothing
 * mechanical held it there — a future edit to one file with the other left
 * alone would silently make the demo show something the alias does not
 * promise, or vice versa. This spec is that guard.
 *
 * ## Scope: robot-inspection-web only
 *
 * The other two demo blocks (`.host--omks-web`, `.host--status-webui`) are
 * NOT scoped copies of their aliases — they are deliberately simplified
 * pseudo-brand palettes for the demo harness (they do not reproduce every
 * `--ri-*`-equivalent raw variable the real host apps own, and predate the
 * "alias is SoT, demo is a scoped copy" convention this host was authored
 * under). Asserting parity for them would be asserting something the repo
 * never claimed. Only `robot-inspection-web.css` / `.host--robot-inspection-web`
 * carry the "same mappings" claim in their own header comments, so only that
 * pair is checked here.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");

type Declaration = { prop: string; value: string };

/** Every `--ds-*: value;` declaration in a CSS source, comments stripped. */
function dsDeclarations(css: string): Declaration[] {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: Declaration[] = [];
  const decl = /(--ds-[a-z0-9-]+)\s*:\s*([^;]+);/g;
  for (let m = decl.exec(stripped); m !== null; m = decl.exec(stripped)) {
    const [, prop, value] = m;
    if (prop !== undefined && value !== undefined) {
      out.push({ prop, value: value.trim() });
    }
  }
  return out;
}

/** `{ prop: value }` pairs as a sorted, comparable, human-readable list. */
function asSortedPairs(decls: Declaration[]): string[] {
  return decls.map((d) => `${d.prop}: ${d.value}`).sort();
}

/**
 * Extract one `.selector { ... }` block's body. The stylesheets under test
 * never nest braces inside a host block (flat custom-property declarations
 * only), so matching up to the first unindented `}` that closes the
 * selector is exact — this is not a general CSS parser.
 */
function selectorBlock(css: string, selector: string): string {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`);
  const match = re.exec(stripped);
  if (match?.[1] === undefined) {
    throw new Error(`selector block not found: ${selector}`);
  }
  return match[1];
}

describe("alias <-> demo parity — robot-inspection-web", () => {
  const aliasCss = readFileSync(resolve(repoRoot, "aliases/robot-inspection-web.css"), "utf8");
  const demoCss = readFileSync(resolve(repoRoot, "demo/hosts.css"), "utf8");
  const demoBlock = selectorBlock(demoCss, ".host--robot-inspection-web");

  const aliasDecls = dsDeclarations(aliasCss);
  // The demo block also declares the raw `--ri-*` palette (its own SoT copy
  // of what the consuming app would define) plus a few non-custom-property
  // rules (`background`, `color`, `font-family`) that render the block
  // itself, not part of the --ds-* mapping contract. Only the --ds-*
  // declarations are the claim this spec checks.
  const demoDsDecls = dsDeclarations(demoBlock);

  it("parser sanity — both sides found a non-trivial --ds-* surface", () => {
    expect(aliasDecls.length).toBeGreaterThan(20);
    expect(demoDsDecls.length).toBeGreaterThan(20);
  });

  it("the demo's --ds-* declarations are byte-identical (per-value) to the alias's", () => {
    expect(asSortedPairs(demoDsDecls)).toEqual(asSortedPairs(aliasDecls));
  });

  it("neither side declares a --ds-* property the other omits", () => {
    const aliasProps = new Set(aliasDecls.map((d) => d.prop));
    const demoProps = new Set(demoDsDecls.map((d) => d.prop));
    const onlyInAlias = [...aliasProps].filter((p) => !demoProps.has(p)).sort();
    const onlyInDemo = [...demoProps].filter((p) => !aliasProps.has(p)).sort();
    expect(onlyInAlias).toEqual([]);
    expect(onlyInDemo).toEqual([]);
  });
});
