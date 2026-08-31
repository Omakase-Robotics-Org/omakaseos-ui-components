/**
 * @file Storybook stories for EditRubberBand.
 *
 * Both states appear side by side in the catalog because their difference is
 * the whole contract: if a constrained band cannot be told from a free one, the
 * modifier is invisible until the click has already committed the point.
 */
import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { EditRubberBand } from "./EditRubberBand";
import { EditHandle } from "./EditHandle";
import { DirectManipulationStoryCanvas } from "./DirectManipulationStoryCanvas";

const meta = {
  title: "DirectManipulation/EditRubberBand",
  component: EditRubberBand,
  tags: ["autodocs"],
  argTypes: {
    state: { control: { type: "inline-radio" }, options: ["free", "constrained"] },
  },
} satisfies Meta<typeof EditRubberBand>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderBand(args: ComponentProps<typeof EditRubberBand>) {
  return (
    <DirectManipulationStoryCanvas>
      <polyline
        points="30,90 60,60"
        fill="none"
        stroke="var(--ds-accent)"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <EditHandle x={30} y={90} kind="anchor" state="idle" />
      <EditHandle x={60} y={60} kind="anchor" state="primary" />
      <EditRubberBand {...args} />
    </DirectManipulationStoryCanvas>
  );
}

export const Free: Story = {
  args: { from: { x: 60, y: 60 }, to: { x: 135, y: 35 }, state: "free" },
  render: renderBand,
};

/** Shift held: the leg is on a 45-degree ray and says so by weight. */
export const Constrained: Story = {
  args: { from: { x: 60, y: 60 }, to: { x: 120, y: 30 }, state: "constrained" },
  render: renderBand,
};

/** An area being drawn also previews the leg back to its first corner. */
export const ClosingAnArea: Story = {
  args: {
    from: { x: 60, y: 60 },
    to: { x: 135, y: 35 },
    state: "free",
    closeTo: { x: 30, y: 90 },
  },
  render: renderBand,
};
