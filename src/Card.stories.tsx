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
 * v0.14 — a Card is a surface within a page, and a page is where it belongs.
 * Inside a `Panel` body it **throws**: a container in a container is a frame in
 * a frame, and the vocabulary for dividing a panel is `Section` (see
 * `Status/Section` → *Inside a panel*). Earlier releases restyled the nested
 * case instead — v0.12 relaxed the recipe, v0.13 removed the surface — and both
 * were rejected for making the same call render as two different things
 * depending on where it sat (omksos_web `reports/monitor-scope-coherence/`,
 * ruling B). There is deliberately no story of a Card in a Panel: it has no
 * rendering to show.
 *
 * What a panel body does take beside a section is plain content, and a Card may
 * still sit in a panel's `headerRight` — that slot is the panel's own chrome.
 */
export const BesideAPanel: Story = {
  args: { title: undefined },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
      <Card title="Prompt">A surface within a page: outline, fill, lift, corner.</Card>
      <Panel title="Conversation state">
        A panel is a section of the page, and the only box around what it holds.
      </Panel>
    </div>
  ),
};
