/**
 * @file Storybook stories for StatusBadge.
 *
 * Demonstrates every supported tone, both call shapes (label= and
 * children), and the pulse + size variants. Renders under whichever
 * host theme the toolbar's Host switch selects.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { StatusBadge } from "./StatusBadge";

const meta = {
  title: "Status/StatusBadge",
  component: StatusBadge,
  tags: ["autodocs"],
  args: {
    tone: "success",
    children: "Live",
  },
  argTypes: {
    tone: {
      control: { type: "inline-radio" },
      options: ["success", "warning", "danger", "info", "neutral"],
    },
    size: { control: { type: "inline-radio" }, options: [undefined, "sm", "md"] },
    pulse: { control: "boolean" },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pulse: Story = { args: { pulse: true } };

export const Small: Story = { args: { size: "sm" } };

export const LabelProp: Story = {
  args: { children: undefined, label: "Live (via label= prop)" },
};

export const AllTones: Story = {
  args: { children: undefined },
  render: () => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <StatusBadge tone="success">success</StatusBadge>
      <StatusBadge tone="warning">warning</StatusBadge>
      <StatusBadge tone="danger">danger</StatusBadge>
      <StatusBadge tone="info">info</StatusBadge>
      <StatusBadge tone="neutral">neutral</StatusBadge>
      <StatusBadge tone="success" pulse>
        live
      </StatusBadge>
    </div>
  ),
};
