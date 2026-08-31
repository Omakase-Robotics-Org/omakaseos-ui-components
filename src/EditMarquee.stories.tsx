/**
 * @file Storybook stories for EditMarquee.
 *
 * The neutral canvas carries a few handles so the rectangle can be seen doing
 * its job: enclosing some of them and not others. Both corner orders are shown,
 * because the component normalises them and a regression there would otherwise
 * only surface as an invisible rectangle mid-gesture.
 */
import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { EditMarquee } from "./EditMarquee";
import { EditHandle } from "./EditHandle";
import { DirectManipulationStoryCanvas } from "./DirectManipulationStoryCanvas";

const meta = {
  title: "DirectManipulation/EditMarquee",
  component: EditMarquee,
  tags: ["autodocs"],
} satisfies Meta<typeof EditMarquee>;

export default meta;
type Story = StoryObj<typeof meta>;

function renderMarquee(args: ComponentProps<typeof EditMarquee>) {
  return (
    <DirectManipulationStoryCanvas>
      <EditHandle x={50} y={40} kind="anchor" state="selected" />
      <EditHandle x={90} y={70} kind="anchor" state="selected" />
      <EditHandle x={150} y={95} kind="anchor" state="idle" />
      <EditMarquee {...args} />
    </DirectManipulationStoryCanvas>
  );
}

export const Default: Story = {
  args: { from: { x: 30, y: 25 }, to: { x: 115, y: 85 } },
  render: renderMarquee,
};

/** The pointer dragged up-left: the same rectangle, corners reversed. */
export const ReversedCorners: Story = {
  args: { from: { x: 115, y: 85 }, to: { x: 30, y: 25 } },
  render: renderMarquee,
};
