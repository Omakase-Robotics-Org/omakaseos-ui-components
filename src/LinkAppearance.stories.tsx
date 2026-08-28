/**
 * @file Storybook stories for LinkAppearance.
 *
 * No router in this package, so every story renders through the
 * `asChild`-omitted path (a plain `<a>`) — the same path a Storybook host
 * with no router in scope would use.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { LinkAppearance } from "./LinkAppearance";

const meta = {
  title: "Navigation/LinkAppearance",
  component: LinkAppearance,
  tags: ["autodocs"],
  args: {
    tone: "accent",
    children: "G1-042",
  },
  argTypes: {
    tone: { control: { type: "inline-radio" }, options: ["accent", "muted"] },
  },
} satisfies Meta<typeof LinkAppearance>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Accent: Story = {
  args: { tone: "accent", children: "Robot G1-042" },
};

export const Muted: Story = {
  args: { tone: "muted", children: "← Back to robots" },
};

export const AsChildOverPlainAnchor: Story = {
  args: { tone: "accent" },
  render: (args) => (
    <LinkAppearance {...args} asChild>
      <a href="/robots/g1-042" className="story-existing-class">
        G1-042 (asChild over an existing &lt;a&gt;)
      </a>
    </LinkAppearance>
  ),
};
