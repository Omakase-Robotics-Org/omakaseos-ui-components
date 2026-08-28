/**
 * @file Storybook stories for EditGhostHandle.
 *
 * One story per state. `target` is not decoration: during an insertion drag it
 * is the difference between "a point could go here" and "the point being
 * dragged lands here", and the two must not look alike.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { EditGhostHandle } from "./EditGhostHandle";
import { renderDirectManipulationGlyphInStoryCanvas } from "./DirectManipulationStoryCanvas";

const meta = {
  title: "DirectManipulation/EditGhostHandle",
  component: EditGhostHandle,
  tags: ["autodocs"],
  argTypes: {
    state: {
      control: { type: "inline-radio" },
      options: ["idle", "hover", "target"],
    },
  },
} satisfies Meta<typeof EditGhostHandle>;

export default meta;
type Story = StoryObj<typeof meta>;

const renderGhost = renderDirectManipulationGlyphInStoryCanvas(EditGhostHandle);

/** Coarse input's persistent midpoint, and fine input's Alt-held marker. */
export const Idle: Story = {
  args: { x: 90, y: 60, state: "idle" },
  render: renderGhost,
};

export const Hover: Story = {
  args: { x: 90, y: 60, state: "hover" },
  render: renderGhost,
};

/** The drop destination of a live insertion: solid, because it is happening. */
export const Target: Story = {
  args: { x: 90, y: 60, state: "target" },
  render: renderGhost,
};
