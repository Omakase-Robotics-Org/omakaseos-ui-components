/**
 * @file Storybook stories for `ToolFallback`.
 *
 * `ToolFallback` is a `ToolCallMessagePartComponent` — the fallback
 * renderer `thread.tsx` mounts for any tool-call part with no registered
 * tool UI (`part.toolUI ?? <ToolFallbackComponent {...part} />`). Its
 * rendered status is derived from the message it's part of (`complete` iff
 * the part carries a `result`, otherwise the whole message's `status` — see
 * `demo/aui-fixtures.ts`'s file header, point 2), so each state below is
 * its own message rather than a prop on one shared fixture.
 */
import type { Meta, StoryObj } from "@storybook/react";
import type { ThreadMessageLike } from "@assistant-ui/react";

import { Thread } from "./thread";
import { AuiThreadStage } from "./AuiStoryStage";

function toolFallbackFixture(
  userText: string,
  assistant: Omit<ThreadMessageLike, "id" | "role">,
): ThreadMessageLike[] {
  return [
    { id: "tf-user", role: "user", content: userText },
    { id: "tf-assistant", role: "assistant", ...assistant },
  ];
}

function ToolFallbackPreview({ messages }: { messages: ThreadMessageLike[] }) {
  return (
    <AuiThreadStage messages={messages} height={360}>
      <Thread />
    </AuiThreadStage>
  );
}

const meta = {
  title: "Aui/ToolFallback",
  component: ToolFallbackPreview,
  tags: ["autodocs"],
} satisfies Meta<typeof ToolFallbackPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Complete: Story = {
  args: {
    messages: toolFallbackFixture("What's the weather like at the Tokyo depot?", {
      status: { type: "complete", reason: "stop" },
      content: [
        { type: "text", text: "Let me check that for you." },
        {
          type: "tool-call",
          toolCallId: "call-weather-1",
          toolName: "get_weather",
          args: { city: "Tokyo", units: "metric" },
          result: { tempC: 18, condition: "cloudy" },
        },
      ],
    }),
  },
};

export const ErrorState: Story = {
  args: {
    messages: toolFallbackFixture("Search the manual for error code E204.", {
      status: {
        type: "incomplete",
        reason: "error",
        error: "search_index_unreachable: connection reset",
      },
      content: [
        {
          type: "tool-call",
          toolCallId: "call-search-1",
          toolName: "search_docs",
          args: { query: "error code E204" },
        },
      ],
    }),
  },
};

export const RequiresAction: Story = {
  args: {
    messages: toolFallbackFixture("Delete the temp diagnostics bundle from G1-042.", {
      status: { type: "requires-action", reason: "tool-calls" },
      content: [
        {
          type: "tool-call",
          toolCallId: "call-delete-1",
          toolName: "delete_resource",
          args: { path: "/var/diagnostics/tmp-bundle.tar" },
          approval: {
            id: "approval-1",
            options: [
              { id: "once", kind: "allow-once", label: "Allow" },
              { id: "deny", kind: "reject-once", label: "Deny" },
            ],
          },
        },
      ],
    }),
  },
};

export const Running: Story = {
  args: {
    messages: toolFallbackFixture("Kick off a full inventory scan of the warehouse.", {
      status: { type: "running" },
      content: [
        {
          type: "tool-call",
          toolCallId: "call-scan-1",
          toolName: "scan_inventory",
          args: { zone: "warehouse-b" },
        },
      ],
    }),
  },
};
