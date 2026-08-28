/**
 * @file Storybook stories for the `Reasoning` family (`Reasoning`,
 * `ReasoningRoot`, `ReasoningTrigger`, `ReasoningContent`, `ReasoningText`).
 *
 * `thread.tsx` picks between two renderers depending on how many
 * consecutive `reasoning` parts a message carries: a single, ungrouped
 * part renders the bare `Reasoning` component (`case "reasoning": return
 * <Reasoning {...part} />`); two or more consecutive parts group into
 * `"group-reasoning"` and compose `ReasoningRoot` / `Trigger` / `Content` /
 * `Text` directly. `Standalone` exercises the first path, `GroupedDone` and
 * `GroupedStreaming` the second.
 */
import type { Meta, StoryObj } from "@storybook/react";
import type { ThreadMessageLike } from "@assistant-ui/react";

import { Thread } from "./thread";
import { AuiThreadStage } from "./AuiStoryStage";

const STANDALONE_MESSAGES: ThreadMessageLike[] = [
  { id: "reasoning-standalone-user", role: "user", content: "Which robot should charge next?" },
  {
    id: "reasoning-standalone-assistant",
    role: "assistant",
    status: { type: "complete", reason: "stop" },
    content: [
      {
        type: "reasoning",
        text: "G1-042 is at 38% and idle; charging it now avoids interrupting G1-043's task.",
      },
      { type: "text", text: "Send G1-042 to the charging dock next." },
    ],
  },
];

const GROUPED_DONE_MESSAGES: ThreadMessageLike[] = [
  { id: "reasoning-grouped-user", role: "user", content: "Walk me through the choice." },
  {
    id: "reasoning-grouped-assistant",
    role: "assistant",
    status: { type: "complete", reason: "stop" },
    content: [
      {
        type: "reasoning",
        text: "G1-042 is at 38% and idle; G1-043 is at 91% and mid-task.",
      },
      {
        type: "reasoning",
        text: "Charging G1-042 now avoids interrupting G1-043's task.",
      },
      { type: "text", text: "Send G1-042 to the charging dock next." },
    ],
  },
];

const GROUPED_STREAMING_MESSAGES: ThreadMessageLike[] = [
  { id: "reasoning-streaming-user", role: "user", content: "And after that?" },
  {
    id: "reasoning-streaming-assistant",
    role: "assistant",
    // Frozen "running" state (no timers): the last part is "reasoning", so
    // ReasoningGroupImpl (thread.tsx) auto-opens with a bottom-pinned
    // preview + shimmer label.
    status: { type: "running" },
    content: [
      { type: "reasoning", text: "Checking the queue for the next scheduled task..." },
      { type: "reasoning", text: "Cross-referencing with the maintenance window..." },
    ],
  },
];

function ReasoningPreview({ messages }: { messages: ThreadMessageLike[] }) {
  return (
    <AuiThreadStage messages={messages} height={340}>
      <Thread />
    </AuiThreadStage>
  );
}

const meta = {
  title: "Aui/Reasoning",
  component: ReasoningPreview,
  tags: ["autodocs"],
} satisfies Meta<typeof ReasoningPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standalone: Story = {
  args: { messages: STANDALONE_MESSAGES },
};

export const GroupedDone: Story = {
  args: { messages: GROUPED_DONE_MESSAGES },
};

export const GroupedStreaming: Story = {
  args: { messages: GROUPED_STREAMING_MESSAGES },
};
