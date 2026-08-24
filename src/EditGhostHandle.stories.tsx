/**
 * @file Storybook story for EditGhostHandle.
 *
 * The neutral SVG makes the dashed ring and its soft accent wash visible as
 * the insertion affordance it is, without requiring a host editor surface.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { EditGhostHandle } from "./EditGhostHandle";

const meta = {
  title: "DirectManipulation/EditGhostHandle",
  component: EditGhostHandle,
  tags: ["autodocs"],
} satisfies Meta<typeof EditGhostHandle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { x: 90, y: 60 },
  render: (args) => (
    <svg
      width="180"
      height="120"
      viewBox="0 0 180 120"
      style={{ background: "var(--ds-surface-inset)", border: "1px solid var(--ds-border)" }}
    >
      <EditGhostHandle {...args} />
    </svg>
  ),
};
