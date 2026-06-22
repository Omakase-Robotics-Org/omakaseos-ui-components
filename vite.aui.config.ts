/**
 * @file Library-mode Vite config for the v0.6 aui surface (JS only).
 *
 * Why JS-only here:
 *   We tried the obvious path — `@tailwindcss/vite` plugin + CSS imported
 *   from `index.ts` so vite library mode would inline+emit `aui.css`.
 *   Tailwind v4's content extractor crashed on backticked template
 *   literals inside the surface (e.g. `${ANIMATION_DURATION}ms`)
 *   when running under rolldown's lib pipeline ("Unterminated
 *   string: ``"). The same exact CSS + components compile fine in
 *   normal Vite app mode (the PoC builds green every time). Splitting
 *   the CSS off to `@tailwindcss/cli` keeps the JS library build small
 *   and lets the CSS pipeline use the engine's first-class entry path —
 *   no rolldown CSS-in-JS plugin layering, no vite-lib-mode quirks.
 *
 * Bun script that drives the two halves: `build:aui` calls this config
 * for JS, then `build:aui:css` runs `@tailwindcss/cli` for the CSS, and
 * both emit into `dist/aui/`.
 *
 * Consumer integration:
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
  /^tailwind-merge($|\/)/,
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
  build: {
    outDir: "dist/aui",
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: resolve(here, "./src/aui/index.ts"),
      name: "OmksAui",
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: (id) => externalPatterns.some((re) => re.test(id)),
    },
  },
});
