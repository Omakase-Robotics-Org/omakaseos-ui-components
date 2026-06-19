/**
 * @file Storybook stories for MessageBubble.
 *
 * Past-tense conversation log — one bubble per finalized turn. Distinct
 * from the v0.5 ParticipantTile + LiveCaption surface (the live stage
 * view); use a Transcript of MessageBubbles when rendering scrollback.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { MessageBubble } from "./MessageBubble";

const meta = {
  title: "Chat-log/MessageBubble",
  component: MessageBubble,
  tags: ["autodocs"],
  args: { role: "assistant", children: "Hello — how can I help?" },
  argTypes: {
    role: {
      control: { type: "inline-radio" },
      options: ["user", "assistant", "system", "tool"],
    },
    align: {
      control: { type: "inline-radio" },
      options: ["auto", "left", "right"],
    },
    streaming: { control: "boolean" },
    tone: {
      control: { type: "inline-radio" },
      options: [undefined, "success", "warning", "danger", "info", "neutral"],
    },
    timestamp: { control: "text" },
  },
} satisfies Meta<typeof MessageBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Assistant: Story = {};
export const User: Story = { args: { role: "user", children: "Where is the manual for G1-042?" } };
export const System: Story = { args: { role: "system", children: "Session started." } };
export const Tool: Story = { args: { role: "tool", children: "search_inventory(...) → 3 hits" } };

export const Streaming: Story = {
  args: { streaming: true, children: "Mid-utterance — appending tokens" },
};

export const ErrorTone: Story = {
  args: {
    role: "system",
    tone: "danger",
    children: "rate_limit_exceeded — retry after 1.5s",
  },
};

export const LongUnbrokenWraps: Story = {
  args: {
    children:
      "This message contains an extremely long unbroken token: SUPERCALIFRAGILISTICEXPIALIDOCIOUS_PLUS_AN_EVEN_LONGER_TAIL — but it must wrap inside the bubble rather than overflow.",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320, border: "1px dashed var(--ds-border)", padding: 8 }}>
        <Story />
      </div>
    ),
  ],
};

export const RoleLabelOverride: Story = {
  args: { role: "user", roleLabel: "Customer", children: "Domain term shown in the meta line." },
};
