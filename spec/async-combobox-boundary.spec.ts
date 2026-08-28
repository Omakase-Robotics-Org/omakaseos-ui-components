/**
 * @file Boundary contract — synthetic ARIA combobox/listbox widgets live
 * ONLY at the files enumerated in `SYNTHETIC_WIDGETS` below.
 *
 * The library is "native elements only" by default (see `AGENTS.md`
 * decision rule 4). v0.7 introduced a single, deliberately-scoped
 * exception (`src/AsyncCombobox.tsx`): a native `<input role="combobox">`
 * composed with a synthetic `<ul role="listbox">` / `<li role="option">`
 * panel, because `<select>` and `<datalist>` both break at thousands of
 * options (server-fetched candidate lists; see
 * `omksos_web/reports/ui-components-async-combobox-layer/`). v0.18 adds a
 * SECOND: `src/AsyncMultiCombobox.tsx`, a multi-choice sibling absorbing
 * the dashboard's `ResourceMultiPicker`.
 *
 * A second entry makes the old spec's premise — "exactly one synthetic
 * ARIA widget, hard-coded by name" — false. Per the
 * map-editor-storybook-catalog precedent (a spec-internal "except this
 * one" is a banned silent skip; a guard's exception surface is machine
 * accounted, not enumerated as ad hoc exclusions), this file now scans
 * for an explicit, bidirectionally-checked SoT map instead of hard-coding
 * a single filename:
 *
 *   - `SYNTHETIC_WIDGETS: Record<path, reason>` is the enumeration, with
 *     a pinned `SYNTHETIC_WIDGETS_SIZE` so an addition or removal is a
 *     deliberate, reviewed edit to THIS file, not a side effect of
 *     editing something else.
 *   - Bidirectional: a `src/**\/*.tsx` file (outside `src/aui/`, which has
 *     its own boundary spec) that writes `role="listbox"` /
 *     `role="option"` / `role="combobox"` and is NOT in the map fails
 *     ("undeclared widget"). A map entry whose file no longer exists, or
 *     no longer writes that role, ALSO fails ("stale entry") — the same
 *     "the exception is opt-in, not just permitted" guard the single-entry
 *     version of this spec carried, generalized over N entries so a
 *     future PR that deletes a widget without removing its declaration
 *     fails CI before review.
 *   - Every substantive check the single-entry version of this spec made
 *     — the boundary itself, the native-input commitment, and (mirroring
 *     each widget's own "Library boundary" doc comment) that neither
 *     widget takes on fetch/pagination/i18n machinery — is now asserted
 *     PER ENTRY, over the whole map, not just the one file that used to
 *     be hard-coded.
 *   - All parsing fails loudly (throw) on unparsable input rather than
 *     reporting "ok" — a malformed map entry is a gap in this guard, not
 *     evidence the thing it guards is fine.
 *
 * `src/aui/` (the vendored shadcn-style assistant-ui registry, CSS
 * Modules since the v0.9 migration) is its OWN "exception layer",
 * governed by `aui-tailwind-boundary.spec.ts`, and unrelated to ARIA
 * combobox primitives — excluded here the same way the single-entry spec
 * excluded it.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, relative, sep } from "node:path";

const root = resolve(__dirname, "..");
const srcDir = resolve(root, "src");
const auiDir = resolve(root, "src/aui");

/**
 * SoT enumeration of every file allowed to write a synthetic ARIA
 * listbox/option/combobox role outside `src/aui/`. See the file header
 * for the bidirectional contract this map is checked against.
 */
const SYNTHETIC_WIDGETS: Record<string, string> = {
  "src/AsyncCombobox.tsx":
    "single-choice type-to-search combobox over an async candidate list — the library's original synthetic widget (v0.7)",
  "src/AsyncMultiCombobox.tsx":
    "multi-choice type-to-search combobox with a chip-strip selection buffer, absorbing the dashboard's ResourceMultiPicker (v0.18)",
};

/**
 * Pinned entry count. Bump this in the SAME change that adds or retires
 * a `SYNTHETIC_WIDGETS` entry — the mismatch below is what turns an
 * uncounted addition into a reviewed one.
 */
const SYNTHETIC_WIDGETS_SIZE = 2;

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

/** Resolve a `SYNTHETIC_WIDGETS` key (repo-relative, forward-slash) to an absolute path. */
function toAbsolute(repoRelative: string): string {
  if (repoRelative.length === 0 || repoRelative.includes("\\")) {
    throw new Error(
      `async-combobox-boundary.spec.ts: SYNTHETIC_WIDGETS key ${JSON.stringify(repoRelative)} ` +
        "is not a well-formed repo-relative, forward-slash path.",
    );
  }
  return resolve(root, repoRelative);
}

/**
 * The pattern catches both the JSX prop form (`role="listbox"`) and the
 * JS string form (`'role'` / `"role"` keys with combobox values). It is
 * intentionally loose so a regression in any shape — including a
 * CSS-in-JS object — fails the rule.
 */
const SYNTHETIC_ROLE_PATTERN = /role\s*=\s*["'](?:listbox|option|combobox)["']/;

describe("synthetic-widget boundary contract (SYNTHETIC_WIDGETS enumeration)", () => {
  const declaredPaths = Object.keys(SYNTHETIC_WIDGETS);

  it("SYNTHETIC_WIDGETS is well-formed and its size is pinned", () => {
    // Loud failure on malformed input rather than a silent "ok" — a
    // non-string key/value or an empty reason means this map was edited
    // into a shape this spec can no longer trust.
    for (const [key, reason] of Object.entries(SYNTHETIC_WIDGETS)) {
      if (typeof key !== "string" || key.length === 0) {
        throw new Error(
          `async-combobox-boundary.spec.ts: malformed SYNTHETIC_WIDGETS key ${JSON.stringify(key)}`,
        );
      }
      if (typeof reason !== "string" || reason.trim().length === 0) {
        throw new Error(
          `async-combobox-boundary.spec.ts: SYNTHETIC_WIDGETS["${key}"] must carry a non-empty reason`,
        );
      }
    }
    expect(declaredPaths.length, {
      message:
        `SYNTHETIC_WIDGETS has ${declaredPaths.length} entries but SYNTHETIC_WIDGETS_SIZE ` +
        `pins ${SYNTHETIC_WIDGETS_SIZE}. Update both together in the same change — this ` +
        "ratchet exists so adding or retiring a synthetic widget is a deliberate, reviewed " +
        "edit to this file, not a side effect of editing something else.",
    } as never).toBe(SYNTHETIC_WIDGETS_SIZE);
  });

  /** All TS / TSX sources under `src/`, `src/aui/` excluded (own boundary spec). */
  const allSources = Array.from(walk(srcDir))
    .filter((p) => /\.(ts|tsx)$/.test(p))
    .filter((p) => !isInsideAui(p));

  /**
   * Each declared widget's own unit spec is excluded from the "who else
   * writes this role" scan — mirroring the single-entry version of this
   * spec, which excluded `AsyncCombobox.spec.tsx` for the same reason: a
   * unit spec rightly interrogates its own component's role attributes
   * via testing-library queries and string literals.
   */
  const ownSpecPaths = new Set(
    declaredPaths.map((p) => toAbsolute(p.replace(/\.tsx$/, ".spec.tsx"))),
  );
  const scannedSources = allSources.filter((p) => !ownSpecPaths.has(p));

  it('every src/**/*.tsx file writing role="listbox"/"option"/"combobox" outside src/aui/ is declared in SYNTHETIC_WIDGETS', () => {
    const declaredAbsolute = new Set(declaredPaths.map(toAbsolute));
    const undeclared: string[] = [];
    for (const f of scannedSources) {
      const content = readFileSync(f, "utf-8");
      if (SYNTHETIC_ROLE_PATTERN.test(content) && !declaredAbsolute.has(f)) {
        undeclared.push(relative(root, f));
      }
    }
    expect(undeclared, {
      message:
        "A source outside SYNTHETIC_WIDGETS wrote a synthetic ARIA listbox/option/combobox " +
        "role. Either rebuild the request on top of <AsyncCombobox/> / <AsyncMultiCombobox/>, " +
        "or add a new, reasoned entry to SYNTHETIC_WIDGETS (and bump SYNTHETIC_WIDGETS_SIZE " +
        "in the same change).",
    } as never).toEqual([]);
  });

  it("every SYNTHETIC_WIDGETS entry is live: opt-in, not just permitted", () => {
    // Belt-and-suspenders per entry: if a widget's implementation were
    // deleted (or rewritten off the synthetic role) without removing its
    // map entry, this fails — a sign the boundary stopped being a real
    // contract for that entry, generalizing the single-entry spec's
    // "the exception is OPT-IN" guard.
    const stale: string[] = [];
    for (const repoRelative of declaredPaths) {
      const abs = toAbsolute(repoRelative);
      if (!existsSync(abs)) {
        stale.push(`${repoRelative} (file no longer exists)`);
        continue;
      }
      const content = readFileSync(abs, "utf-8");
      if (!SYNTHETIC_ROLE_PATTERN.test(content)) {
        stale.push(`${repoRelative} (no longer writes a synthetic listbox/option/combobox role)`);
      }
    }
    expect(stale, {
      message:
        "A SYNTHETIC_WIDGETS entry is stale. Remove it (and decrement SYNTHETIC_WIDGETS_SIZE) " +
        "once its widget is genuinely gone — a silently-stale entry would let a future, " +
        "unrelated file reuse its declared slot without review.",
    } as never).toEqual([]);
  });

  it("neither widget takes on fetch/pagination/i18n machinery", () => {
    // Mirrors, per entry, the "Library boundary" prose each widget's own
    // file header states (AsyncCombobox.tsx: "Does not fetch. Does not
    // own the URL or pagination. Does not localise."; AsyncMultiCombobox
    // inherits the same boundary via searchFn / label props) — checked
    // mechanically rather than trusted as an unenforced comment.
    const FORBIDDEN_IMPORT_SPECIFIERS = ["i18next", "react-i18next", "axios"];
    const FORBIDDEN_CALL_PATTERN = /\bfetch\s*\(/;
    const offenders: string[] = [];
    for (const repoRelative of declaredPaths) {
      const content = readFileSync(toAbsolute(repoRelative), "utf-8");
      if (FORBIDDEN_CALL_PATTERN.test(content)) {
        offenders.push(`${repoRelative}: calls fetch(...) directly`);
      }
      for (const specifier of FORBIDDEN_IMPORT_SPECIFIERS) {
        if (content.includes(`"${specifier}"`) || content.includes(`'${specifier}'`)) {
          offenders.push(`${repoRelative}: imports "${specifier}"`);
        }
      }
    }
    expect(offenders, {
      message:
        "A synthetic combobox widget took on fetch/pagination/i18n machinery it does not " +
        "own. The consumer supplies searchFn and every visible label; the widget only " +
        "renders what it is given.",
    } as never).toEqual([]);
  });

  it("every declared widget keeps its native <input> half (not a synthetic textbox)", () => {
    // The "native half stays native" rule is the AGENTS.md commitment
    // that keeps IME, mobile soft keyboards, and autocomplete behaviors
    // working — checked per entry so a refactor to EITHER widget that
    // swaps the <input> for a contentEditable div fails here.
    const NATIVE_INPUT_PATTERN = /<input\b[^>]*role\s*=\s*["']combobox["']/;
    const offenders: string[] = [];
    for (const repoRelative of declaredPaths) {
      const content = readFileSync(toAbsolute(repoRelative), "utf-8");
      if (!NATIVE_INPUT_PATTERN.test(content)) {
        offenders.push(repoRelative);
      }
    }
    expect(offenders, {
      message:
        'A declared synthetic widget no longer mounts a real <input role="combobox">. The ' +
        "native half of the exception is what keeps IME / mobile pickers working — restore " +
        "the native input.",
    } as never).toEqual([]);
  });
});
