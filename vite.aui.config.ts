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
