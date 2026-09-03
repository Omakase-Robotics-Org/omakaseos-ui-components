/**
 * @file Storybook stories for BrandLogo.
 *
 * The mark itself — one fixed-size, fixed-color square "O" seal, plus the
 * optional `alt` override a host may pass for extra specificity. See
 * `BrandLogoSlot.stories.tsx` for how it mounts inside a real surface
 * rhythm (sidebar / rail / header row).
 */
import type { Meta, StoryObj } from "@storybook/react";
import { BrandLogo } from "./BrandLogo";

const meta = {
  title: "Brand/BrandLogo",
  component: BrandLogo,
  tags: ["autodocs"],
  args: {},
} satisfies Meta<typeof BrandLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomAlt: Story = {
  args: { alt: "Omakase Robotics Dashboard" },
};

/** The mark at a few surface scales, to check it stays crisp — it is a
 *  fixed-size mark (28px), so scaling is done by the wrapping element. */
export const AtSeveralScales: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
      {[1, 2, 4].map((scale) => (
        <div key={scale} style={{ transform: `scale(${scale})`, transformOrigin: "left center" }}>
          <BrandLogo />
        </div>
      ))}
    </div>
  ),
};
