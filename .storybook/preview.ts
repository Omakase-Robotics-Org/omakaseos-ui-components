/**
 * @file Storybook preview configuration.
 *
 * Loads the library's neutral tokens once, and the demo harness's host
 * CSS so every story can swap between the two consuming hosts
 * (status_server_webui / @omks-robo/web) via a Storybook toolbar.
 *
 * The decorator wraps the story in a `<div class="host host--...">`
 * element matching one of the harness's host scopes; demo/hosts.css
 * already declares the alias variables under those class selectors,
 * so role-tinted bubbles, stage tiles, and bubble surfaces all resolve
 * through the chosen host's brand SoT without per-story wiring.
 */
import type { Preview, Decorator } from "@storybook/react";
import React from "react";
import "../src/tokens.css";
import "../demo/hosts.css";

const HOST_NAMES = {
  "status-server-webui": "status_server_webui (dark)",
  "omks-robo-web": "@omks-robo/web (light)",
} as const;

type HostId = keyof typeof HOST_NAMES;

const withHost: Decorator = (Story, context) => {
  const host = (context.globals["host"] as HostId | undefined) ?? "omks-robo-web";
  const className = host === "status-server-webui" ? "host host--status-webui" : "host host--omks-web";
  const themeAttr = host === "status-server-webui" ? "dark" : undefined;
  return React.createElement(
    "div",
    {
      className,
      "data-theme": themeAttr,
      style: { padding: 24, minHeight: "100vh" },
    },
    React.createElement(Story, null),
  );
};

const preview: Preview = {
  globalTypes: {
    host: {
      name: "Host theme",
      description: "Which consuming app's brand alias to render under",
      defaultValue: "omks-robo-web",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "omks-robo-web", title: HOST_NAMES["omks-robo-web"] },
          { value: "status-server-webui", title: HOST_NAMES["status-server-webui"] },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: "padded",
    controls: { expanded: true, sort: "alpha" },
    options: {
      storySort: {
        order: [
          "Status",
          "Form",
          "Chat-log",
          "Live-stage",
        ],
      },
    },
    a11y: {
      config: { rules: [] },
    },
  },
  decorators: [withHost],
};

export default preview;
