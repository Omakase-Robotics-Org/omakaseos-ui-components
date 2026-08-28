/**
 * @file Storybook stories for EditSnapGuide.
 *
 * One story per snap kind, which is the whole point: the four marks must be
 * distinguishable from each other at a glance, since they are the operator's
 * only report of what moved their coordinate and why.
 */
import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { EditSnapGuide } from "./EditSnapGuide";
import { EditHandle } from "./EditHandle";
import { DirectManipulationStoryCanvas } from "./DirectManipulationStoryCanvas";

const meta = {
  title: "DirectManipulation/EditSnapGuide",
  component: EditSnapGuide,
  tags: ["autodocs"],
  argTypes: {
    kind: {
      control: { type: "inline-radio" },
      options: ["vertex", "edge", "align", "grid"],
    },
  },
} satisfies Meta<typeof EditSnapGuide>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderGuide(args: ComponentProps<typeof EditSnapGuide>) {
  return (
    <DirectManipulationStoryCanvas>
      <line x1={20} y1={90} x2={160} y2={90} stroke="var(--ds-border)" strokeWidth={2} />
      <EditHandle x={140} y={40} state="idle" />
      <EditHandle x={90} y={60} state="dragging" />
      <EditSnapGuide {...args} />
    </DirectManipulationStoryCanvas>
  );
}

/** Caught an existing point: the sharpest mark of the four. */
export const Vertex: Story = {
  args: {
    at: { x: 140, y: 40 },
    kind: "vertex",
    from: { x: 90, y: 60 },
    to: { x: 140, y: 40 },
  },
  render: renderGuide,
};

/** Caught a position on a line. */
export const Edge: Story = {
  args: { at: { x: 90, y: 90 }, kind: "edge" },
  render: renderGuide,
};

/** Caught an axis shared with another point: the line IS the mark. */
export const Align: Story = {
  args: {
    at: { x: 90, y: 40 },
    kind: "align",
    from: { x: 140, y: 40 },
    to: { x: 40, y: 40 },
  },
  render: renderGuide,
};

/** Caught a declared grid intersection: the quietest mark. */
export const Grid: Story = {
  args: { at: { x: 60, y: 60 }, kind: "grid" },
  render: renderGuide,
};
