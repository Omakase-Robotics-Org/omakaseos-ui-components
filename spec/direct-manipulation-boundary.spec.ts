/**
 * @file Static boundary checks for the direct-manipulation layer.
 *
 * The map surface is decorative SVG plus native controls alongside it. These
 * assertions keep it from quietly becoming a second synthetic widget or from
 * pulling renderer/application dependencies into the headless kernel.
 *
 * Every accounting here is derived from the DIRECTORY or from the source's own
 * text, never from a list written in this file. A hard-coded list of "the pure
 * files" is a guard that goes silent the moment someone adds a module — the
 * worst failure mode a guard has, because it keeps reporting green about a
 * surface it no longer covers.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const directManipulationDir = resolve(root, "src/direct-manipulation");
const allEditFiles = readdirSync(resolve(root, "src"))
  .filter((file) => /^Edit.*\.tsx$/.test(file))
  .sort();
const editComponentFiles = allEditFiles.filter((file) => /^Edit[^.]+\.tsx$/.test(file));
const directFiles = readdirSync(directManipulationDir)
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .sort();

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function directSourceFiles(): readonly string[] {
  return directFiles.map((file) => `src/direct-manipulation/${file}`);
}

function editSourceFiles(): readonly string[] {
  return allEditFiles.map((file) => `src/${file}`);
}

function editComponentSourceFiles(): readonly string[] {
  return editComponentFiles.map((file) => `src/${file}`);
}

/**
 * Which files in the kernel directory are allowed to be React-aware: the hooks,
 * and only by their name. Everything else in the directory is pure by default,
 * so a new module is covered the moment it exists.
 */
function isHookFile(file: string): boolean {
  return /^use[A-Z][A-Za-z0-9]*\.tsx?$/.test(file);
}

function isSpecFile(file: string): boolean {
  return /\.spec\.tsx?$/.test(file);
}

/** Source with comments removed: a MENTION is not a reference. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("direct-manipulation native-first boundary", () => {
  it("does not put role= on the decorative surface or Edit SVG fragments", () => {
    const files = [...directSourceFiles(), ...editSourceFiles()];
    const violations = files.flatMap((file) => {
      const content = read(file);
      return /\brole\s*=/.test(content) ? [file] : [];
    });
    expect(violations).toEqual([]);
  });

  it("keeps every Edit component's outermost g hidden and non-focusable", () => {
    const violations = editComponentSourceFiles().flatMap((file) => {
      const content = read(file);
      const outerGroup = content.match(/<g\b[^>]*>/s)?.[0] ?? "";
      const hasHiddenBoundary = /aria-hidden\s*=\s*["']true["']/.test(outerGroup);
      const hasNonFocusableBoundary = /focusable\s*=\s*["']false["']/.test(outerGroup);
      return hasHiddenBoundary && hasNonFocusableBoundary ? [] : [file];
    });
    expect(violations).toEqual([]);
  });

  it("keeps role, tabIndex, and aria keys out of surfaceProps", () => {
    const source = read("src/direct-manipulation/useDirectEditSurface.ts");
    const surfaceProps = source.match(
      /readonly surfaceProps:\s*\{([\s\S]*?)\n\s*\};/,
    )?.[1];
    expect(surfaceProps).toBeDefined();
    expect(surfaceProps ?? "").not.toMatch(/\b(?:role|tabIndex)\s*[?:]/);
    expect(surfaceProps ?? "").not.toMatch(/\baria-[a-z0-9-]+\s*[?:]/i);
  });

  it("keeps the pure kernel free of React imports, accounting for the whole directory", () => {
    // The classification is the FILENAME, not a list: a `use*` module may hold
    // React, and every other module in this directory may not. A new pure
    // module is therefore covered by this guard on the day it is written.
    const pureFiles = directFiles.filter((file) => !isHookFile(file) && !isSpecFile(file));
    expect(pureFiles.length, {
      message:
        "No pure kernel modules were found in src/direct-manipulation. Either the directory " +
        "moved or this guard's parser is broken — do not let it report green over nothing.",
    } as never).toBeGreaterThan(4);
    const violations = pureFiles.flatMap((file) => {
      const content = read(`src/direct-manipulation/${file}`);
      return /(?:from\s+|import\s*)["']react["']/.test(content)
        ? [`src/direct-manipulation/${file}`]
        : [];
    });
    expect(violations, {
      message:
        `These modules are not named use* and therefore may not import React: ` +
        `${violations.join(", ")}. Move the React-dependent part into a hook, or rename the ` +
        "module if it genuinely is one.",
    } as never).toEqual([]);
    // Every file in the directory falls into exactly one class, so nothing is
    // quietly outside this guard's reach.
    const unclassified = directFiles.filter(
      (file) => !isHookFile(file) && !isSpecFile(file) && !pureFiles.includes(file),
    );
    expect(unclassified).toEqual([]);
    expect(directFiles.filter((file) => isHookFile(file)).sort()).toEqual([
      "useDirectEditSurface.ts",
      "useEditCommandKeys.ts",
    ]);
  });

  it("keeps every direct-manipulation module free of renderer imports", () => {
    const violations = directSourceFiles().flatMap((file) => {
      const imports = read(file)
        .split("\n")
        .filter((line) => /\bimport\b/.test(line));
      return imports.some((line) => /["'](?:three|react-pcd-kit)(?:\/[^"']*)?["']/.test(line))
        ? [file]
        : [];
    });
    expect(violations).toEqual([]);
  });
});

describe("the canvas never acquires keyboard behaviour of its own", () => {
  it("does not wire the chrome layer's command keys into the surface hook", () => {
    // Enter / Escape-outside-a-drag / Delete are the native twin controls'
    // accelerators and belong to the consumer's chrome. If the surface hook
    // ever called this helper, the canvas would gain keyboard behaviour and the
    // a11y contract would be broken from the inside.
    const source = withoutComments(read("src/direct-manipulation/useDirectEditSurface.ts"));
    expect(source).not.toMatch(/useEditCommandKeys/);
  });

  it("calls preventDefault exactly once in the surface hook, on the drag's own cancel", () => {
    const source = read("src/direct-manipulation/useDirectEditSurface.ts");
    const calls = source.match(/\.preventDefault\(\)/g) ?? [];
    expect(calls, {
      message:
        `useDirectEditSurface.ts calls preventDefault ${calls.length} times; exactly one is ` +
        "allowed (aborting a live drag on Escape). Every other key must stay the browser's " +
        "and the screen reader's.",
    } as never).toHaveLength(1);
    // ...and that one call is inside the Escape branch.
    const escapeBranch = source.match(
      /if \(event\.key === "Escape"\) \{([\s\S]*?)\n {6}\}/,
    )?.[1];
    expect(escapeBranch).toBeDefined();
    expect(escapeBranch ?? "").toMatch(/\.preventDefault\(\)/);
  });

  it("observes only Shift and Alt as gesture modifiers, never ctrl or meta", () => {
    // Ctrl+click synthesises a contextmenu on macOS and Meta is captured by the
    // OS: both are refused by the type, and the hook must not read them either.
    const hook = read("src/direct-manipulation/useDirectEditSurface.ts");
    expect(hook).not.toMatch(/\bctrlKey\b/);
    expect(hook).not.toMatch(/\bmetaKey\b/);
    const modifiers = read("src/direct-manipulation/grammar.ts").match(
      /export type EditModifiers = \{([\s\S]*?)\};/,
    )?.[1];
    expect(modifiers).toBeDefined();
    expect(modifiers ?? "").not.toMatch(/\b(?:ctrl|meta)\b/);
  });

  it("guards the chrome helper against firing while the operator is typing", () => {
    const source = read("src/direct-manipulation/useEditCommandKeys.ts");
    expect(source).toMatch(/isTextEntry/);
    // The guard is checked before any command runs.
    const handler = source.match(/const onKeyDown = \(event: KeyboardEvent\) => \{([\s\S]*?)\n {4}\};/)?.[1];
    expect(handler).toBeDefined();
    const guardAt = (handler ?? "").indexOf("isTextEntry");
    const firstCommandAt = (handler ?? "").search(/on(?:FinishRun|CancelRun|Disarm|DeselectAll|DeleteSelection)\(/);
    expect(guardAt).toBeGreaterThanOrEqual(0);
    expect(firstCommandAt).toBeGreaterThan(guardAt);
    // And it covers text inputs by tag as well as contentEditable hosts.
    const isTextEntry = source.match(/export function isTextEntry\(([\s\S]*?)\n\}/)?.[1] ?? "";
    for (const tag of ["INPUT", "SELECT", "TEXTAREA"]) {
      expect(isTextEntry, tag).toContain(tag);
    }
    expect(isTextEntry).toContain("isContentEditable");
  });
});

describe("the invariants and the tests that pin them cannot drift apart", () => {
  /** `- Invariant X: sentence` lines from grammar.ts's own header. */
  function declaredInvariants(): readonly string[] {
    const source = read("src/direct-manipulation/grammar.ts");
    const header = source.match(/^\/\*\*([\s\S]*?)\*\//)?.[1];
    if (header === undefined) {
      throw new Error(
        "direct-manipulation-boundary.spec.ts: grammar.ts has no leading file comment to read " +
          "its invariants from. This parser needs updating — do not let it silently pass.",
      );
    }
    const lines = header
      .split("\n")
      .map((line) => line.replace(/^\s*\*\s?/, ""))
      .filter((line) => /^\s*- Invariant /.test(line))
      .map((line) => line.replace(/^\s*- /, "").trim());
    if (lines.length === 0) {
      throw new Error(
        "direct-manipulation-boundary.spec.ts: found no `- Invariant X: ...` lines in " +
          "grammar.ts's header. Either the invariants were removed (a much bigger problem) or " +
          "this parser needs updating.",
      );
    }
    return lines;
  }

  /** `describe("Invariant ...")` titles from grammar.spec.ts. */
  function pinnedInvariants(): readonly string[] {
    const source = read("src/direct-manipulation/grammar.spec.ts");
    return [...source.matchAll(/describe\(\s*"(Invariant [^"]+)"/g)].map((match) => match[1]!);
  }

  it("declares at least the three structural invariants", () => {
    const declared = declaredInvariants();
    expect(declared.length).toBeGreaterThanOrEqual(3);
    expect(declared.map((line) => line.split(":")[0])).toEqual(
      expect.arrayContaining(["Invariant A'", "Invariant D", "Invariant F'"]),
    );
  });

  it("pins every declared invariant as a describe with the SAME words", () => {
    const declared = declaredInvariants();
    const pinned = pinnedInvariants();
    const unpinned = declared.filter((sentence) => !pinned.includes(sentence));
    expect(unpinned, {
      message:
        "These invariants are declared in grammar.ts's header but no grammar.spec.ts describe " +
        `carries their exact words:\n  ${unpinned.join("\n  ")}\n` +
        "Reword the test name to match the invariant (or the invariant to match reality) — a " +
        "test name that has drifted from its invariant is a name with nothing behind it.",
    } as never).toEqual([]);
  });

  it("pins no invariant the header does not declare", () => {
    const declared = declaredInvariants();
    const pinned = pinnedInvariants();
    const undeclared = pinned.filter((sentence) => !declared.includes(sentence));
    expect(undeclared, {
      message:
        "These grammar.spec.ts describes claim to pin an invariant that grammar.ts does not " +
        `declare:\n  ${undeclared.join("\n  ")}\n` +
        "Declare it in the header, or stop calling it an invariant.",
    } as never).toEqual([]);
  });
});
