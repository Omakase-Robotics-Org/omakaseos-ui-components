/**
 * @file Storybook stories for EditRemoveBadge.
 *
 * A coarse-input affordance: a fine pointer never sees this badge (it removes
 * with Alt-click, Delete, or the host's native control), which is what keeps a
 * destructive target from floating beside a precise gesture. The hover state is
 * catalogued for the coarse surface that is nonetheless being hovered.
 */
import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { EditRemoveBadge } from "./EditRemoveBadge";
import { DirectManipulationStoryCanvas } from "./DirectManipulationStoryCanvas";

const meta = {
  title: "DirectManipulation/EditRemoveBadge",
  component: EditRemoveBadge,
  tags: ["autodocs"],
  argTypes: {
    state: { control: { type: "inline-radio" }, options: ["idle", "hover"] },
  },
} satisfies Meta<typeof EditRemoveBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderBadge(args: ComponentProps<typeof EditRemoveBadge>) {
  return (
    <DirectManipulationStoryCanvas>
      <circle cx={90} cy={60} r={20} fill="var(--ds-surface)" stroke="var(--ds-border)" />
      <EditRemoveBadge {...args} />
    </DirectManipulationStoryCanvas>
  );
}

export const Idle: Story = {
  args: { x: 90, y: 60, state: "idle" },
  render: renderBadge,
};

/** Hovered: the danger register inverts, stating the outcome before the press. */
export const Hover: Story = {
  args: { x: 90, y: 60, state: "hover" },
  render: renderBadge,
};
