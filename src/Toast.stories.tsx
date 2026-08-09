/**
 * @file Storybook stories for Toast.
 *
 * One notification card per register, plus the closed state. The card does
 * not position itself — these stories render it in normal flow, which is
 * exactly how a host's viewport element stacks it.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Toast } from "./Toast";

const meta = {
  title: "Status/Toast",
  component: Toast,
  tags: ["autodocs"],
  args: { tone: "success", children: "Command accepted." },
  argTypes: {
    tone: {
      control: { type: "inline-radio" },
      options: ["success", "warning", "danger", "info", "neutral"],
    },
    open: { control: "boolean" },
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {};

/** It happened, but not as asked — the operator should look; nothing to retry. */
export const Warning: Story = {
  args: { tone: "warning", children: "Navigation accepted in degraded mode." },
};

/** It did not happen — the only register that interrupts (role="alert"). */
export const Danger: Story = {
  args: { tone: "danger", children: "Map switch failed: recording is still running." },
};

export const Info: Story = { args: { tone: "info", children: "Map switched to floor 2." } };

export const Neutral: Story = { args: { tone: "neutral", children: "Nothing to report." } };

/** Closed: faded out, slid away, and no longer taking pointer events. */
export const Closed: Story = { args: { open: false } };

/** Messages arrive with their own line breaks; the card keeps them. */
export const MultiLine: Story = {
  args: {
    tone: "danger",
    children: "Recording refused.\nThe robot is not on the map it was asked to extend.",
  },
};

export const AllTones: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12, justifyItems: "start" }}>
      <Toast tone="success">Command accepted.</Toast>
      <Toast tone="warning">Navigation accepted in degraded mode.</Toast>
      <Toast tone="danger">Map switch failed.</Toast>
      <Toast tone="info">Map switched to floor 2.</Toast>
      <Toast tone="neutral">Nothing to report.</Toast>
    </div>
  ),
};
