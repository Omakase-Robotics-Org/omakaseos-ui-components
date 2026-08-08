/**
 * @file Storybook stories for ReservedText.
 *
 * The point of this primitive is invisible in a static screenshot: the
 * empty and filled variants must occupy the same height. See the
 * `Both` story for the two side by side, and the demo harness /
 * `spec/robot-console-primitives.e2e.spec.ts` for the bounding-box proof.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { ReservedText } from "./ReservedText";

const meta = {
  title: "Status/ReservedText",
  component: ReservedText,
  tags: ["autodocs"],
  args: { children: "Guard rejected: arm is outside the safety envelope." },
} satisfies Meta<typeof ReservedText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithContent: Story = {};

export const Empty: Story = { args: { children: undefined } };

export const Warning: Story = { args: { tone: "warning" } };

export const TwoLines: Story = {
  args: {
    lines: 2,
    children:
      "A longer status line that wraps onto a second reserved line before it would start scrolling.",
  },
};

export const Both: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 8, border: "1px dashed var(--ds-border)", padding: 8 }}>
      <ReservedText tone="muted" />
      <ReservedText tone="warning">Guard rejected: arm is outside the safety envelope.</ReservedText>
    </div>
  ),
};
