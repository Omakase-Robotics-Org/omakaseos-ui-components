/**
 * @file Storybook stories for Section + SectionHeader.
 *
 * Status layer. Demonstrates both call shapes the library accepts for a headed
 * block — the same pair `Card` accepts:
 *  - <Section title="..."> shorthand
 *  - <Section><SectionHeader title="..." hint? right?/>...</Section>
 *
 * The one that matters is *Inside a panel*: a section is what divides a
 * `Panel`'s body, now that a `Card` there is refused rather than restyled.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Section, SectionHeader } from "./Section";
import { Card } from "./Card";
import { Panel } from "./Panel";
import { StatusBadge } from "./StatusBadge";

const meta = {
  title: "Status/Section",
  component: Section,
  tags: ["autodocs"],
  args: {
    title: "Language override",
    children: "Section content goes here.",
  },
} satisfies Meta<typeof Section>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TitleShorthand: Story = {};

export const TwoPiece: Story = {
  args: { title: undefined },
  render: () => (
    <Section>
      <SectionHeader
        title="Turn"
        hint="last update: 2s ago"
        right={
          <StatusBadge tone="success" pulse>
            Live
          </StatusBadge>
        }
      />
      <p style={{ margin: 0 }}>Body content goes here.</p>
    </Section>
  ),
};

/**
 * What a `Section` is for. The panel is the only box on screen; what it holds
 * is a run of headed parts, told apart by their headings and held apart by the
 * rhythm each one carries itself. The `Card` on the left is the comparison —
 * the same heading, drawn on a surface, which is what a page holds directly.
 *
 * Three sections rather than two, because the rhythm is the point: whether a
 * heading groups with what follows it is only readable once a section has a
 * neighbour on each side.
 */
export const InsideAPanel: Story = {
  args: { title: undefined },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
      <Card title="Prompt">A surface within a page — what a Card is.</Card>
      <Panel title="Conversation state">
        <Section title="Prompt">A part of this panel: no surface of its own.</Section>
        <Section title="Turn">A second section of the same panel.</Section>
        <Section title="Language override">A third, on the same rhythm.</Section>
      </Panel>
    </div>
  ),
};

/**
 * A `Section` is not panel-specific and reads nothing about its surroundings,
 * so it renders identically outside one — a plain headed group. That is the
 * property the v0.13 ancestor rule could not have: there, moving a block into
 * or out of a panel was a silent visual change.
 */
export const OnItsOwn: Story = {
  args: { title: undefined },
  render: () => (
    <div>
      <Section title="Prompt">The same section, on the page.</Section>
      <Section title="Turn">And its neighbour, on the same rhythm.</Section>
    </div>
  ),
};
