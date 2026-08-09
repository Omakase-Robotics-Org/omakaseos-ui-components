/**
 * @file Boundary contract — alias files are MAPPING layers, not palettes.
 *
 * Each `aliases/*.css` file bridges one host's brand variables onto the
 * `--ds-*` vocabulary. The header of `omks-robo-web.css` states the rule
 * this spec mechanizes: a colour decision placed in an alias file instead
 * of the host's own palette SoT turns the alias into a SECOND palette —
 * two sources of truth for what a surface looks like, drifting apart
 * silently. On the robot side `robot-token-parity.sh` (orchestrator repo)
 * already ranks resolutions "by mapping > by value"; on the web side the
 * discipline existed only as prose until a review caught an edit that
 * would have licensed alias-side colour fixes (omksos_web
 * `reports/monitor-visual-hierarchy/`, 2026-08-09).
 *
 * The contract:
 *
 *   - Every `--ds-*` declaration in an alias must resolve through
 *     `var(...)` — pointing at a variable the HOST palette owns. A
 *     fallback inside `var(--x, <literal>)` is fine (it guards against a
 *     host that never defines the variable, and the mapping stays the
 *     primary resolution).
 *   - Bare literal values are frozen to the exception lists below —
 *     translucent tone washes and geometry the host palettes do not own
 *     as variables. Adding a NEW literal fails this spec: put the value
 *     in the host palette (web: `packages/web/src/brand/tokens.ts`;
 *     robot: rssa `src/styles/variables.css`) and map to it, or add a
 *     library default in `src/tokens.css`.
 *   - Symmetrically, promoting a frozen literal to a mapping must SHRINK
 *     the list here — a stale exception entry fails too, so the list
 *     always states exactly what a reviewer must audit (the same
 *     both-directions pinning as `async-combobox-boundary.spec.ts`).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const aliasesDir = resolve(__dirname, "..", "aliases");

/** Bare-literal declarations frozen as of 2026-08-09 (v0.11.0). */
const FROZEN_LITERALS: Record<string, string[]> = {
  "omks-robo-web.css": [
    // Geometry / font stacks the web brand SoT does not own (documented
    // in the file header note).
    "--ds-font-mono",
    "--ds-radius-pill",
  ],
  "status-server-webui.css": [
    // Translucent tone washes derived from palette colours; the robot
    // palette (rssa variables.css) exposes only the opaque bases. These
    // predate the guard and are checked value-wise by the orchestrator's
    // robot-token-parity gate.
    "--ds-accent-soft",
    "--ds-bubble-bg-system",
    "--ds-bubble-bg-tool",
    "--ds-bubble-bg-user",
    "--ds-caption-bg",
    "--ds-radius-pill",
    "--ds-stage-tile-name-bg",
    "--ds-tone-danger-bg",
    "--ds-tone-info-bg",
    "--ds-tone-neutral-bg",
    "--ds-tone-success-bg",
    "--ds-tone-warning-bg",
  ],
};

type Declaration = { prop: string; value: string };

function dsDeclarations(css: string): Declaration[] {
  // Strip comments first so commented-out declarations don't count.
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

/**
 * A declaration is a MAPPING when its value references at least one host
 * variable — `var(--x)` directly, or derived through `color-mix(...
 * var(--x) ...)`. Derivations keep the hue anchored to the palette SoT
 * (the ratio is an alias-level styling detail); a value with NO var()
 * reference is a free-standing colour/geometry decision, which is what
 * this contract forbids outside the frozen list.
 */
const isMapping = (value: string) => value.includes("var(--");

describe("alias purity — aliases map, palettes decide", () => {
  it("covers every alias file shipped by the package", () => {
    const shipped = readdirSync(aliasesDir).filter((f) => f.endsWith(".css")).sort();
    expect(shipped).toEqual(Object.keys(FROZEN_LITERALS).sort());
  });

  for (const [file, frozen] of Object.entries(FROZEN_LITERALS)) {
    describe(file, () => {
      const css = readFileSync(resolve(aliasesDir, file), "utf8");
      const decls = dsDeclarations(css);

      it("declares a non-trivial --ds-* surface (parser sanity)", () => {
        expect(decls.length).toBeGreaterThan(20);
      });

      it("resolves every non-frozen declaration through var(...)", () => {
        const literals = decls
          .filter((d) => !isMapping(d.value))
          .map((d) => d.prop)
          .sort();
        expect(literals).toEqual([...frozen].sort());
      });
    });
  }
});
