/**
 * @file Storybook stories for RealtimeEventLog.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { RealtimeEventLog } from "./RealtimeEventLog";
import type { RealtimeEventEntry } from "./RealtimeEventLog";

const meta = {
  title: "Chat-log/RealtimeEventLog",
  component: RealtimeEventLog,
  tags: ["autodocs"],
} satisfies Meta<typeof RealtimeEventLog>;

export default meta;
type Story = StoryObj<typeof meta>;

const ENTRIES: RealtimeEventEntry[] = [
  { id: "1", type: "session.created", at: "12:00:00.001" },
  { id: "2", type: "conversation.item.added", at: "12:00:00.123", summary: "user: where's the manual?" },
  { id: "3", type: "response.created", at: "12:00:00.130" },
  { id: "4", type: "response.output_text.delta", at: "12:00:00.150", summary: '"Looking"' },
  { id: "5", type: "response.output_text.delta", at: "12:00:00.180", summary: '" it up"' },
  { id: "6", type: "response.function_call_arguments.delta", at: "12:00:00.260", summary: "search_inventory({" },
  { id: "7", type: "response.function_call_arguments.done", at: "12:00:00.310", summary: "search_inventory(...) done" },
  { id: "8", type: "response.output_text.done", at: "12:00:00.420" },
  { id: "9", type: "response.done", at: "12:00:00.421" },
  { id: "10", type: "error", at: "12:00:01.000", summary: "rate_limit_exceeded — retry after 1.5s" },
];

export const ChronologicalStream: Story = {
  args: { entries: ENTRIES },
};

export const TruncatedToFive: Story = {
  args: { entries: ENTRIES, max: 5 },
};
