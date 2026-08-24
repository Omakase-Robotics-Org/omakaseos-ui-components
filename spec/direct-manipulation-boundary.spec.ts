/**
 * @file Static boundary checks for the direct-manipulation layer.
 *
 * The map surface is decorative SVG plus native controls alongside it. These
 * assertions keep it from quietly becoming a second synthetic widget or from
 * pulling renderer/application dependencies into the headless kernel.
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

  it("keeps the pure kernel free of React imports", () => {
    const pureFiles = [
      "src/direct-manipulation/geometry.ts",
      "src/direct-manipulation/hit-test.ts",
      "src/direct-manipulation/grammar.ts",
      "src/direct-manipulation/session.ts",
      "src/direct-manipulation/constants.ts",
    ];
    const violations = pureFiles.flatMap((file) => {
      const content = read(file);
      return /(?:from\s+|import\s*)["']react["']/.test(content) ? [file] : [];
    });
    expect(violations).toEqual([]);
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
