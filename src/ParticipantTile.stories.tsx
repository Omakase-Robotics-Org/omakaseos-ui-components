/**
 * @file Storybook stories for ParticipantTile.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { ParticipantTile } from "./ParticipantTile";

const meta = {
  title: "Live-stage/ParticipantTile",
  component: ParticipantTile,
  tags: ["autodocs"],
  args: {
    name: "Operator",
    role: "user",
    speaking: false,
    connected: true,
    avatar: <span style={{ fontSize: 28, fontWeight: 600 }}>OP</span>,
  },
  argTypes: {
    role: {
      control: { type: "inline-radio" },
      options: ["user", "assistant", "system", "tool"],
    },
    speaking: { control: "boolean" },
    connected: { control: "boolean" },
  },
} satisfies Meta<typeof ParticipantTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Operator: Story = {};
export const AssistantSpeaking: Story = {
  args: { name: "Robotics Agent", role: "assistant", speaking: true,
          avatar: <span style={{ fontSize: 28, fontWeight: 600 }}>RA</span> },
};
export const ToolHinted: Story = {
  args: { name: "search_inventory", role: "tool", connected: true, hint: <>online</>,
          avatar: <span style={{ fontSize: 28, fontWeight: 600 }}>TL</span> },
};
export const Disconnected: Story = {
  args: { name: "G1-043 (dropped)", role: "tool", connected: false, hint: <>reconnecting</>,
          avatar: <span style={{ fontSize: 28, fontWeight: 600 }}>G1</span> },
};
