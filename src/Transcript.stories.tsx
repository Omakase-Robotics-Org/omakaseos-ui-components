/**
 * @file Storybook stories for Transcript.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { MessageBubble } from "./MessageBubble";
import { Transcript } from "./Transcript";

const meta = {
  title: "Chat-log/Transcript",
  component: Transcript,
  tags: ["autodocs"],
  args: { children: null },
} satisfies Meta<typeof Transcript>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullConversation: Story = {
  render: () => (
    <Transcript ariaLabel="conversation">
      <MessageBubble role="system" timestamp="12:00:00.001">
        Session started.
      </MessageBubble>
      <MessageBubble role="user" timestamp="12:00:01.123">
        Where is the operator manual for G1-042?
      </MessageBubble>
      <MessageBubble role="assistant" timestamp="12:00:02.420">
        Looking it up — found 3 documents.
      </MessageBubble>
      <MessageBubble role="tool" timestamp="12:00:02.500">
        tool_result: top match score 0.91
      </MessageBubble>
      <MessageBubble role="assistant" streaming>
        Streaming the next assistant turn
      </MessageBubble>
      <MessageBubble role="system" tone="danger">
        rate_limit_exceeded — retry after 1.5s
      </MessageBubble>
    </Transcript>
  ),
};
