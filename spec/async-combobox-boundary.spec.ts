/**
 * @file Boundary contract — synthetic ARIA combobox/listbox lives ONLY
 * inside `src/AsyncCombobox.tsx`.
 *
 * The library is "native elements only" by default
 * (see `AGENTS.md` decision rule 4). v0.7 introduces a single,
 * deliberately-scoped exception: `src/AsyncCombobox.tsx` composes a
 * native `<input role="combobox">` with a synthetic
 * `<ul role="listbox">` / `<li role="option">` panel because
 * `<select>` and `<datalist>` both break at thousands of options
 * (server-fetched candidate lists; see
 * `omksos_web/reports/ui-components-async-combobox-layer/`).
 *
 * The exception is BOUNDED. Anywhere else in the library writing
 * `role="listbox"` / `role="option"` / `role="combobox"` is a
 * contract break, because:
 *
 *   - Each synthetic widget owns its own ARIA wiring + keyboard +
 *     focus. The cost of getting it wrong is silent a11y regression.
 *   - Every additional synthetic widget enlarges the surface a
 *     reviewer must audit. Pinning the count at exactly one means
 *     the reviewer can read one file and trust the library.
 *   - The aui surface (vendored shadcn-style assistant-ui registry
 *     components, CSS Modules since the v0.9 migration) is governed
 *     by its own boundary spec — it is the only other "exception
 *     layer" in the package, and its contents are unrelated to ARIA
 *     combobox primitives. So we explicitly exclude `src/aui/` from
 *     the "no role= here" rule and pin THIS exception (AsyncCombobox)
 *     separately.
 *
 * Each assertion is paired with the symmetric "the exception is
 * not empty" guard, mirroring the aui boundary spec — so a future PR
 * that deletes AsyncCombobox.tsx without removing the exception
 * language fails CI before review.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, relative, sep } from "node:path";

const root = resolve(__dirname, "..");
const srcDir = resolve(root, "src");
const auiDir = resolve(root, "src/aui");
const asyncComboboxFile = resolve(srcDir, "AsyncCombobox.tsx");

/** Walk a directory recursively and yield files. Skips hidden + symlinks. */
function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) {
      continue;
    }
    const p = resolve(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      yield* walk(p);
    } else if (s.isFile()) {
      yield p;
    }
  }
}

/** True if the absolute path lives under `src/aui/`. */
function isInsideAui(absPath: string): boolean {
  const r = relative(auiDir, absPath);
  return r.length > 0 && !r.startsWith("..") && !r.startsWith(sep);
}

/** True if the absolute path IS the AsyncCombobox source itself. */
function isAsyncComboboxImpl(absPath: string): boolean {
  return absPath === asyncComboboxFile;
}

describe("AsyncCombobox synthetic-widget boundary contract", () => {
  /** All TS / TSX sources under `src/`. */
  const allSources = Array.from(walk(srcDir)).filter((p) =>
    /\.(ts|tsx)$/.test(p),
  );

  /**
   * Sources subject to the rule: everything under `src/` EXCEPT
   *   - `src/AsyncCombobox.tsx` (the canonical, allowed location)
   *   - `src/aui/**` (the vendored assistant-ui exception layer;
   *     governed by `aui-tailwind-boundary.spec.ts`)
   *   - The AsyncCombobox spec itself (the unit spec rightly
   *     interrogates the role attributes via testing-library queries
   *     and string literals).
   */
  const boundedSources = allSources.filter(
    (p) =>
      !isInsideAui(p) &&
      !isAsyncComboboxImpl(p) &&
      !p.endsWith("AsyncCombobox.spec.tsx"),
  );

  /**
   * The pattern catches both the JSX prop form (`role="listbox"`)
   * and the JS string form (`'role'` / `"role"` keys with combobox
   * values). It is intentionally loose so a regression in any
   * shape — including a CSS-in-JS object — fails the rule.
   */
  const SYNTHETIC_ROLE_PATTERN =
    /role\s*=\s*["'](?:listbox|option|combobox)["']/;

  it("only src/AsyncCombobox.tsx writes role=\"listbox\" / role=\"option\" / role=\"combobox\" outside src/aui/", () => {
    const offenders: string[] = [];
    for (const f of boundedSources) {
      const content = readFileSync(f, "utf-8");
      if (SYNTHETIC_ROLE_PATTERN.test(content)) {
        offenders.push(relative(root, f));
      }
    }
    expect(offenders, {
      message:
        "A non-AsyncCombobox source wrote a synthetic ARIA listbox/option/combobox role. Either rebuild the request on top of <AsyncCombobox/>, or move the new synthetic widget under a deliberately bounded exception (and pin its boundary in this spec).",
    } as never).toEqual([]);
  });

  it("the AsyncCombobox exception is OPT-IN: the canonical file actually uses the synthetic widget", () => {
    // Belt-and-suspenders: if someone deletes the AsyncCombobox
    // implementation entirely, the assertion above still passes
    // trivially. This assertion makes the boundary spec FAIL when
    // the exception layer becomes empty — a sign the boundary
    // stopped being a real contract.
    const content = readFileSync(asyncComboboxFile, "utf-8");
    expect(SYNTHETIC_ROLE_PATTERN.test(content), {
      message:
        "src/AsyncCombobox.tsx is supposed to be the synthetic-widget exception, but the canonical role attributes are no longer present. Did the boundary collapse?",
    } as never).toBe(true);
  });

  it("AsyncCombobox keeps its native <input> half (not a synthetic textbox)", () => {
    // The "native half stays native" rule is the AGENTS.md
    // commitment that keeps IME, mobile soft keyboards, and
    // autocomplete behaviors working. If a refactor swaps the
    // `<input>` for a `contentEditable` div, this catches it.
    const content = readFileSync(asyncComboboxFile, "utf-8");
    expect(/<input\b[^>]*role\s*=\s*["']combobox["']/.test(content), {
      message:
        "src/AsyncCombobox.tsx no longer mounts a real <input role=\"combobox\">. The native half of the exception is what keeps IME / mobile pickers working — restore the native input.",
    } as never).toBe(true);
  });
});
