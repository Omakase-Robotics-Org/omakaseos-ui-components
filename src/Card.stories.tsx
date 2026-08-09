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
import { Panel } from "./Panel";
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

/**
 * v0.13 — a nested Card is a section. Both columns are the same `<Card title=…>`
 * call; the right-hand ones merely sit in a `Panel` body, where the ancestor
 * rule takes away everything that makes a Card a *surface* (outline, fill,
 * lift, corner) and puts the section rhythm where the frame's inset was. A
 * Panel is the container; the Cards inside it are its sections, held apart by
 * space and told apart by their headings. Nothing at the call site says so —
 * nesting is stated by where the card is.
 *
 * Three sections rather than two, because the rhythm is the point: whether a
 * heading groups with what follows it is only readable once a section has a
 * neighbour on each side.
 */
export const InsideAPanel: Story = {
  args: { title: undefined },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
      <Card title="Prompt">Directly on the page: this card is a surface.</Card>
      <Panel title="Conversation state">
        <Card title="Prompt">Inside a panel body: a section, not a surface.</Card>
        <Card title="Turn">A second section of the same panel.</Card>
        <Card title="Language override">A third, on the same rhythm.</Card>
      </Panel>
    </div>
  ),
};
