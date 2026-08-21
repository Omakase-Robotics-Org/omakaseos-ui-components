/**
 * @file Storybook stories for RankChip.
 *
 * `AllRanks` is the story that matters: filled / outlined / dashed has to read
 * as an ordering with no hue involved. Switch the toolbar's Host theme to
 * robot-inspection-web for the palette it was designed against.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { RankChip } from "./RankChip";

const meta = {
  title: "Status/RankChip",
  component: RankChip,
  tags: ["autodocs"],
  args: {
    rank: "high",
    children: "A",
  },
  argTypes: {
    rank: { control: { type: "inline-radio" }, options: ["high", "medium", "low"] },
    size: { control: { type: "inline-radio" }, options: ["sm", "md"] },
  },
} satisfies Meta<typeof RankChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Medium: Story = { args: { rank: "medium", children: "B" } };

export const Low: Story = { args: { rank: "low", children: "C" } };

export const LabelProp: Story = { args: { children: undefined, label: "A" } };

/** The ordering, as weight: filled > outlined > dashed. */
export const AllRanks: Story = {
  args: { children: undefined },
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <RankChip rank="high" ariaLabel="rank A">A</RankChip>
      <RankChip rank="medium" ariaLabel="rank B">B</RankChip>
      <RankChip rank="low" ariaLabel="rank C">C</RankChip>
    </div>
  ),
};

/** Any short notation: the rank drives the weight, the caller the characters. */
export const OtherNotations: Story = {
  args: { children: undefined },
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <RankChip rank="high" ariaLabel="高">高</RankChip>
      <RankChip rank="medium" ariaLabel="中">中</RankChip>
      <RankChip rank="low" ariaLabel="低">低</RankChip>
      <RankChip rank="high" size="sm" ariaLabel="severity 1">1</RankChip>
      <RankChip rank="medium" size="sm" ariaLabel="severity 2">2</RankChip>
      <RankChip rank="low" size="sm" ariaLabel="severity 3">3</RankChip>
    </div>
  ),
};
