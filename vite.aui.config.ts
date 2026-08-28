/**
 * @file Library-mode Vite config for the aui surface.
 *
 * v0.9 CSS Modules migration note: this used to be a JS-only build (a
 * separate `@tailwindcss/cli` invocation produced `dist/aui/aui.css`)
 * because Tailwind v4's content extractor crashed on backticked template
 * literals inside the surface when run under rolldown's lib pipeline.
 * That workaround is gone along with Tailwind itself — every component
 * now imports its own co-located `*.module.css`, and `src/aui/index.ts`
 * imports the plain `./aui.css` (tokens + scoped preflight) as a
 * side-effect. Vite's library mode extracts every CSS import reachable
 * from the entry into ONE stylesheet; `build.lib.cssFileName` below pins
 * its name so it lands at `dist/aui/aui.css`, matching the package.json
 * `./aui/aui.css` export unchanged from before.
 *
 * Bun script: `build:aui` runs this single config for both JS and CSS.
 *
 * Consumer integration (unchanged):
 *   import { Thread } from "@omakase-robotics/ui-components/aui";
 *   import "@omakase-robotics/ui-components/aui/aui.css";
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// This config only ever produces the SHIPPED `dist/aui` artifact — there is
// no dev-server use of it (the `dev` script points at plain `vite.config.ts`
// instead). Vite's own `resolveConfig` decides `isProduction` (and, through
// it, whether @vitejs/plugin-react emits `jsxDEV` calls) from
// `process.env.NODE_ENV === "production"` — NOT from `--mode` or the
// `build`/`serve` command (see `vite/dist/node/chunks/node.js`, the
// `isProduction` assignment). That reads whatever NODE_ENV the *calling*
// process happens to have, so `bun run build:aui` was non-deterministic:
// invoked from a plain shell it produced the committed production bundle,
// but invoked from `spec/aui-preflight-scope.spec.ts`'s `execSync("bun run
// build:aui")` inside vitest (which sets `NODE_ENV=test` on its own
// process, inherited by execSync's child) it silently produced a dev build
// (~88.9 kB, jsxDEV) instead of the production one (~60.7 kB), dirtying the
// committed `dist/aui/index.js` on every `bun run test`
// (`reports/aui-dist-dev-build-leak/`). Force it here, at the config
// itself, so every caller of this config — the `build:aui` script, a plain
// `vite build --config vite.aui.config.ts`, or this spec's execSync — gets
// the same deterministic production artifact regardless of ambient env.
process.env.NODE_ENV = "production";

const here = dirname(fileURLToPath(import.meta.url));

// Anything that is or could become a peer dependency must NOT be bundled
// into dist/. Every named import is preserved so the consumer's own copy
// is used (single React tree, single zustand store, etc.). Match by
// package name + sub-paths.
const externalPatterns: Array<RegExp> = [
  /^react($|\/)/,
  /^react-dom($|\/)/,
  /^@assistant-ui\//,
  /^lucide-react($|\/)/,
  /^radix-ui($|\/)/,
  /^@radix-ui\//,
  /^class-variance-authority($|\/)/,
  /^clsx($|\/)/,
  /^remark-gfm($|\/)/,
  /^zustand($|\/)/,
];

export default defineConfig({
  plugins: [
    react(),
    dts({
      entryRoot: resolve(here, "./src/aui"),
      outDir: resolve(here, "./dist/aui"),
      include: ["src/aui/**/*.ts", "src/aui/**/*.tsx"],
      // Storybook-only files (module-unit `*.stories.tsx` + the shared
      // `AuiStoryStage.tsx` mounting helper) live under src/aui/ so stories
      // sit next to the component they demo, but neither is part of the
      // published `./aui` surface — excluded so `bun run build:aui` doesn't
      // leak story .d.ts stubs into dist/aui/ on every story edit.
      exclude: ["src/aui/**/*.stories.tsx", "src/aui/AuiStoryStage.tsx"],
      tsconfigPath: resolve(here, "./tsconfig.json"),
    }),
  ],
  resolve: {
    alias: [
      { find: "@/lib/utils", replacement: resolve(here, "./src/aui/lib/cn.ts") },
      { find: "@/components/ui", replacement: resolve(here, "./src/aui/ui") },
      { find: "@/components/assistant-ui", replacement: resolve(here, "./src/aui") },
      { find: "@", replacement: resolve(here, "./src/aui") },
    ],
  },
  css: {
    modules: {
      localsConvention: "camelCase",
    },
  },
  build: {
    outDir: "dist/aui",
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: resolve(here, "./src/aui/index.ts"),
      name: "OmksAui",
      formats: ["es"],
      fileName: () => "index.js",
      // Pins the single extracted stylesheet's name so it lands at
      // `dist/aui/aui.css` (matching the `./aui/aui.css` package.json
      // export). Without this it falls back to the package.json `name`
      // field ("@omakase-robotics/ui-components" -> a nonsense filename).
      cssFileName: "aui",
    },
    rollupOptions: {
      external: (id) => externalPatterns.some((re) => re.test(id)),
    },
  },
});
