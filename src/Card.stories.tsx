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
 * v0.12 — elevation is not nested. Both columns are the same `<Card title=…>`
 * call; the right-hand one merely sits in a `Panel` body, and the ancestor rule
 * drops its shadow and steps its border down to `--ds-border-subtle`. A Panel
 * is the elevation; the Cards inside it are division. Nothing at the call site
 * says so — nesting is stated by where the card is.
 */
export const InsideAPanel: Story = {
  args: { title: undefined },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
      <Card title="Prompt">Directly on the page: this card floats.</Card>
      <Panel title="Conversation state">
        <div style={{ display: "grid", gap: 12 }}>
          <Card title="Prompt">Inside a panel body: grouping, not elevation.</Card>
          <Card title="Turn">A second grouping in the same section.</Card>
        </div>
      </Panel>
    </div>
  ),
};
