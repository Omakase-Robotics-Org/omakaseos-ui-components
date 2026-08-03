/**
 * @file Boundary contract — Tailwind v4 lives NOWHERE in this library.
 *
 * History: `src/aui/` (the vendored shadcn-style assistant-ui registry —
 * `Thread` / `Composer` / `MarkdownText` / `Tool` / `Reasoning` / `Voice`)
 * used to be the library's ONE bounded Tailwind exception — every other
 * surface (`Button`, `Card`, `MessageBubble`, `ConversationStage`, ...)
 * was always plain CSS Modules bound to `--ds-*` tokens, with no
 * Tailwind, no shadcn theme tokens. `src/aui/aui.css` brought in
 * Tailwind v4 + a `.aui-root`-scoped shadcn theme + preflight because the
 * vendored components were authored against Tailwind utility classes and
 * we shipped them (`dist/aui/`) as pre-built JS+CSS specifically so that
 * exception could stay LOCAL to this package's own build pipeline.
 *
 * The v0.9 migration (see `omksos_web/reports/aui-css-modules/README.md`)
 * removed that exception: every `src/aui/` component now styles itself
 * with a co-located `*.module.css` file, `aui.css` is plain CSS (shadcn
 * theme tokens as custom properties + the `.aui-root`-scoped preflight,
 * copied to plain selectors), and `cn()` is a bare clsx composer (no
 * `tailwind-merge`, nothing left to merge once class names are opaque
 * CSS-Module hashes instead of overlapping utility atoms). This spec's
 * premise inverted along with it: it now asserts Tailwind is NOT present
 * ANYWHERE in the package — no live `@import "tailwindcss..."`, no
 * `tailwind-merge` import, no Tailwind package in `package.json`, no
 * Tailwind-only class syntax in any component. A regression here
 * (someone reaching for a Tailwind utility class again, e.g. because
 * it's the fastest way to prototype a new aui component) is exactly the
 * drift this spec exists to catch — the whole point of the migration was
 * that `source/service` and `status_server_webui` consume this library
 * as plain CSS Modules with zero Tailwind toolchain coupling, and that
 * must stay true from here on.
 *
 * Historical mentions of Tailwind in code comments (explaining WHY a
 * class or pattern was translated the way it was, or documenting the
 * migration itself) are fine and expected — this spec only fails on
 * LIVE imports, dependencies, and class-composition syntax.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, relative, sep } from "node:path";

const root = resolve(__dirname, "..");
const srcDir = resolve(root, "src");
const demoDir = resolve(root, "demo");
const aliasesDir = resolve(root, "aliases");

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

describe("aui Tailwind boundary contract (post-migration: Tailwind lives NOWHERE)", () => {
  const srcSources = Array.from(walk(srcDir)).filter((p) =>
    /\.(ts|tsx|css)$/.test(p),
  );
  const demoSources = Array.from(walk(demoDir))
    .filter((p) => {
      const rel = relative(demoDir, p);
      const parts = rel.split(sep);
      return (
        /\.(ts|tsx|css|html)$/.test(p) &&
        !parts.includes("node_modules") &&
        !parts.includes("dist")
      );
    });
  const aliasSources = Array.from(walk(aliasesDir)).filter((p) =>
    /\.css$/.test(p),
  );
  const allSources = [...srcSources, ...demoSources, ...aliasSources];

  it('no CSS file imports Tailwind (no @import "tailwindcss..." / @tailwind directives anywhere)', () => {
    const offenders: string[] = [];
    for (const f of allSources) {
      if (!f.endsWith(".css")) {
        continue;
      }
      const content = readFileSync(f, "utf-8");
      if (
        /@import\s+["']tailwindcss(\/[A-Za-z0-9_.\-]+)?["']/.test(content) ||
        /@tailwind\s+(base|components|utilities)/.test(content)
      ) {
        offenders.push(relative(root, f));
      }
    }
    expect(offenders, {
      message:
        "A CSS file imports Tailwind. The v0.9 migration removed Tailwind from this package entirely — rewrite the file as plain CSS / CSS Modules + tokens instead of reintroducing the toolchain.",
    } as never).toEqual([]);
  });

  it("no TS/TSX file imports a Tailwind package", () => {
    const tailwindNamePatterns = [
      /from\s+["']tailwindcss(\/[^"']*)?["']/,
      /from\s+["']@tailwindcss\/[^"']+["']/,
      /require\s*\(\s*["']tailwindcss(\/[^"']*)?["']\s*\)/,
      /require\s*\(\s*["']@tailwindcss\/[^"']+["']\s*\)/,
    ];
    const offenders: string[] = [];
    for (const f of allSources) {
      if (f.endsWith(".css")) {
        continue;
      }
      const content = readFileSync(f, "utf-8");
      if (tailwindNamePatterns.some((re) => re.test(content))) {
        offenders.push(relative(root, f));
      }
    }
    expect(offenders, {
      message:
        "A TypeScript file imported a Tailwind package. Tailwind has no authoring pipeline in this package anymore — nothing should import it.",
    } as never).toEqual([]);
  });

  it("no source imports tailwind-merge (cn() is a plain clsx composer now)", () => {
    const offenders: string[] = [];
    for (const f of allSources) {
      if (f.endsWith(".css")) {
        continue;
      }
      const content = readFileSync(f, "utf-8");
      if (/from\s+["']tailwind-merge["']/.test(content)) {
        offenders.push(relative(root, f));
      }
    }
    expect(offenders, {
      message:
        "A source file imports tailwind-merge. src/aui/lib/cn.ts is a plain clsx composer post-migration — there is nothing left for tailwind-merge to resolve (CSS-Module class names don't have overlapping Tailwind-utility semantics), and the package no longer depends on it.",
    } as never).toEqual([]);
  });

  it("package.json carries no Tailwind package (dependency, devDependency, or peer)", () => {
    const pkg = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf-8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      peerDependenciesMeta?: Record<string, unknown>;
    };
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
      ...pkg.peerDependenciesMeta,
    };
    const offenders = Object.keys(allDeps).filter(
      (name) =>
        name === "tailwindcss" ||
        name === "tailwind-merge" ||
        name.startsWith("@tailwindcss/") ||
        name === "tw-animate-css" ||
        name === "tailwindcss-animate",
    );
    expect(offenders, {
      message:
        "package.json still declares a Tailwind-family package. None should remain after the v0.9 migration.",
    } as never).toEqual([]);
  });

  it("no aui component className uses Tailwind-only class syntax (variant prefixes / bracket selectors)", () => {
    // A cheap heuristic rather than a full Tailwind-class dictionary:
    // Tailwind's variant-prefix syntax (`hover:`, `focus-visible:`,
    // `dark:`, `data-[state=open]:`) and arbitrary-selector syntax
    // (`[&_svg]:`, `[&>button]:`) only ever mean anything to a Tailwind
    // content scanner — plain CSS Modules class names never contain a
    // bare `:` variant prefix or a `[...]:` bracket selector inside a
    // className string. Flag any occurrence in a className attribute.
    const suspiciousTailwindSyntax =
      /(?:^|[\s"'`{(])(?:hover|focus|focus-within|focus-visible|dark|disabled|active|aria-invalid|aria-disabled):[a-z]|data-\[[a-z-]+[=~^$*|]?=|\[&[_>[:][^\]]*\]:/;
    const offenders: string[] = [];
    for (const f of srcSources) {
      if (!f.endsWith(".tsx")) {
        continue;
      }
      const content = readFileSync(f, "utf-8");
      const classNameMatches = content.match(/className=\{[^;]*?\}|className="[^"]*"/g) ?? [];
      for (const snippet of classNameMatches) {
        if (suspiciousTailwindSyntax.test(snippet)) {
          offenders.push(`${relative(root, f)}: ${snippet.slice(0, 100)}`);
        }
      }
    }
    expect(offenders, {
      message:
        "Found Tailwind-only class syntax (variant prefixes / bracket selectors) in a className. Style with a co-located *.module.css file instead.",
    } as never).toEqual([]);
  });

  it("the surface root still mounts an `.aui-root` className (so the scoped preflight matches)", () => {
    // The preflight spec (`spec/aui-preflight-scope.spec.ts`) pins that
    // `aui.css` only resets elements under `.aui-root *`. That contract
    // has a second half: the Thread shell MUST mount with `aui-root` on
    // its root, or the preflight never reaches its consumers. Pin it —
    // post-migration, thread.tsx composes this literal string as one
    // argument to `cn(...)` rather than as the whole className, so match
    // any quoted string literal containing both tokens (in either order)
    // rather than requiring the className to be a single literal.
    const thread = resolve(srcDir, "aui/thread.tsx");
    const content = readFileSync(thread, "utf-8");
    const bothOrders =
      /["'`][^"'`]*\baui-root\b[^"'`]*\baui-thread-root\b[^"'`]*["'`]/.test(
        content,
      ) ||
      /["'`][^"'`]*\baui-thread-root\b[^"'`]*\baui-root\b[^"'`]*["'`]/.test(
        content,
      );
    expect(bothOrders, {
      message:
        "src/aui/thread.tsx no longer mounts the surface under `.aui-root`. The scoped preflight will not match — restore the className or update both this spec AND the preflight scope rules.",
    } as never).toBe(true);
  });

  it("the published aui CSS bundle exists and ships the scoped preflight (smoke)", () => {
    // The exports map declares `./aui/aui.css` → `dist/aui/aui.css`.
    // That file is committed (`.gitignore` negates `dist/aui/`), so a
    // bare clone of a release tag MUST ship it. If a refactor moves the
    // build output elsewhere without updating exports, consumers see
    // "Cannot find module" (the failure mode parent PoC #29 hit). Pin
    // the file presence + the scoped reset shape it carries — this no
    // longer depends on Tailwind at all, just on `src/aui/aui.css` being
    // built into `dist/aui/aui.css` by `bun run build:aui` (plain Vite,
    // see vite.aui.config.ts).
    const distAuiDir = resolve(root, "dist/aui");
    const css = readFileSync(resolve(distAuiDir, "aui.css"), "utf-8");
    expect(/\.aui-root[^{]*\{[^}]*box-sizing\s*:\s*border-box/.test(css), {
      message:
        "dist/aui/aui.css does not carry a `.aui-root`-scoped preflight. Run `bun run build:aui` and check src/aui/aui.css.",
    } as never).toBe(true);
  });
});
