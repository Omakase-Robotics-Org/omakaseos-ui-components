/**
 * @file Storybook stories for SignalBars.
 *
 * A presentational primitive over a 0-100 link-quality number. There is no
 * "unknown" variant here on purpose — the source app's contract is that a
 * caller with no signal reading simply does not render this component (see
 * the demo harness for that pattern).
 */
import type { Meta, StoryObj } from "@storybook/react";
import { SignalBars } from "./SignalBars";

const meta = {
  title: "Status/SignalBars",
  component: SignalBars,
  tags: ["autodocs"],
  args: { signal: 60 },
  argTypes: {
    signal: { control: { type: "range", min: 0, max: 100, step: 5 } },
  },
} satisfies Meta<typeof SignalBars>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllLevels: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
      <SignalBars signal={0} />
      <SignalBars signal={25} />
      <SignalBars signal={50} />
      <SignalBars signal={75} />
      <SignalBars signal={100} />
    </div>
  ),
};
