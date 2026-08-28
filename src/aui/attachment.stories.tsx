/**
 * @file Storybook story for the composer / message attachment components
 * (`ComposerAddAttachment`, `ComposerAttachments`, `UserMessageAttachments`).
 *
 * A sent user message carries an image + a document attachment
 * (`UserMessageAttachments`, rendered by `UserMessage` in `thread.tsx`).
 * The composer side seeds one unsent image attachment imperatively via
 * `composerRuntime.addAttachment(...)` on mount — the `CreateAttachment`
 * overload needs no `AttachmentAdapter` (see
 * `base-composer-runtime-core.ts` `addAttachment`) — exercising
 * `ComposerAttachments` / `ComposerAddAttachment`. Mirrors
 * `demo/aui-main.tsx`'s `ComposerAttachmentSeeder`.
 */
import { useEffect, useRef } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { useComposerRuntime, type ThreadMessageLike } from "@assistant-ui/react";

import { Thread } from "./thread";
import { AuiThreadStage } from "./AuiStoryStage";

/** Smallest possible valid PNG (1x1), no network. */
const TINY_PNG_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const ATTACHMENTS_MESSAGES: ThreadMessageLike[] = [
  {
    id: "attach-user",
    role: "user",
    content: "Here's the panel photo and the incident report.",
    attachments: [
      {
        id: "attach-image-1",
        type: "image",
        name: "panel-photo.png",
        contentType: "image/png",
        status: { type: "complete" },
        content: [{ type: "image", image: TINY_PNG_DATA_URI }],
      },
      {
        id: "attach-doc-1",
        type: "document",
        name: "incident-report.txt",
        contentType: "text/plain",
        status: { type: "complete" },
        content: [{ type: "text", text: "incident-report.txt" }],
      },
    ],
  },
  {
    id: "attach-assistant",
    role: "assistant",
    status: { type: "complete", reason: "stop" },
    content: "Got both — reviewing now.",
  },
];

/** Seeds one unsent image attachment into the composer, once, on mount. */
function ComposerAttachmentSeeder() {
  const composerRuntime = useComposerRuntime();
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    void composerRuntime.addAttachment({
      name: "sensor-diagram.png",
      type: "image",
      contentType: "image/png",
      content: [{ type: "image", image: TINY_PNG_DATA_URI }],
    });
  }, [composerRuntime]);

  return null;
}

function AttachmentPreview() {
  return (
    <AuiThreadStage messages={ATTACHMENTS_MESSAGES} height={640}>
      <Thread />
      <ComposerAttachmentSeeder />
    </AuiThreadStage>
  );
}

const meta = {
  title: "Aui/Attachment",
  component: AttachmentPreview,
  tags: ["autodocs"],
} satisfies Meta<typeof AttachmentPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SentAndComposerAttachment: Story = {};
