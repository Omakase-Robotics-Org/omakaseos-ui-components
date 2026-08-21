/**
 * @file Storybook stories for SegmentedMeter.
 *
 * The bar needs width to say anything, so every story is wrapped to a
 * realistic column measure.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { SegmentedMeter } from "./SegmentedMeter";
import type { MeterSegment } from "./SegmentedMeter";

const SHEET: readonly MeterSegment[] = [
  { id: "ok", value: 30, weight: "full" },
  { id: "ng", value: 8, weight: "strong" },
  { id: "pending", value: 4, weight: "medium" },
  { id: "na", value: 2, weight: "faint" },
];

const meta = {
  title: "Status/SegmentedMeter",
  component: SegmentedMeter,
  tags: ["autodocs"],
  args: {
    segments: SHEET,
    ariaLabel: "44 checks: 30 passed, 8 failed, 4 open, 2 excluded",
  },
  argTypes: {
    size: { control: { type: "inline-radio" }, options: ["sm", "md"] },
    total: { control: "number" },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SegmentedMeter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Thin: Story = { args: { size: "sm" } };

/** A larger total: the rows nobody has touched are the empty track, not a segment. */
export const WithUntouchedRemainder: Story = {
  args: { total: 60, ariaLabel: "44 of 60 checks recorded" },
};

/** Nothing counted yet — bare track, which is the honest drawing of an empty whole. */
export const Empty: Story = {
  args: { segments: [], ariaLabel: "no checks recorded" },
};

/** Two segments, and the ordering still reads: the weights are relative. */
export const TwoWay: Story = {
  args: {
    segments: [
      { id: "pass", value: 7, weight: "full" },
      { id: "fail", value: 3, weight: "medium" },
    ],
    ariaLabel: "10 checks: 7 passed, 3 failed",
  },
};
