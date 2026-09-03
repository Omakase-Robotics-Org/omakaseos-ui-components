/**
 * @file Storybook stories for BrandLogoSlot.
 *
 * The mount rhythm: `inline` above a nav icon column, `centered` in a
 * collapsed rail, `header` on a wide row. Wrap each in a shape that mimics
 * its real host container so the gutter/alignment claims in
 * `BrandLogoSlot.module.css` are visible, not just present.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { BrandLogoSlot } from "./BrandLogoSlot";
import type { BrandLogoSlotVariant } from "./BrandLogoSlot";

const VARIANTS: readonly BrandLogoSlotVariant[] = ["inline", "centered", "header"];

const meta = {
  title: "Brand/BrandLogoSlot",
  component: BrandLogoSlot,
  tags: ["autodocs"],
  args: { variant: "header" },
  argTypes: {
    variant: { control: { type: "inline-radio" }, options: VARIANTS },
  },
} satisfies Meta<typeof BrandLogoSlot>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * `inline` above a 12px-padded nav column of 20px icons — the standard
 * sidebar layout the logo's center aligns with (see the file header's
 * 34px math).
 */
export const Inline: Story = {
  args: { variant: "inline" },
  render: (args) => (
    <div style={{ width: 220, background: "var(--ds-surface)", border: "1px solid var(--ds-border)" }}>
      <BrandLogoSlot {...args} />
      <div style={{ padding: 12, display: "grid", gap: 8 }}>
        {["Robots", "Sites", "Inventory"].map((label) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 20, height: 20, background: "var(--ds-control-bg)", borderRadius: 4 }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

/** `centered` — the collapsed-rail sibling of `inline`, no icon column to
 *  line up with. */
export const Centered: Story = {
  args: { variant: "centered" },
  render: (args) => (
    <div style={{ width: 56, background: "var(--ds-surface)", border: "1px solid var(--ds-border)" }}>
      <BrandLogoSlot {...args} />
    </div>
  ),
};

/** `header` — a wide row where the header itself owns padding and the
 *  gap to its neighbors (no slot-owned gutter). */
export const Header: Story = {
  args: { variant: "header" },
  render: (args) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 12,
        background: "var(--ds-surface)",
        border: "1px solid var(--ds-border)",
      }}
    >
      <BrandLogoSlot {...args} />
      <span style={{ fontWeight: 600 }}>Staff Console</span>
    </div>
  ),
};

export const CustomAlt: Story = {
  args: { variant: "header", alt: "Omakase Robotics Dashboard" },
};
