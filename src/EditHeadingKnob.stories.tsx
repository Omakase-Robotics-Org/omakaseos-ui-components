/**
 * @file Storybook stories for EditHeadingKnob.
 *
 * Each state is composed inside a neutral SVG so the exact arm endpoint and
 * the knob's centered state scaling can be inspected by eye.
 */
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { EditHeadingKnob } from "./EditHeadingKnob";
import type { EditHeadingKnobProps } from "./EditHeadingKnob";

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

function Canvas({ children }: { children: ReactNode }) {
  return (
    <svg
      width="180"
      height="120"
      viewBox="0 0 180 120"
      style={{ background: "var(--ds-surface-inset)", border: "1px solid var(--ds-border)" }}
    >
      {children}
    </svg>
  );
}

const renderKnob = (args: EditHeadingKnobProps) => (
  <Canvas>
    <EditHeadingKnob {...args} />
  </Canvas>
);

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
