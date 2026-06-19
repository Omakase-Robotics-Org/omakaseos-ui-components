/**
 * @file Storybook stories for ToolCallTrace.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { ToolCallTrace } from "./ToolCallTrace";

const meta = {
  title: "Chat-log/ToolCallTrace",
  component: ToolCallTrace,
  tags: ["autodocs"],
  args: {
    name: "search_inventory",
    args: { q: "manual G1-042", limit: 3 },
    status: "succeeded",
  },
  argTypes: {
    status: {
      control: { type: "inline-radio" },
      options: ["pending", "running", "succeeded", "failed"],
    },
  },
} satisfies Meta<typeof ToolCallTrace>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Succeeded: Story = {};

export const StreamingArgs: Story = {
  args: {
    status: "running",
    args: undefined,
    argsRaw: '{"q":"manual G1',
  },
};

export const Failed: Story = {
  args: {
    status: "failed",
    args: { q: "?" },
    result: <span>Tool error: vector store unreachable</span>,
  },
};

export const WithResult: Story = {
  args: {
    status: "succeeded",
    args: { q: "manual G1-042", limit: 3 },
    result: <span>3 hits — top score 0.91</span>,
  },
};
