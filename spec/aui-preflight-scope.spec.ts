/**
 * @file aui preflight must NOT escape the surface.
 *
 * The library ships `dist/aui/aui.css` for consumers (`source/packages/web`,
 * status_server_webui, the assistant-ui-replacement-poc). The scoped
 * preflight in `src/aui/aui.css` (`:where(.aui-root ...)` selectors,
 * copied from Tailwind v4's `preflight.css` back when this package used
 * Tailwind — see `omksos_web/reports/aui-css-modules/README.md` for the
 * v0.9 migration off Tailwind onto plain CSS Modules) resets box-sizing,
 * margins, padding, heading typography, etc. for elements INSIDE the aui
 * surface only. A naive global reset (`*, ::before, ::after, ::backdrop
 * { margin: 0; padding: 0; border: 0 solid; box-sizing: border-box }`,
 * plus `h1-h6 { font-size: inherit; font-weight: inherit }` with no
 * scope) is meant for an app whose entire DOM the library owns — this
 * consumer doesn't; its existing CSS-Modules surfaces (dialog centering,
 * button paddings, heading hierarchy) would get clobbered if the reset
 * ever leaked out unscoped.
 *
 * This spec builds the library's CSS (`bun run build:aui`, plain Vite —
 * no Tailwind involved anymore) and asserts the resulting stylesheet (a)
 * does NOT contain a wildcard reset that hits every element on the page,
 * and (b) DOES still carry the `.aui-root`-scoped version, since the
 * surface itself still needs the reset (the vendored Thread / Composer /
 * MarkdownText / Tool / Reasoning / Voice components assume it).
 */
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("aui surface CSS preflight scope", () => {
  const root = resolve(__dirname, "..");
  const out = resolve(root, "dist/aui/aui.css");

  // Build the CSS at spec start so the assertions always reflect the
  // current source (plain Vite build — src/aui/aui.css plus every
  // component's own *.module.css get extracted into this one file, see
  // vite.aui.config.ts `build.lib.cssFileName`).
  execSync("bun run build:aui", { cwd: root, stdio: "inherit" });
  const css = readFileSync(out, "utf-8");

  it("does NOT emit a wildcard '*' reset that hits every element on the consumer page", () => {
    // The old Tailwind preflight emitted this rule unconditionally:
    //   *,:after,:before,::backdrop { box-sizing:border-box; border:0 solid; margin:0; padding:0 }
    // It is exactly that rule (margin/padding zero combined with the *
    // selector) that breaks consumer surfaces. The fix scopes the rule
    // under `.aui-root` so the consumer's non-aui DOM keeps its margins.
    const wildcardWithMarginZero =
      /\*\s*,\s*:after\s*,\s*:before\s*,\s*::backdrop\s*\{[^}]*margin\s*:\s*0[^}]*\}/;
    expect(css.match(wildcardWithMarginZero), {
      message:
        "aui.css emits a wildcard reset that bleeds into the consumer page — every preflight selector in src/aui/aui.css must stay scoped under :where(.aui-root ...).",
    } as never).toBeNull();
  });

  it("does NOT reset h1-h6 typography globally (consumer headings stay intact)", () => {
    // An unscoped preflight would also set:
    //   h1,h2,h3,h4,h5,h6 { font-size: inherit; font-weight: inherit }
    // With no scope, that flattens every heading on the consumer page.
    const globalHeadingReset =
      /h1\s*,\s*h2\s*,\s*h3\s*,\s*h4\s*,\s*h5\s*,\s*h6\s*\{[^}]*font-size\s*:\s*inherit/;
    expect(css.match(globalHeadingReset), {
      message:
        "aui.css resets heading typography globally; scope it under `.aui-root` instead",
    } as never).toBeNull();
  });

  it("DOES still ship an .aui-root-scoped preflight (the surface itself needs the reset)", () => {
    // The aui surface mounts shadcn-style components that assume a
    // preflight reset. Without scoped preflight the surface itself
    // breaks. Anchor the contract: SOMETHING under `.aui-root` resets
    // box-sizing.
    const scopedReset = /\.aui-root[^{]*\{[^}]*box-sizing\s*:\s*border-box/;
    expect(css.match(scopedReset)).not.toBeNull();
  });

  it("the scoped preflight is plain CSS — not gated behind a Tailwind @layer that no longer has meaning", () => {
    // Historically the preflight rules lived inside `@layer base` to sit
    // correctly relative to Tailwind's `theme`/`components`/`utilities`
    // layers. Post-migration there is no `utilities` layer competing for
    // the cascade, so the rules are plain (unlayered) CSS — pin that a
    // stray `@layer` wrapper didn't get carried over as dead weight.
    expect(css.includes("@layer"), {
      message:
        "aui.css still wraps rules in @layer — that made sense to interleave with Tailwind's own layers, but there's no Tailwind engine left to interleave with. Flatten to plain CSS.",
    } as never).toBe(false);
  });
});
