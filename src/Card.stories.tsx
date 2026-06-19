/**
 * @file Storybook stories for Card + CardHeader.
 *
 * Demonstrates both call shapes accepted by the library:
 *  - <Card title="..."> shorthand (omks-robo/web style)
 *  - <Card><CardHeader title="..." hint? right?/>...</Card>
 *    (status_server_webui style)
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader } from "./Card";
import { StatusBadge } from "./StatusBadge";

const meta = {
  title: "Status/Card",
  component: Card,
  tags: ["autodocs"],
  args: {
    title: "Robot State",
    children: "Card body content goes here.",
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TitleShorthand: Story = {};

export const TwoPiece: Story = {
  args: { title: undefined },
  render: () => (
    <Card>
      <CardHeader
        title="Robot State"
        hint="last update: 2s ago"
        right={
          <StatusBadge tone="success" pulse>
            Live
          </StatusBadge>
        }
      />
      <p style={{ margin: 0 }}>Body content goes here.</p>
    </Card>
  ),
};

export const NoHeader: Story = {
  args: { title: undefined, children: "A card without a header — just a bordered surface." },
};
