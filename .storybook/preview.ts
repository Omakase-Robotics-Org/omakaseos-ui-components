/**
 * @file Storybook preview configuration.
 *
 * Loads the library's neutral tokens once, and the demo harness's host
 * CSS so every story can swap between the three consuming hosts
 * (status_server_webui / @omks-robo/web / robot-inspection-web) via a
 * Storybook toolbar.
 *
 * The decorator wraps the story in a `<div class="host host--...">`
 * element matching one of the harness's host scopes; demo/hosts.css
 * already declares the alias variables under those class selectors,
 * so role-tinted bubbles, stage tiles, and bubble surfaces all resolve
 * through the chosen host's brand SoT without per-story wiring.
 *
 * Host id -> class / theme is a total Record rather than a ternary chain, so
 * a fourth host is a compile error here instead of a story that silently
 * renders under the wrong palette.
 */
import type { Preview, Decorator } from "@storybook/react";
import React from "react";
import "../src/tokens.css";
import "../demo/hosts.css";

const HOST_NAMES = {
  "status-server-webui": "status_server_webui (dark)",
  "omks-robo-web": "@omks-robo/web (light)",
  "robot-inspection-web": "robot-inspection-web (dark, desaturated)",
} as const;

type HostId = keyof typeof HOST_NAMES;

const HOST_SCOPES: Record<HostId, { className: string; theme?: "dark" }> = {
  "status-server-webui": { className: "host host--status-webui", theme: "dark" },
  "omks-robo-web": { className: "host host--omks-web" },
  "robot-inspection-web": { className: "host host--robot-inspection-web", theme: "dark" },
};

const withHost: Decorator = (Story, context) => {
  const host = (context.globals["host"] as HostId | undefined) ?? "omks-robo-web";
  const scope = HOST_SCOPES[host] ?? HOST_SCOPES["omks-robo-web"];
  return React.createElement(
    "div",
    {
      className: scope.className,
      "data-theme": scope.theme,
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
          { value: "robot-inspection-web", title: HOST_NAMES["robot-inspection-web"] },
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
          "Navigation",
          "Chat-log",
          "Live-stage",
          "DirectManipulation",
          "Aui",
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
