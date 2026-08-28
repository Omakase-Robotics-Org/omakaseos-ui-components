/**
 * @file Storybook stories for `ToolGroupRoot` / `ToolGroupTrigger` /
 * `ToolGroupContent`.
 *
 * Unlike `ToolFallback`, these three read no assistant-ui context of their
 * own (`useScrollLock` only touches DOM refs — confirmed by reading
 * `node_modules/@assistant-ui/react/src/primitives/reasoning/
 * useScrollLock.ts`) so `Standalone` mounts them directly. `Grouped` shows
 * the real composition `thread.tsx`'s `AssistantMessage` wires when three
 * consecutive complete tool-call parts land in one message
 * (`groupPartByType` -> `"group-tool"`).
 */
import type { Meta, StoryObj } from "@storybook/react";
import type { ThreadMessageLike } from "@assistant-ui/react";

import { Thread } from "./thread";
import { ToolGroupContent, ToolGroupRoot, ToolGroupTrigger } from "./tool-group";
import { AuiRootStage, AuiThreadStage } from "./AuiStoryStage";

function StandaloneToolGroup({
  variant,
  active,
  count,
}: {
  variant: "outline" | "ghost" | "muted";
  active: boolean;
  count: number;
}) {
  return (
    <AuiRootStage>
      <ToolGroupRoot variant={variant} defaultOpen>
        <ToolGroupTrigger count={count} active={active} />
        <ToolGroupContent>
          <p style={{ margin: 8 }}>check_battery, check_motors, check_lidar — all complete.</p>
        </ToolGroupContent>
      </ToolGroupRoot>
    </AuiRootStage>
  );
}

const TOOL_GROUP_MESSAGES: ThreadMessageLike[] = [
  { id: "toolgroup-user", role: "user", content: "Run the standard 3-step pre-flight check on G1-042." },
  {
    id: "toolgroup-assistant",
    role: "assistant",
    status: { type: "complete", reason: "stop" },
    content: [
      { type: "text", text: "Running the pre-flight sequence." },
      {
        type: "tool-call",
        toolCallId: "call-step-1",
        toolName: "check_battery",
        args: {},
        result: { ok: true, level: 91 },
      },
      {
        type: "tool-call",
        toolCallId: "call-step-2",
        toolName: "check_motors",
        args: {},
        result: { ok: true },
      },
      {
        type: "tool-call",
        toolCallId: "call-step-3",
        toolName: "check_lidar",
        args: {},
        result: { ok: true, pointsPerSec: 300000 },
      },
    ],
  },
];

function GroupedToolGroup() {
  return (
    <AuiThreadStage messages={TOOL_GROUP_MESSAGES} height={420}>
      <Thread />
    </AuiThreadStage>
  );
}

const meta = {
  title: "Aui/ToolGroup",
  component: StandaloneToolGroup,
  tags: ["autodocs"],
  args: { variant: "outline", active: false, count: 3 },
  argTypes: {
    variant: { control: { type: "inline-radio" }, options: ["outline", "ghost", "muted"] },
    active: { control: "boolean" },
    count: { control: { type: "number", min: 1, max: 9 } },
  },
} satisfies Meta<typeof StandaloneToolGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standalone: Story = {};

export const Grouped: StoryObj<typeof GroupedToolGroup> = {
  render: () => <GroupedToolGroup />,
};
