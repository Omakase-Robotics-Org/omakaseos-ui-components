/**
 * @file Boundary contract — Tailwind v4 lives ONLY inside `src/aui/`.
 *
 * The library shipped four kinds of stylesheets historically:
 *   - `*.module.css` for v0.1-v0.5 primitives (Button, Card, Toolbar,
 *     MessageBubble, Transcript, ConversationStage, ...). Pure CSS Modules
 *     bound to `--ds-*` design tokens. No Tailwind, no shadcn theme tokens.
 *   - `aliases/*.css` mapping consumer brand tokens onto `--ds-*`.
 *   - `tokens.css` with the `--ds-*` defaults.
 *   - **NEW in v0.6**: `src/aui/aui.css` — Tailwind v4 + shadcn theme
 *     tokens, scoped under `.aui-root`. Required because the vendored
 *     shadcn-style assistant-ui registry components are authored against
 *     Tailwind utility classes; we don't re-author them in CSS Modules.
 *
 * The Tailwind exception is BOUNDED. Anywhere else in the library
 * (Button, Card, ConversationStage, MessageBubble, ...) using a
 * Tailwind utility class or pulling Tailwind into a non-aui stylesheet
 * is a contract break. This spec catches that drift on every CI run.
 *
 * Rationale (recorded so future maintainers don't relax the rules
 * without realizing what they cost):
 *   - The legacy v0.4/v0.5 surfaces ship as TS source. Their consumers
 *     (`source/packages/web`, status_server_webui) DO NOT have a
 *     Tailwind toolchain in their Vite stack — they consume CSS Modules
 *     directly. If a v0.4 component starts emitting Tailwind class
 *     names, those classes never resolve at the consumer (no Tailwind
 *     content scan), and the component renders unstyled.
 *   - The aui surface ships as **pre-built JS+CSS** under `dist/aui/`
 *     precisely because Tailwind needs an authoring pipeline, and we
 *     keep that pipeline LOCAL to the package. Pulling Tailwind back
 *     into the v0.4 sources would re-introduce the toolchain coupling
 *     the dist/aui split was designed to remove.
 *   - The aui preflight is scoped under `.aui-root`
 *     (see omksos_web/reports/ui-components-aui-tailwind-preflight-scope/).
 *     If a non-aui component starts mounting under `.aui-root`, or if
 *     Tailwind class names start leaking out of `src/aui/`, the
 *     consumer's body web app surfaces (dialog, button, headings) get
 *     clobbered by the reset. We pin both directions here.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, relative, sep } from "node:path";

const root = resolve(__dirname, "..");
const srcDir = resolve(root, "src");
const auiDir = resolve(root, "src/aui");
const distAuiDir = resolve(root, "dist/aui");

/** Walk a directory recursively and yield files. Skips hidden + symlinks. */
function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) {continue;}
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
  // Outside if relative starts with `..` or is absolute.
  return r.length > 0 && !r.startsWith("..") && !r.startsWith(sep);
}

describe("aui Tailwind boundary contract", () => {
  /** All TS / TSX / CSS files under `src/`. */
  const allSources = Array.from(walk(srcDir)).filter((p) =>
    /\.(ts|tsx|css)$/.test(p),
  );
  const nonAuiSources = allSources.filter((p) => !isInsideAui(p));
  const auiSources = allSources.filter(isInsideAui);

  it("Tailwind imports stay inside src/aui/ (no @import \"tailwindcss\" / @import \"tailwindcss/...\" outside)", () => {
    const offenders: string[] = [];
    for (const f of nonAuiSources) {
      if (!f.endsWith(".css")) {continue;}
      const content = readFileSync(f, "utf-8");
      // Match the Tailwind v4 catch-all import OR any layered subimport.
      // We deliberately match BOTH the bare and the layered forms here
      // so that a future maintainer pulling in only `theme` or only
      // `utilities` from outside `src/aui/` still trips this rule.
      if (
        /@import\s+["']tailwindcss(\/[A-Za-z0-9_.\-]+)?["']/.test(content) ||
        /@tailwind\s+(base|components|utilities)/.test(content)
      ) {
        offenders.push(relative(root, f));
      }
    }
    expect(offenders, {
      message:
        "Non-aui CSS files imported Tailwind. Move the file under src/aui/, or rewrite it as CSS Modules + --ds-* tokens.",
    } as never).toEqual([]);
  });

  it("Tailwind devDependencies are referenced ONLY by build scripts and aui sources", () => {
    // package.json references tailwindcss / @tailwindcss/cli for the
    // `build:aui:css` script — that's the canonical, single point of
    // contact. Nothing under `src/` outside `src/aui/` should `import`
    // (or `require`) any Tailwind package.
    const tailwindNamePatterns = [
      /from\s+["']tailwindcss(\/[^"']*)?["']/,
      /from\s+["']@tailwindcss\/[^"']+["']/,
      /require\s*\(\s*["']tailwindcss(\/[^"']*)?["']\s*\)/,
      /require\s*\(\s*["']@tailwindcss\/[^"']+["']\s*\)/,
    ];
    const offenders: string[] = [];
    for (const f of nonAuiSources) {
      if (f.endsWith(".css")) {continue;}
      const content = readFileSync(f, "utf-8");
      if (tailwindNamePatterns.some((re) => re.test(content))) {
        offenders.push(relative(root, f));
      }
    }
    expect(offenders, {
      message:
        "Non-aui TypeScript files imported Tailwind. The aui surface is the ONLY in-package consumer of Tailwind.",
    } as never).toEqual([]);
  });

  it("Tailwind-utility class composition (cn / clsx / twMerge / class-variance-authority) stays inside src/aui/", () => {
    // The legacy v0.4/v0.5 components style themselves through
    // `*.module.css` + `--ds-*` tokens. They have no business reaching
    // for `cn`, `clsx`, `tailwind-merge`, or `cva` — those exist to
    // compose Tailwind utility classes, which by contract live only
    // under src/aui/. A non-aui import of any of these is a smell
    // that someone is trying to write Tailwind outside the boundary.
    const utilImportPatterns = [
      /from\s+["']clsx["']/,
      /from\s+["']tailwind-merge["']/,
      /from\s+["']class-variance-authority["']/,
      // The aui surface re-exports `cn` from the library, but that
      // re-export is ONLY meant for consumers (and IS imported via the
      // /aui sub-entry, not from inside the library). A non-aui file
      // pulling `cn` from `@omakase-robotics/ui-components/aui` would
      // also be wrong.
      /from\s+["']@omakase-robotics\/ui-components\/aui(\/[^"']*)?["']/,
    ];
    const offenders: string[] = [];
    for (const f of nonAuiSources) {
      if (f.endsWith(".css")) {continue;}
      const content = readFileSync(f, "utf-8");
      if (utilImportPatterns.some((re) => re.test(content))) {
        offenders.push(relative(root, f));
      }
    }
    expect(offenders, {
      message:
        "Non-aui sources reached for Tailwind-class composition utilities. Style legacy components with *.module.css + --ds-* tokens.",
    } as never).toEqual([]);
  });

  it("Tailwind authoring is OPT-IN: at least one aui file actually uses it", () => {
    // Belt-and-suspenders: if someone deletes the aui Tailwind surface
    // entirely, the four assertions above still pass trivially. This
    // assertion makes the boundary spec FAIL when the boundary is
    // empty — a sign the boundary stopped being a real contract.
    const auiUsesTailwind = auiSources.some((f) => {
      if (!f.endsWith(".css")) {return false;}
      const content = readFileSync(f, "utf-8");
      return /@import\s+["']tailwindcss\/[a-z]+\.css["']/.test(content);
    });
    expect(auiUsesTailwind, {
      message:
        "src/aui/ is supposed to be the Tailwind surface, but no aui CSS imports tailwindcss layered entries. Did the boundary collapse?",
    } as never).toBe(true);
  });

  it("the surface root mounts an `.aui-root` className (so the scoped preflight matches)", () => {
    // The preflight spec
    // (`spec/aui-preflight-scope.spec.ts`) pins that `aui.css` only
    // resets elements under `.aui-root *`. That contract has a second
    // half: the Thread shell MUST mount with `aui-root` on its root, or
    // the preflight never reaches its consumers. Pin it.
    const thread = resolve(auiDir, "thread.tsx");
    const content = readFileSync(thread, "utf-8");
    expect(
      /className\s*=\s*["'`][^"'`]*\baui-root\b[^"'`]*["'`]/.test(content),
      {
        message:
          "src/aui/thread.tsx no longer mounts the surface under `.aui-root`. The scoped preflight will not match — restore the className or update both this spec AND the preflight scope rules.",
      } as never,
    ).toBe(true);
  });

  it("the published aui CSS bundle exists and ships the scoped preflight (smoke)", () => {
    // The exports map declares `./aui/aui.css` → `dist/aui/aui.css`.
    // That file is committed (`.gitignore` negates `dist/aui/`), so a
    // bare clone of a release tag MUST ship it. If a refactor moves
    // the build output elsewhere without updating exports, consumers
    // see "Cannot find module" (the failure mode parent PoC #29 hit).
    // Pin the file presence + the scoped reset shape it carries.
    const css = readFileSync(resolve(distAuiDir, "aui.css"), "utf-8");
    expect(/\.aui-root[^{]*\{[^}]*box-sizing\s*:\s*border-box/.test(css), {
      message:
        "dist/aui/aui.css does not carry a `.aui-root`-scoped preflight. The boundary fix from v0.6.1 was lost.",
    } as never).toBe(true);
  });
});
