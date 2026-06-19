/**
 * @file Storybook stories for LiveCaption.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { LiveCaption } from "./LiveCaption";

const meta = {
  title: "Live-stage/LiveCaption",
  component: LiveCaption,
  tags: ["autodocs"],
  args: {
    speaker: "Robotics Agent",
    role: "assistant",
    text: "Looking up the manual for G1-042 — found 3 documents.",
    streaming: false,
  },
  argTypes: {
    role: {
      control: { type: "inline-radio" },
      options: ["user", "assistant", "system", "tool"],
    },
    streaming: { control: "boolean" },
  },
} satisfies Meta<typeof LiveCaption>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Finalized: Story = {};
export const Streaming: Story = { args: { streaming: true } };
export const SystemNotice: Story = {
  args: {
    speaker: "—",
    role: "system",
    text: "Waiting for the next utterance.",
    streaming: false,
  },
};
