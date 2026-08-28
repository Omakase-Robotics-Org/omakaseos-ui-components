/**
 * @file Storybook stories for the `Thread` shell.
 *
 * `Thread` is the composite root the other `aui` modules render inside of
 * (`MarkdownText`, `ToolFallback`, `ToolGroupRoot/Trigger/Content`, the
 * `Reasoning` family, the attachment components) — see each of those
 * modules' own story file for a fixture that spotlights it specifically.
 * This file covers the shell itself: the welcome/empty view and a
 * multi-turn conversation with a genuinely working composer (see
 * `AuiStoryStage.tsx`'s header for why `useLocalRuntime` + a fake echo
 * `ChatModelAdapter`, not `ReadonlyThreadProvider`).
 */
import type { Meta, StoryObj } from "@storybook/react";
import type { ThreadMessageLike } from "@assistant-ui/react";

import { Thread } from "./thread";
import { AuiThreadStage } from "./AuiStoryStage";

const CONVERSATION_MESSAGES: ThreadMessageLike[] = [
  {
    id: "conv-1",
    role: "user",
    content: "What's the current battery level on G1-042?",
  },
  {
    id: "conv-2",
    role: "assistant",
    status: { type: "complete", reason: "stop" },
    content: [
      { type: "text", text: "G1-042 is at 38% and charging at the dock." },
      {
        type: "reasoning",
        text: "The last telemetry ping put it on the dock at 38%, still climbing.",
      },
    ],
  },
  {
    id: "conv-3",
    role: "user",
    content: "Search the manual for a markdown-formatted status report.",
  },
  {
    id: "conv-4",
    role: "assistant",
    status: { type: "complete", reason: "stop" },
    content: [
      { type: "text", text: "Here's the standard status report format." },
      {
        type: "tool-call",
        toolCallId: "call-report-1",
        toolName: "generate_status_report",
        args: { robotId: "G1-042" },
        result: { format: "markdown", sections: 3 },
      },
      {
        type: "text",
        text: "## Status: G1-042\n\n- **Battery**: 38%, charging\n- **Task**: idle\n\nAnything else?",
      },
    ],
  },
];

function ThreadPreview({
  messages,
  height,
}: {
  messages: ThreadMessageLike[];
  height?: number;
}) {
  return (
    <AuiThreadStage messages={messages} height={height}>
      <Thread />
    </AuiThreadStage>
  );
}

const meta = {
  title: "Aui/Thread",
  component: ThreadPreview,
  tags: ["autodocs"],
} satisfies Meta<typeof ThreadPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { messages: [], height: 360 },
};

export const Conversation: Story = {
  args: { messages: CONVERSATION_MESSAGES, height: 640 },
};
