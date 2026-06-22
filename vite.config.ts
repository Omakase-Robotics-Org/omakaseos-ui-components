/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: "demo",
  plugins: [react(), tailwindcss()],
  resolve: {
    // The vendored shadcn / assistant-ui registry components target the
    // canonical `@/...` paths from `npx shadcn add`. Mirror them onto the
    // library's actual layout so the registry components keep their
    // upstream form (helps refresh-from-registry). Order matters:
    // specific entries before the catch-all `@`.
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
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["../vitest.setup.ts"],
    include: [
      "../src/**/*.spec.{ts,tsx}",
      "../spec/**/*.spec.{ts,tsx}",
    ],
    // Playwright e2e specs co-located under spec/ (`*.e2e.spec.ts`) are run
    // by `bun run test:e2e`, not by vitest — exclude them here so unit
    // surface specs in the same dir are still picked up.
    exclude: ["**/node_modules/**", "../spec/**/*.e2e.spec.ts"],
  },
});
