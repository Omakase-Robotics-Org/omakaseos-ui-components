/**
 * @file Storybook story for `MarkdownText`.
 *
 * `MarkdownText` has no props of its own — it reads the current message
 * part's text from assistant-ui's message context (`case "text": return
 * <MarkdownText />;` in `thread.tsx`). The only way to exercise it is to
 * mount a `Thread` with an assistant message whose content is markdown —
 * see `AuiStoryStage.tsx` for why `useLocalRuntime`, not
 * `ReadonlyThreadProvider`.
 */
import type { Meta, StoryObj } from "@storybook/react";
import type { ThreadMessageLike } from "@assistant-ui/react";

import { Thread } from "./thread";
import { AuiThreadStage } from "./AuiStoryStage";

const MARKDOWN_BODY = `# Heading 1
## Heading 2

A paragraph with **bold**, *italic*, ~~strikethrough~~, and \`inline code\`.
[A link to the docs](https://example.com/docs).

> A blockquote describing a caveat.

1. Power cycle the base station
2. Wait for the status LED to turn solid blue
3. Re-pair the robot from the operator console

- Battery
- Drive motors
- LiDAR unit

\`\`\`ts
function reboot(robotId: string): Promise<void> {
  return controlChannel.send({ type: "reboot", robotId });
}
\`\`\`

| Robot  | Battery | Status   |
| ------ | ------- | -------- |
| G1-042 | 38%     | Charging |
| G1-043 | 91%     | Standing |

---

That's the full sweep.
`;

const MARKDOWN_MESSAGES: ThreadMessageLike[] = [
  { id: "md-1", role: "user", content: "Give me a markdown-formatted status report." },
  {
    id: "md-2",
    role: "assistant",
    status: { type: "complete", reason: "stop" },
    content: MARKDOWN_BODY,
  },
];

function MarkdownTextPreview() {
  return (
    <AuiThreadStage messages={MARKDOWN_MESSAGES} height={900}>
      <Thread />
    </AuiThreadStage>
  );
}

const meta = {
  title: "Aui/MarkdownText",
  component: MarkdownTextPreview,
  tags: ["autodocs"],
} satisfies Meta<typeof MarkdownTextPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rendered: Story = {};
