/**
 * @file Storybook stories for Avatar.
 *
 * The tile is generic. A dashboard can pass its own domain glyph through
 * `fallback`; this story shows that slot alongside the library's neutral
 * person silhouette and the four density-token sizes.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "./Avatar";
import type { AvatarSize } from "./Avatar";

const IMAGE_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const SIZES: readonly AvatarSize[] = ["xs", "sm", "md", "lg"];

const meta = {
  title: "Status/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  args: {
    url: null,
    name: "Operator",
    size: "md",
  },
  argTypes: {
    size: { control: { type: "inline-radio" }, options: SIZES },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Image: Story = {
  args: { url: IMAGE_URL, name: "Operator image" },
};

export const DefaultFallback: Story = {
  args: { url: null, name: "Operator fallback" },
};

export const CustomFallback: Story = {
  args: {
    url: null,
    name: "Operator custom fallback",
    fallback: <span style={{ fontWeight: 700 }}>OP</span>,
  },
};

export const AllSizes: Story = {
  args: { url: null, fallback: undefined },
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "end" }}>
      {SIZES.map((size) => (
        <span
          key={size}
          style={{ display: "grid", gap: 6, justifyItems: "center", color: "var(--ds-text-muted)" }}
        >
          <Avatar url={null} name={`Operator ${size}`} size={size} />
          <span>{size}</span>
        </span>
      ))}
    </div>
  ),
};
