/**
 * @file Playwright config for the library's demo harness.
 *
 * The harness is the demo `vite dev` server. The spec verifies that the
 * library's basic components (Input, Select, Textarea, Heading, Toolbar,
 * Button, Checkbox, Switch, Slider) survive adverse layout conditions in
 * a real browser — the things vitest's jsdom cannot show: overflow
 * containment, text ellipsis, focus rings, and ARIA roles.
 *
 * Spawning the dev server is on the runner: this config does NOT manage
 * the lifecycle. The runner script (scripts/run-e2e.sh) starts vite,
 * waits for it, runs the spec, tears it down — same shape as
 * source/scripts/wt-e2e.sh.
 */
import { defineConfig } from "playwright/test";

const BASE_URL = process.env["LIB_E2E_BASE_URL"] ?? "http://localhost:5198";

export default defineConfig({
  testDir: "./spec",
  testMatch: /.*\.e2e\.spec\.ts$/,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
