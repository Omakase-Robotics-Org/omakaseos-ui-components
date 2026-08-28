/**
 * @file Storybook stories for Tooltip.
 *
 * Every story wraps in `TooltipProvider` — required unless `enabled={false}`
 * (see Tooltip.tsx's file header) — the same shared delay clock a real
 * consumer wraps its whole triggers group in once. `delayDuration` is kept
 * small here purely for a comfortable manual-hover demo; the real default
 * (radix's own 700ms) and the shared-clock skip behavior are pinned in
 * `Tooltip.spec.tsx` and `spec/overlay-tooltip.e2e.spec.ts`, not here.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Tooltip, TooltipProvider } from "./Tooltip";

const meta = {
  title: "Overlay/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  args: {
    label: "Battery 82%",
    side: "top",
    children: <button type="button">Hover or focus me</button>,
  },
  render: (args) => (
    <div style={{ padding: 64, display: "flex", justifyContent: "center" }}>
      <TooltipProvider delayDuration={150}>
        <Tooltip {...args} />
      </TooltipProvider>
    </div>
  ),
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Top: Story = {
  args: { side: "top" },
};

export const Right: Story = {
  args: { side: "right" },
};

export const Bottom: Story = {
  args: { side: "bottom" },
};

export const Left: Story = {
  args: { side: "left" },
};

/** `enabled={false}` — the trigger alone, no tooltip machinery at all. */
export const Disabled: Story = {
  args: { enabled: false },
};
