/**
 * @file Storybook stories for ConversationStage.
 *
 * Google Meet-style 1:n live stage. The grid column count is picked
 * automatically from `tileCount` via `pickStageColumns`.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { ConversationStage } from "./ConversationStage";
import { LiveCaption } from "./LiveCaption";
import { ParticipantTile } from "./ParticipantTile";

const meta = {
  title: "Live-stage/ConversationStage",
  component: ConversationStage,
  tags: ["autodocs"],
} satisfies Meta<typeof ConversationStage>;

export default meta;
type Story = StoryObj<typeof meta>;

const Avatar = ({ initials }: { initials: string }) => (
  <span style={{ fontSize: 28, fontWeight: 600 }}>{initials}</span>
);

export const FourParticipants: Story = {
  args: {
    ariaLabel: "demo-stage",
    tileCount: 4,
    tiles: [
      <ParticipantTile key="op" name="Operator" role="user" connected avatar={<Avatar initials="OP" />} />,
      <ParticipantTile key="bot" name="Robotics Agent" role="assistant" speaking connected avatar={<Avatar initials="RA" />} />,
      <ParticipantTile key="g1" name="G1-042" role="tool" connected hint={<>online</>} avatar={<Avatar initials="G1" />} />,
      <ParticipantTile key="g2" name="G1-043 (dropped)" role="tool" connected={false} hint={<>reconnecting</>} avatar={<Avatar initials="G1" />} />,
    ],
    caption: (
      <LiveCaption
        speaker="Robotics Agent"
        role="assistant"
        text="Looking up the manual for G1-042 and the operator can also see it on their tablet now."
        streaming
      />
    ),
  },
};

export const TwoParticipants: Story = {
  args: {
    tileCount: 2,
    tiles: [
      <ParticipantTile key="op" name="Operator" role="user" connected avatar={<Avatar initials="OP" />} />,
      <ParticipantTile key="bot" name="Robotics Agent" role="assistant" speaking connected avatar={<Avatar initials="RA" />} />,
    ],
    caption: (
      <LiveCaption speaker="Robotics Agent" role="assistant" text="Hello — how can I help?" />
    ),
  },
};

export const SixParticipantsThreeColumns: Story = {
  args: {
    tileCount: 6,
    tiles: Array.from({ length: 6 }, (_, i) => (
      <ParticipantTile
        key={String(i)}
        name={`Robot ${String(i + 1)}`}
        role="tool"
        connected
        avatar={<Avatar initials={`R${String(i + 1)}`} />}
      />
    )),
  },
};
