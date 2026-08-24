/**
 * @file Storybook stories for EditHandle.
 *
 * Each story keeps the fragment inside a small, neutral SVG so the ring's
 * centered state scaling and optional heading tick are visible in isolation.
 */
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { EditHandle } from "./EditHandle";
import type { EditHandleProps } from "./EditHandle";

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

const renderHandle = (args: EditHandleProps) => (
  <Canvas>
    <EditHandle {...args} />
  </Canvas>
);

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
