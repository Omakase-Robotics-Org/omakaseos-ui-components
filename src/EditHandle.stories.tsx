/**
 * @file Storybook stories for EditHandle.
 *
 * Each story keeps the fragment inside a small, neutral SVG so the ring's
 * centered state scaling and optional heading tick are visible in isolation.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { EditHandle } from "./EditHandle";
import { renderDirectManipulationGlyphInStoryCanvas } from "./DirectManipulationStoryCanvas";

const meta = {
  title: "DirectManipulation/EditHandle",
  component: EditHandle,
  tags: ["autodocs"],
  argTypes: {
    state: {
      control: { type: "inline-radio" },
      options: ["idle", "hover", "selected", "dragging"],
    },
  },
} satisfies Meta<typeof EditHandle>;

export default meta;
type Story = StoryObj<typeof meta>;

const renderHandle = renderDirectManipulationGlyphInStoryCanvas(EditHandle);

export const Idle: Story = {
  args: { x: 90, y: 60, state: "idle" },
  render: renderHandle,
};

export const Hover: Story = {
  args: { x: 90, y: 60, state: "hover" },
  render: renderHandle,
};

export const Selected: Story = {
  args: { x: 90, y: 60, state: "selected" },
  render: renderHandle,
};

export const Dragging: Story = {
  args: { x: 90, y: 60, state: "dragging", heading: -Math.PI / 4 },
  render: renderHandle,
};
