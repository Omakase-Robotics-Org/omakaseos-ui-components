/**
 * @file Storybook stories for TypingIndicator.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { TypingIndicator } from "./TypingIndicator";

const meta = {
  title: "Chat-log/TypingIndicator",
  component: TypingIndicator,
  tags: ["autodocs"],
  args: { role: "assistant" },
  argTypes: {
    role: {
      control: { type: "inline-radio" },
      options: ["user", "assistant", "system", "tool"],
    },
  },
} satisfies Meta<typeof TypingIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Assistant: Story = {};
export const User: Story = { args: { role: "user" } };
export const System: Story = { args: { role: "system" } };
export const Tool: Story = { args: { role: "tool" } };
