/**
 * @file Story-coverage guard for the Storybook catalog.
 *
 * Two independent contracts, both mechanised so a missing story reads as a
 * CI failure instead of a silent gap in the published catalog:
 *
 *   1. Every React component the package exports from its public barrel
 *      (`src/index.ts`) has a story at the conventional path
 *      `src/<Name>.stories.tsx`. A handful of exports are companion
 *      sub-components exercised inside a sibling's story file rather than
 *      demoed standalone (`CardHeader` inside `Card.stories.tsx`, etc.) —
 *      those are named in `RATCHETED_EXPORTS_WITHOUT_OWN_STORY` below, and
 *      the ratchet is BOTH directions: an entry whose export disappears, or
 *      that gains its own story file, fails too, so the list always states
 *      exactly what a reviewer must account for (the same discipline as
 *      `async-combobox-boundary.spec.ts` and `alias-purity.spec.ts`).
 *
 *   2. Every `title` prefix used by a `src/**\/*.stories.tsx` file is
 *      declared in `.storybook/preview.ts`'s `storySort.order`, and vice
 *      versa — an order entry with zero stories under it is as much a drift
 *      signal as a story prefix Storybook would sort arbitrarily.
 *
 * Scope: `src/aui/` is excluded entirely (a separate vendored sub-entry,
 * `./aui`, not re-exported from `src/index.ts` — a different purpose owns
 * its story/demo coverage). Story-only helpers that are not barrel exports
 * (e.g. `DirectManipulationStoryCanvas`) never enter the "export" list
 * below in the first place, because that list is built from `src/index.ts`
 * exports, not from a directory scan — so they need no separate exclusion.
 *
 * Both halves fail loudly (throw) on unparsable input rather than reporting
 * "ok" — a regex that stops matching after a refactor is a gap in this
 * guard, not evidence the thing it guards is fine.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const srcDir = resolve(root, "src");
const barrelPath = resolve(srcDir, "index.ts");
const previewPath = resolve(root, ".storybook/preview.ts");

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
};
const RATCHET_SIZE = 4;

/** Pull the exported PascalCase (component-shaped) names out of the public barrel. */
function barrelComponentExports(): readonly string[] {
  const source = readFileSync(barrelPath, "utf8");
  // `export { A, B } from "./X";` — deliberately excludes `export type { ... }`
  // (a leading `type` keyword after `export` fails this pattern) and the
  // trailing bare `import "./tokens.css";` side-effect import.
  const lines = source.match(/^export \{[^}]+\} from ["'][^"']+["'];/gm);
  if (lines === null || lines.length === 0) {
    throw new Error(
      "storybook-coverage.spec.ts: could not find any `export { ... } from \"./X\";` " +
        "lines in src/index.ts. Either the barrel was rewritten in an unrecognised " +
        "shape, or this spec's parser needs updating — do not let this silently pass.",
    );
  }
  const names = new Set<string>();
  for (const line of lines) {
    const body = line.match(/^export \{([^}]+)\} from/)?.[1];
    if (body === undefined) {
      throw new Error(`storybook-coverage.spec.ts: failed to parse export line: ${line}`);
    }
    for (const rawItem of body.split(",")) {
      const item = rawItem.trim();
      if (item.length === 0) {
        continue;
      }
      // Drop `X as Y` re-exports down to the local export name; none exist
      // today, but the parser should not silently mis-handle one.
      const name = item.includes(" as ") ? item.split(" as ").pop()!.trim() : item;
      if (/^[A-Z][A-Za-z0-9]*$/.test(name)) {
        names.add(name);
      }
    }
  }
  return [...names].sort();
}

function storyFileExists(componentName: string): boolean {
  try {
    readFileSync(resolve(srcDir, `${componentName}.stories.tsx`), "utf8");
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
      storyFileExists(name),
    );
    expect(nowCovered, {
      message:
        "These components now have their own src/<Name>.stories.tsx. Remove them " +
        "from RATCHETED_EXPORTS_WITHOUT_OWN_STORY — the exception is no longer needed.",
    } as never).toEqual([]);
  });

  it("every non-ratcheted export has src/<Name>.stories.tsx", () => {
    const missing = exportNames.filter(
      (name) =>
        !(name in RATCHETED_EXPORTS_WITHOUT_OWN_STORY) && !storyFileExists(name),
    );
    expect(missing, {
      message:
        `These exported components have no src/<Name>.stories.tsx: ${missing.join(", ")}. ` +
        "Add a story, or — if a standalone demo genuinely does not make sense — add a " +
        "reasoned entry to RATCHETED_EXPORTS_WITHOUT_OWN_STORY in this spec.",
    } as never).toEqual([]);
  });
});

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

/** All `*.stories.tsx` files under `src/`, recursively (skips `src/aui/`). */
function allStoryFiles(): readonly string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      if (name.name === "aui") {
        continue;
      }
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
