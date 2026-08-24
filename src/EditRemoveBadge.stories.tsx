/**
 * @file Storybook story for EditRemoveBadge.
 *
 * The small neutral SVG shows the default upper-right placement and the
 * danger background / foreground contrast without any surrounding editor.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { EditRemoveBadge } from "./EditRemoveBadge";

const meta = {
  title: "DirectManipulation/EditRemoveBadge",
  component: EditRemoveBadge,
  tags: ["autodocs"],
} satisfies Meta<typeof EditRemoveBadge>;

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
      <circle cx={90} cy={60} r={20} fill="var(--ds-surface)" stroke="var(--ds-border)" />
      <EditRemoveBadge {...args} />
    </svg>
  ),
};
