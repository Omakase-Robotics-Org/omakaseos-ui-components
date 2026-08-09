/**
 * @file Storybook stories for Panel.
 *
 * A titled section of a page grid — distinct from Card (a surface inside a
 * page). The grid stories show what `fullWidth` is for.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Panel } from "./Panel";
import { StatusBadge } from "./StatusBadge";
import { Button } from "./Button";

const meta = {
  title: "Status/Panel",
  component: Panel,
  tags: ["autodocs"],
  args: { title: "Robot State", children: "Panel body" },
  argTypes: { fullWidth: { control: "boolean" } },
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHeaderRight: Story = {
  args: {
    title: "Service controls",
    headerRight: <StatusBadge tone="success">running</StatusBadge>,
  },
};

export const WithHeaderControl: Story = {
  args: {
    title: "Data collection",
    headerRight: (
      <Button variant="neutral" size="sm">
        Refresh
      </Button>
    ),
  },
};

/** The layout Panel is built for: peers in a grid, one of them spanning it. */
export const InAGrid: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
      <Panel title="Robot state">One cell of the grid.</Panel>
      <Panel title="Network">Another cell.</Panel>
      <Panel title="Teleop session" fullWidth>
        fullWidth: spans every column of the grid it sits in.
      </Panel>
    </div>
  ),
};

/** `id` makes the panel an anchor target for in-page navigation. */
export const AnchorTarget: Story = {
  args: { id: "robot-state", title: "Robot state" },
};
