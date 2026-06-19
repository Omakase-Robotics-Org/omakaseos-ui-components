/**
 * @file Storybook configuration for @omakase-robotics/ui-components.
 *
 * Stories live next to the component implementation
 * (src/<Name>.stories.tsx) so they share their location with the
 * component, the unit spec, and the CSS module — easy to keep aligned.
 *
 * The four story categories (Status, Form, Chat-log, Live-stage)
 * mirror the library's published surface layers:
 *   - v0.1–v0.2: status primitives
 *   - v0.3:      form / layout primitives
 *   - v0.4:      conversation-log primitives (past-tense transcript)
 *   - v0.5:      live-conversation primitives (1:n stage)
 *
 * The `viteFinal` hook lets us keep the demo's host-aware CSS aliasing
 * working unchanged: each story decorator chooses a host class on the
 * <body>, and the alias variables in demo/hosts.css cascade in.
 */
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx|mdx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  typescript: {
    check: false,
    reactDocgen: "react-docgen-typescript",
  },
};

export default config;
