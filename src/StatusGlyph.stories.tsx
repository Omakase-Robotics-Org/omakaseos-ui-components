/**
 * @file Storybook stories for StatusGlyph.
 *
 * The interesting story is `AllTones`: the five registers side by side is the
 * only view that shows the thing the primitive is for — that they are told
 * apart without hue. Switch the toolbar's Host theme to
 * robot-inspection-web to see it under a fully desaturated palette.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { StatusGlyph } from "./StatusGlyph";
import type { GlyphTone } from "./StatusGlyph";

const meta = {
  title: "Status/StatusGlyph",
  component: StatusGlyph,
  tags: ["autodocs"],
  args: {
    tone: "success",
    ariaLabel: "OK",
  },
  argTypes: {
    tone: {
      control: { type: "inline-radio" },
      options: ["success", "danger", "warning", "neutral", "idle"],
    },
    size: { control: { type: "inline-radio" }, options: ["sm", "md", "lg"] },
  },
} satisfies Meta<typeof StatusGlyph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Danger: Story = { args: { tone: "danger", ariaLabel: "NG" } };

export const Idle: Story = { args: { tone: "idle", ariaLabel: "unchecked" } };

const TONE_NAMES: ReadonlyArray<{ tone: GlyphTone; name: string }> = [
  { tone: "success", name: "OK" },
  { tone: "danger", name: "NG" },
  { tone: "warning", name: "pending" },
  { tone: "neutral", name: "not applicable" },
  { tone: "idle", name: "unchecked" },
];

/** All five registers: fill, line style and mark, with no hue between them. */
export const AllTones: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
      {TONE_NAMES.map(({ tone, name }) => (
        <span
          key={tone}
          style={{
            display: "grid",
            gap: 6,
            justifyItems: "center",
            fontSize: 11,
            color: "var(--ds-text-muted)",
          }}
        >
          <StatusGlyph tone={tone} ariaLabel={name} />
          {tone}
        </span>
      ))}
    </div>
  ),
};

/** The three sizes are one drawing scaled — the mark tracks the diameter. */
export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <StatusGlyph tone="success" size="sm" ariaLabel="OK small" />
      <StatusGlyph tone="success" size="md" ariaLabel="OK medium" />
      <StatusGlyph tone="success" size="lg" ariaLabel="OK large" />
    </div>
  ),
};
