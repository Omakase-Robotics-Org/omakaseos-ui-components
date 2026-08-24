/**
 * @file Storybook stories for EditHeadingKnob.
 *
 * Each state is composed inside a neutral SVG so the exact arm endpoint and
 * the knob's centered state scaling can be inspected by eye.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { EditHeadingKnob } from "./EditHeadingKnob";
import { renderDirectManipulationGlyphInStoryCanvas } from "./DirectManipulationStoryCanvas";

const meta = {
  title: "DirectManipulation/EditHeadingKnob",
  component: EditHeadingKnob,
  tags: ["autodocs"],
  argTypes: {
    state: {
      control: { type: "inline-radio" },
      options: ["idle", "hover", "dragging"],
    },
  },
} satisfies Meta<typeof EditHeadingKnob>;

export default meta;
type Story = StoryObj<typeof meta>;

const renderKnob = renderDirectManipulationGlyphInStoryCanvas(EditHeadingKnob);

export const Idle: Story = {
  args: { x: 40, y: 60, angle: -Math.PI / 5, armPx: 70, state: "idle" },
  render: renderKnob,
};

export const Hover: Story = {
  args: { x: 40, y: 60, angle: -Math.PI / 5, armPx: 70, state: "hover" },
  render: renderKnob,
};

export const Dragging: Story = {
  args: { x: 40, y: 60, angle: -Math.PI / 5, armPx: 70, state: "dragging" },
  render: renderKnob,
};
