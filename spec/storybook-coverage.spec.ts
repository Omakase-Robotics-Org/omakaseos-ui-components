/**
 * @file Story-coverage guard for the Storybook catalog.
 *
 * Full-domain accounting: every `package.json` `exports` map entry is
 * classified (an entry with no classification fails — see
 * `classifyExportsKey` below), and each classification carries its own
 * story obligation:
 *
 *   - `"."` (component-root) — every PascalCase component exported from
 *     `src/index.ts` has `src/<Name>.stories.tsx`, or a reasoned entry in
 *     `RATCHETED_EXPORTS_WITHOUT_OWN_STORY`.
 *   - `"./aui"` (component-aui) — the exports map value points at
 *     `dist/aui/*` (the built artifact), but the story obligation attaches
 *     to the SOURCE: every PascalCase component `src/aui/index.ts`
 *     re-exports from one of its own local modules (`export { X } from
 *     "./mod"`) has `src/aui/<mod>.stories.tsx` (module-unit, not
 *     export-unit — `ui/dialog`'s nine exports share one
 *     `src/aui/ui/dialog.stories.tsx`), or a reasoned entry in
 *     `AUI_MODULE_STORY_RATCHET`. PascalCase names `src/aui/index.ts`
 *     re-exports from a PACKAGE (`from "@assistant-ui/react"`, not a
 *     relative path) are runtime wiring, not visual components — no story
 *     obligation, but a new one appearing undeclared still fails
 *     (`AUI_PACKAGE_PASSTHROUGH_RATCHET`, checked both directions so it
 *     can never silently absorb an actual component).
 *   - `"./direct-manipulation"` (kernel-no-components) — a non-visual
 *     headless kernel; mechanically verified to export zero PascalCase
 *     (component-shaped) VALUES at runtime (its PascalCase names are all
 *     `export type`, which erase at runtime — see
 *     `direct-manipulation-boundary.spec.ts` for the sibling static
 *     boundary checks).
 *   - Anything ending in `.css` (stylesheet) — no story obligation.
 *
 * A second, independent contract: every `title` prefix used by a
 * `src/**\/*.stories.tsx` file (aui included — no directory is skipped) is
 * declared in `.storybook/preview.ts`'s `storySort.order`, and vice versa.
 *
 * Every ratchet here is bidirectional (same discipline as
 * `async-combobox-boundary.spec.ts` / `alias-purity.spec.ts`): an entry
 * whose export disappears, or that gains its own story, fails too, so the
 * list always states exactly what a reviewer must account for. Story-only
 * fixtures that are not barrel exports (`DirectManipulationStoryCanvas`,
 * `src/aui/AuiStoryStage.tsx`) never enter any "export" list below in the
 * first place, because those lists are built by parsing the barrels'
 * `export { ... } from` lines, not by scanning a directory.
 *
 * All parsing fails loudly (throw) on unparsable input rather than
 * reporting "ok" — a regex that stops matching after a refactor is a gap
 * in this guard, not evidence the thing it guards is fine.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const srcDir = resolve(root, "src");
const auiDir = resolve(srcDir, "aui");
const barrelPath = resolve(srcDir, "index.ts");
const auiBarrelPath = resolve(auiDir, "index.ts");
const previewPath = resolve(root, ".storybook/preview.ts");
const packageJsonPath = resolve(root, "package.json");

const PASCAL_NAME = /^[A-Z][A-Za-z0-9]*$/;

/** One `export { A, B, ... } from "source";` statement (single- or multi-line). */
type ExportBlock = { readonly names: readonly string[]; readonly from: string };

/** Parse every `export { ... } from "...";` statement out of a barrel file. Throws if none found. */
function parseExportBlocks(filePath: string, label: string): readonly ExportBlock[] {
  const source = readFileSync(filePath, "utf8");
  // Deliberately excludes `export type { ... }` (a leading `type` keyword
  // after `export` fails this pattern) and bare side-effect imports.
  const lines = source.match(/^export \{[^}]+\} from ["'][^"']+["'];/gm);
  if (lines === null || lines.length === 0) {
    throw new Error(
      `storybook-coverage.spec.ts: could not find any \`export { ... } from "./X"\` ` +
        `lines in ${label}. Either the barrel was rewritten in an unrecognised shape, ` +
        "or this spec's parser needs updating — do not let this silently pass.",
    );
  }
  return lines.map((line) => {
    const parsed = line.match(/^export \{([^}]+)\} from ["']([^"']+)["'];/);
    if (parsed === null) {
      throw new Error(`storybook-coverage.spec.ts: failed to parse export line in ${label}: ${line}`);
    }
    const [, body, from] = parsed as unknown as [string, string, string];
    const names = body
      .split(",")
      .map((raw) => raw.trim())
      .filter((item) => item.length > 0)
      // Drop `X as Y` re-exports down to the local export name.
      .map((item) => (item.includes(" as ") ? item.split(" as ").pop()!.trim() : item));
    return { names, from };
  });
}

function pascalNamesOf(names: readonly string[]): readonly string[] {
  return names.filter((name) => PASCAL_NAME.test(name));
}

// ---------------------------------------------------------------------------
// "." — component-root: src/index.ts barrel.
// ---------------------------------------------------------------------------

/**
 * Barrel exports that are companion sub-components exercised inside a
 * sibling's story file, not standalone demo targets. Keep this list and its
 * reasons current: it is verified in both directions below.
 */
const RATCHETED_EXPORTS_WITHOUT_OWN_STORY: Record<string, string> = {
  CardHeader: "call-shape companion of Card — demoed inside Card.stories.tsx",
  SectionHeader: "call-shape companion of Section — demoed inside Section.stories.tsx",
  FactList: "a Fact layout wrapper — demoed inside Fact.stories.tsx",
  FactGrid: "a Fact layout wrapper — demoed inside Fact.stories.tsx",
  TableSurface: "one skin ported as one unit with Table — demoed inside Table.stories.tsx",
  TableHeaderCell: "one skin ported as one unit with Table — demoed inside Table.stories.tsx",
  TableRow: "one skin ported as one unit with Table — demoed inside Table.stories.tsx",
  TableCell: "one skin ported as one unit with Table — demoed inside Table.stories.tsx",
  TableNotice: "one skin ported as one unit with Table — demoed inside Table.stories.tsx",
};
const RATCHET_SIZE = 9;

function barrelComponentExports(): readonly string[] {
  const blocks = parseExportBlocks(barrelPath, "src/index.ts");
  const names = new Set<string>();
  for (const block of blocks) {
    for (const name of pascalNamesOf(block.names)) names.add(name);
  }
  return [...names].sort();
}

function storyFileExists(dir: string, componentName: string): boolean {
  try {
    readFileSync(resolve(dir, `${componentName}.stories.tsx`), "utf8");
    return true;
  } catch {
    return false;
  }
}

describe("story coverage — every barrel export has (or ratchets away from) a story", () => {
  const exportNames = barrelComponentExports();

  it("parsed a non-trivial number of component exports (parser sanity)", () => {
    expect(exportNames.length).toBeGreaterThan(20);
  });

  it("pins the ratchet list at its current size", () => {
    expect(Object.keys(RATCHETED_EXPORTS_WITHOUT_OWN_STORY).length).toBe(RATCHET_SIZE);
  });

  it("every ratchet entry is still a real barrel export (stale-entry guard)", () => {
    const staleEntries = Object.keys(RATCHETED_EXPORTS_WITHOUT_OWN_STORY).filter(
      (name) => !exportNames.includes(name),
    );
    expect(staleEntries, {
      message:
        "These ratchet entries no longer correspond to a src/index.ts export. " +
        "Remove them from RATCHETED_EXPORTS_WITHOUT_OWN_STORY.",
    } as never).toEqual([]);
  });

  it("every ratchet entry still lacks its own story file (stale-entry guard)", () => {
    const nowCovered = Object.keys(RATCHETED_EXPORTS_WITHOUT_OWN_STORY).filter((name) =>
      storyFileExists(srcDir, name),
    );
    expect(nowCovered, {
      message:
        "These components now have their own src/<Name>.stories.tsx. Remove them " +
        "from RATCHETED_EXPORTS_WITHOUT_OWN_STORY — the exception is no longer needed.",
    } as never).toEqual([]);
  });

  it("every non-ratcheted export has src/<Name>.stories.tsx", () => {
    const missing = exportNames.filter(
      (name) => !(name in RATCHETED_EXPORTS_WITHOUT_OWN_STORY) && !storyFileExists(srcDir, name),
    );
    expect(missing, {
      message:
        `These exported components have no src/<Name>.stories.tsx: ${missing.join(", ")}. ` +
        "Add a story, or — if a standalone demo genuinely does not make sense — add a " +
        "reasoned entry to RATCHETED_EXPORTS_WITHOUT_OWN_STORY in this spec.",
    } as never).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// "./aui" — component-aui: src/aui/index.ts barrel, module-unit coverage.
// ---------------------------------------------------------------------------

/**
 * `src/aui/index.ts` local modules (`export { X } from "./mod"`) whose
 * PascalCase exports genuinely cannot get their own
 * `src/aui/<mod>.stories.tsx` — empty today: every local module with a
 * component-shaped export has one. Keyed by the module specifier (that is
 * what determines the story path), verified in both directions below, same
 * as `RATCHETED_EXPORTS_WITHOUT_OWN_STORY` above.
 */
const AUI_MODULE_STORY_RATCHET: Record<string, string> = {};
const AUI_MODULE_RATCHET_SIZE = 0;

/**
 * PascalCase names `src/aui/index.ts` re-exports from a PACKAGE
 * (`from "@assistant-ui/react"`, not a relative path) — runtime wiring
 * (a provider / a thread-runtime hook's context), not a visual component,
 * so no story is required. Any NEW PascalCase pass-through must be added
 * here with a reason before it can land — the whole point is that an
 * actual component sneaking in as a "just wiring" pass-through still gets
 * caught (checked both directions below).
 */
const AUI_PACKAGE_PASSTHROUGH_RATCHET: Record<string, string> = {
  ReadonlyThreadProvider:
    "runtime wiring (feeds an assistant-ui thread runtime from ThreadMessage[]) — not a " +
    "visual component; see the read-only archived-transcript pattern documented in " +
    "src/aui/index.ts's own header comment",
  AssistantRuntimeProvider:
    "runtime wiring (supplies the assistant-ui context every other aui component reads) — " +
    "not a visual component itself; exercised implicitly by every Aui/* story that mounts " +
    "a runtime (AuiStoryStage.tsx)",
};
const AUI_PACKAGE_PASSTHROUGH_RATCHET_SIZE = 2;

type AuiBarrelAccounting = {
  readonly localModuleNames: ReadonlyMap<string, readonly string[]>;
  readonly packagePassthroughNames: readonly string[];
};

function auiBarrelAccounting(): AuiBarrelAccounting {
  const blocks = parseExportBlocks(auiBarrelPath, "src/aui/index.ts");
  const localModuleNames = new Map<string, string[]>();
  const packagePassthroughNames = new Set<string>();
  for (const block of blocks) {
    const isLocal = block.from.startsWith("./") || block.from.startsWith("../");
    const pascalNames = pascalNamesOf(block.names);
    if (pascalNames.length === 0) continue;
    if (isLocal) {
      const existing = localModuleNames.get(block.from) ?? [];
      localModuleNames.set(block.from, [...existing, ...pascalNames]);
    } else {
      for (const name of pascalNames) packagePassthroughNames.add(name);
    }
  }
  return { localModuleNames, packagePassthroughNames: [...packagePassthroughNames].sort() };
}

/** `./mod` (relative to src/aui/index.ts) -> src/aui/mod.stories.tsx. */
function auiModuleStoryPath(moduleSpecifier: string): string {
  return `${resolve(auiDir, moduleSpecifier)}.stories.tsx`;
}

function auiModuleStoryExists(moduleSpecifier: string): boolean {
  try {
    readFileSync(auiModuleStoryPath(moduleSpecifier), "utf8");
    return true;
  } catch {
    return false;
  }
}

describe("story coverage — every aui local-module export has (or ratchets away from) a story", () => {
  const { localModuleNames } = auiBarrelAccounting();
  const localModulesWithComponents = [...localModuleNames.keys()].sort();

  it("parsed a non-trivial number of aui local modules with component exports (parser sanity)", () => {
    expect(localModulesWithComponents.length).toBeGreaterThan(5);
  });

  it("pins the aui module-story ratchet list at its current size", () => {
    expect(Object.keys(AUI_MODULE_STORY_RATCHET).length).toBe(AUI_MODULE_RATCHET_SIZE);
  });

  it("every aui module ratchet entry still exports a PascalCase component (stale-entry guard)", () => {
    const staleEntries = Object.keys(AUI_MODULE_STORY_RATCHET).filter(
      (moduleSpecifier) => !localModulesWithComponents.includes(moduleSpecifier),
    );
    expect(staleEntries, {
      message:
        "These aui module ratchet entries no longer correspond to a src/aui/index.ts local " +
        "module with a PascalCase export. Remove them from AUI_MODULE_STORY_RATCHET.",
    } as never).toEqual([]);
  });

  it("every aui module ratchet entry still lacks its own story file (stale-entry guard)", () => {
    const nowCovered = Object.keys(AUI_MODULE_STORY_RATCHET).filter((moduleSpecifier) =>
      auiModuleStoryExists(moduleSpecifier),
    );
    expect(nowCovered, {
      message:
        "These aui modules now have their own src/aui/<mod>.stories.tsx. Remove them from " +
        "AUI_MODULE_STORY_RATCHET — the exception is no longer needed.",
    } as never).toEqual([]);
  });

  it("every non-ratcheted aui local module has src/aui/<mod>.stories.tsx", () => {
    const missing = localModulesWithComponents.filter(
      (moduleSpecifier) =>
        !(moduleSpecifier in AUI_MODULE_STORY_RATCHET) && !auiModuleStoryExists(moduleSpecifier),
    );
    expect(missing, {
      message:
        `These aui modules (re-exported from src/aui/index.ts) have no ` +
        `src/aui/<mod>.stories.tsx: ${missing.join(", ")}. Add a story, or — if a standalone ` +
        "demo genuinely does not make sense — add a reasoned entry to AUI_MODULE_STORY_RATCHET.",
    } as never).toEqual([]);
  });
});

describe("aui package pass-through accounting — no undeclared PascalCase re-export from a package", () => {
  const { packagePassthroughNames } = auiBarrelAccounting();

  it("pins the package pass-through ratchet list at its current size", () => {
    expect(Object.keys(AUI_PACKAGE_PASSTHROUGH_RATCHET).length).toBe(
      AUI_PACKAGE_PASSTHROUGH_RATCHET_SIZE,
    );
  });

  it("every pinned pass-through name is still actually re-exported from a package (stale-entry guard)", () => {
    const staleEntries = Object.keys(AUI_PACKAGE_PASSTHROUGH_RATCHET).filter(
      (name) => !packagePassthroughNames.includes(name),
    );
    expect(staleEntries, {
      message:
        "These names are pinned in AUI_PACKAGE_PASSTHROUGH_RATCHET but src/aui/index.ts no " +
        "longer re-exports them from a package. Remove the stale entry.",
    } as never).toEqual([]);
  });

  it("every package-re-exported PascalCase name is declared in the ratchet (undeclared pass-through = fail)", () => {
    const undeclared = packagePassthroughNames.filter(
      (name) => !(name in AUI_PACKAGE_PASSTHROUGH_RATCHET),
    );
    expect(undeclared, {
      message:
        `src/aui/index.ts re-exports these PascalCase names from a package with no entry in ` +
        `AUI_PACKAGE_PASSTHROUGH_RATCHET: ${undeclared.join(", ")}. This guard never silently ` +
        "waves through a new pass-through — add a reasoned entry (confirming it is runtime " +
        "wiring, not a visual component that actually needs a story) or add a story instead.",
    } as never).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// "./direct-manipulation" — kernel-no-components.
// ---------------------------------------------------------------------------

describe("direct-manipulation kernel — exports zero PascalCase (component-shaped) values", () => {
  it("has no runtime PascalCase value export (its PascalCase names are all `export type`, erased at runtime)", async () => {
    const kernel: Record<string, unknown> = await import("../src/direct-manipulation");
    const pascalValueExports = Object.keys(kernel).filter((name) => PASCAL_NAME.test(name));
    expect(pascalValueExports, {
      message:
        `src/direct-manipulation/index.ts now exports a runtime PascalCase value: ` +
        `${pascalValueExports.join(", ")}. This entry is classified "kernel-no-components" in ` +
        "package.json's exports map (non-visual headless kernel) — if this is a genuine " +
        "component, reclassify the exports entry in this spec (and give it a story surface) " +
        "instead of letting a component-shaped export hide inside the kernel.",
    } as never).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// package.json exports map — every entry classified (unclassified = fail).
// ---------------------------------------------------------------------------

type ExportsClassification = "component-root" | "component-aui" | "kernel-no-components" | "stylesheet";

const EXPORTS_CLASSIFICATION: Record<string, ExportsClassification> = {
  ".": "component-root",
  "./aui": "component-aui",
  "./direct-manipulation": "kernel-no-components",
};

function classifyExportsKey(key: string): ExportsClassification | undefined {
  if (key in EXPORTS_CLASSIFICATION) return EXPORTS_CLASSIFICATION[key];
  if (key.endsWith(".css")) return "stylesheet";
  return undefined;
}

describe("package.json exports map — every entry is classified (no silent exclusion)", () => {
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    exports?: Record<string, unknown>;
  };
  const exportsMap = pkg.exports;
  if (exportsMap === undefined) {
    throw new Error("storybook-coverage.spec.ts: package.json has no `exports` map to account for.");
  }
  const keys = Object.keys(exportsMap);

  it("parsed a non-trivial number of exports entries (parser sanity)", () => {
    expect(keys.length).toBeGreaterThan(3);
  });

  it("classifies every exports entry — an entry with no classification fails", () => {
    const unclassified = keys.filter((key) => classifyExportsKey(key) === undefined);
    expect(unclassified, {
      message:
        `These package.json exports entries have no classification in this spec: ` +
        `${unclassified.join(", ")}. Add them to EXPORTS_CLASSIFICATION (or, if they end in ` +
        '.css, the "stylesheet" fallback already covers them) — an unclassified entry is not ' +
        "an exclusion, it is a gap this guard refuses to paper over.",
    } as never).toEqual([]);
  });

  it("every classified non-stylesheet key still exists in the exports map (stale-entry guard)", () => {
    const staleKeys = Object.keys(EXPORTS_CLASSIFICATION).filter((key) => !keys.includes(key));
    expect(staleKeys, {
      message:
        `These keys are pinned in EXPORTS_CLASSIFICATION but no longer exist in package.json's ` +
        `exports map: ${staleKeys.join(", ")}. Remove the stale entry.`,
    } as never).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// title prefixes <-> storySort.order (both directions, aui included).
// ---------------------------------------------------------------------------

/** Extract the `meta.title`'s first path segment from one story file's source. */
function storyTitlePrefix(source: string, file: string): string {
  const metaBlock = source.match(/const meta[^=]*=\s*\{([\s\S]*?)\}\s*satisfies Meta/)?.[1];
  if (metaBlock === undefined) {
    throw new Error(
      `storybook-coverage.spec.ts: could not locate \`const meta = { ... } satisfies Meta\` ` +
        `in ${file}. This spec's parser needs updating for the new story shape — do not let ` +
        "this silently pass.",
    );
  }
  const title = metaBlock.match(/title:\s*["']([^"']+)["']/)?.[1];
  if (title === undefined) {
    throw new Error(`storybook-coverage.spec.ts: no \`title\` found in ${file}'s meta block.`);
  }
  const prefix = title.split("/")[0];
  if (prefix === undefined || prefix.length === 0) {
    throw new Error(`storybook-coverage.spec.ts: title "${title}" in ${file} has no prefix segment.`);
  }
  return prefix;
}

/** All `*.stories.tsx` files under `src/`, recursively — no directory is skipped. */
function allStoryFiles(): readonly string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = resolve(dir, name.name);
      if (name.isDirectory()) {
        walk(p);
      } else if (name.isFile() && name.name.endsWith(".stories.tsx")) {
        out.push(p);
      }
    }
  };
  walk(srcDir);
  return out.sort();
}

/** Extract `.storybook/preview.ts`'s `storySort.order` array of prefixes. */
function storySortOrder(): readonly string[] {
  const source = readFileSync(previewPath, "utf8");
  const orderBody = source.match(/storySort:\s*\{[\s\S]*?order:\s*\[([\s\S]*?)\]/)?.[1];
  if (orderBody === undefined) {
    throw new Error(
      "storybook-coverage.spec.ts: could not locate `storySort: { ... order: [ ... ] }` in " +
        ".storybook/preview.ts. This spec's parser needs updating — do not let this silently pass.",
    );
  }
  const entries = [...orderBody.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]!);
  if (entries.length === 0) {
    throw new Error("storybook-coverage.spec.ts: storySort.order parsed to zero entries.");
  }
  return entries;
}

describe("story coverage — title prefixes and storySort.order agree (both directions)", () => {
  const storyFiles = allStoryFiles();
  const prefixByFile = new Map(
    storyFiles.map((file) => [file, storyTitlePrefix(readFileSync(file, "utf8"), file)]),
  );
  const prefixesInUse = new Set(prefixByFile.values());
  const order = storySortOrder();
  const orderSet = new Set(order);

  it("found a non-trivial number of story files (parser sanity)", () => {
    expect(storyFiles.length).toBeGreaterThan(20);
  });

  it("storySort.order has no duplicate entries", () => {
    expect(order.length).toBe(orderSet.size);
  });

  it("every story title prefix is declared in storySort.order", () => {
    const undeclared = [...prefixesInUse].filter((prefix) => !orderSet.has(prefix)).sort();
    expect(undeclared, {
      message:
        `These title prefixes are used by a story but missing from .storybook/preview.ts's ` +
        `storySort.order: ${undeclared.join(", ")}.`,
    } as never).toEqual([]);
  });

  it("every storySort.order entry has at least one story", () => {
    const unused = order.filter((prefix) => !prefixesInUse.has(prefix)).sort();
    expect(unused, {
      message:
        `These storySort.order entries have no story using that title prefix: ` +
        `${unused.join(", ")}. Remove the stale entry, or add the story.`,
    } as never).toEqual([]);
  });
});
