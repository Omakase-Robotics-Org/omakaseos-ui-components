/**
 * @file aui Tailwind preflight must NOT escape the surface.
 *
 * The library ships `dist/aui/aui.css` for consumers (`source/packages/web`,
 * status_server_webui, the assistant-ui-replacement-poc). Tailwind v4's
 * default preflight reset (`*, ::before, ::after, ::backdrop { margin: 0;
 * padding: 0; border: 0 solid; box-sizing: border-box }`, plus
 * `h1-h6 { font-size: inherit; font-weight: inherit }`) is meant for an
 * app whose entire DOM Tailwind owns. Our consumer doesn't — its existing
 * CSS-Modules styles (dialog centering, button paddings, heading
 * hierarchy) get clobbered when the reset lands globally.
 *
 * This spec is the t-wada red half of the fix in
 * `omksos_web/reports/ui-components-aui-tailwind-preflight-scope/`. It
 * runs `bun run build:aui:css` and asserts the resulting stylesheet
 * does NOT contain a wildcard reset that hits every element on the
 * page. The green half lands when `aui.css` scopes its preflight to
 * the `.aui-root` family.
 */
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("aui surface CSS preflight scope", () => {
  const root = resolve(__dirname, "..");
  const out = resolve(root, "dist/aui/aui.css");

  // Build the CSS at spec start so the assertions always reflect the
  // current source. Cheap (~50ms; the JS half is not rebuilt here).
  execSync("bun run build:aui:css", { cwd: root, stdio: "inherit" });
  const css = readFileSync(out, "utf-8");

  it("does NOT emit a wildcard '*' reset that hits every element on the consumer page", () => {
    // Tailwind v4's default preflight emits this rule unconditionally:
    //   *,:after,:before,::backdrop { box-sizing:border-box; border:0 solid; margin:0; padding:0 }
    // It is exactly that rule (margin/padding zero combined with the *
    // selector) that breaks consumer surfaces. The fix scopes the rule
    // under `.aui-root` so the consumer's non-aui DOM keeps its margins.
    const wildcardWithMarginZero =
      /\*\s*,\s*:after\s*,\s*:before\s*,\s*::backdrop\s*\{[^}]*margin\s*:\s*0[^}]*\}/;
    expect(css.match(wildcardWithMarginZero), {
      message:
        "aui.css emits a wildcard reset that bleeds into the consumer page (see report README for fix)",
    } as never).toBeNull();
  });

  it("does NOT reset h1-h6 typography globally (consumer headings stay intact)", () => {
    // Tailwind v4 preflight also sets:
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
    // Tailwind reset. Without scoped preflight the surface itself
    // breaks. Anchor the contract: SOMETHING under `.aui-root` resets
    // box-sizing.
    const scopedReset = /\.aui-root[^{]*\{[^}]*box-sizing\s*:\s*border-box/;
    expect(css.match(scopedReset)).not.toBeNull();
  });
});
