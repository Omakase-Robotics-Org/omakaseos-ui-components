/**
 * @file Deterministic, network-free fixtures for the `src/aui/aui.html` demo
 * page — the Phase 1 visual-regression safety net for the aui → CSS Modules
 * migration (see `omksos_web/reports/aui-css-modules/`).
 *
 * Every scene in `aui-main.tsx` is seeded from a plain array here so the
 * Playwright baseline spec (`spec/aui-visual.e2e.spec.ts`) captures the same
 * pixels and computed styles on every run. Nothing in this file makes a
 * network call, starts a timer, or reads `Math.random()` / `Date.now()`.
 *
 * Two upstream behaviours drove the shape of these fixtures (both traced by
 * reading `node_modules/@assistant-ui/core/src` directly, since the public
 * `.d.ts` surface under-documents them):
 *
 *   1. `ReadonlyThreadProvider` (the pattern the real consumer,
 *      `source/service/packages/web`, tried and reverted from) does not
 *      register a `tools` scope, so `<Thread />` throws
 *      `"The current scope does not have a 'tools' property"` the moment an
 *      assistant message renders. This file assumes `useExternalStoreRuntime`
 *      + `AssistantRuntimeProvider` instead (registers the full scope set),
 *      never `ReadonlyThreadProvider`.
 *   2. A tool-call message part's rendered `status` is NOT something you set
 *      per-part. `toMessagePartStatus` (message-runtime.ts) derives it as:
 *      complete if the part already has a `result`, otherwise the
 *      *whole message's* `status`. So "one message, several tool-calls in
 *      different states" is not expressible — each non-complete tool-call
 *      state (error / requires-action / running) needs its own message.
 */
import type { RealtimeVoiceAdapter, ThreadMessageLike } from "@assistant-ui/react";

/** Smallest possible valid PNG (1x1, fully deterministic, no network). */
export const TINY_PNG_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const FIXED_DATE = new Date("2026-01-01T00:00:00.000Z");

// ---------------------------------------------------------------------------
// thread-empty — Welcome view (0 messages).
//
// GAP (documented, not attempted further): the welcome view's suggestion
// chips (`ThreadPrimitive.Suggestions` in thread.tsx) are NOT exercised
// here. `useExternalStoreRuntime` imported from the top-level
// `@assistant-ui/react` resolves to the LEGACY runtime core
// (`node_modules/@assistant-ui/react/src/legacy-runtime/runtime-cores/
// external-store/*.ts` — confirmed by reading that re-export directly),
// which never wires an adapter's `suggestions` field into the store scope
// `ThreadPrimitive.Suggestions` reads (`s.suggestions.suggestions.length`).
// Absent a runtime-specific registration, that scope falls back to
// `@assistant-ui/core`'s `Suggestions()` call with NO arguments (see
// `store/clients/runtime-adapter.ts`), which is permanently empty. This is
// an upstream integration gap in installed `@assistant-ui/react@0.14.23` /
// `@assistant-ui/core@0.2.18`, not something fixable from this package.
// ---------------------------------------------------------------------------
export const EMPTY_MESSAGES: ThreadMessageLike[] = [];

// ---------------------------------------------------------------------------
// thread-conversation — plain-text multi-turn conversation.
// ---------------------------------------------------------------------------
export const CONVERSATION_MESSAGES: ThreadMessageLike[] = [
  {
    id: "conv-1",
    role: "user",
    createdAt: FIXED_DATE,
    content: "What's the current battery level on G1-042?",
  },
  {
    id: "conv-2",
    role: "assistant",
    createdAt: FIXED_DATE,
    status: { type: "complete", reason: "stop" },
    content: "G1-042 is at 38% and charging at the dock.",
  },
  {
    id: "conv-3",
    role: "user",
    createdAt: FIXED_DATE,
    content: "Let me know when it's back above 90%.",
  },
  {
    id: "conv-4",
    role: "assistant",
    createdAt: FIXED_DATE,
    status: { type: "complete", reason: "stop" },
    content:
      "Will do — I'll post an update here once it crosses 90%. Anything else in the meantime?",
  },
];

// ---------------------------------------------------------------------------
// thread-markdown — one assistant reply exercising every markdown-text.tsx
// component (incl. remark-gfm tables + strikethrough).
// ---------------------------------------------------------------------------
const MARKDOWN_BODY = `# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

A regular paragraph with **bold text**, *italic text*, ~~strikethrough~~,
and \`inline code\` mixed in. Here is a [link to the docs](https://example.com/docs).

> A blockquote describing a caveat: the manual only covers firmware
> versions 3.x and above.

Ordered steps:

1. Power cycle the base station
2. Wait for the status LED to turn solid blue
3. Re-pair the robot from the operator console

Unordered list:

- Battery
- Drive motors
- LiDAR unit

A fenced code block:

\`\`\`ts
function reboot(robotId: string): Promise<void> {
  return controlChannel.send({ type: "reboot", robotId });
}
\`\`\`

| Robot   | Battery | Status     |
| ------- | ------- | ---------- |
| G1-042  | 38%     | Charging   |
| G1-043  | 91%     | Standing   |

---

That's the full sweep.
`;

export const MARKDOWN_MESSAGES: ThreadMessageLike[] = [
  {
    id: "md-1",
    role: "user",
    createdAt: FIXED_DATE,
    content: "Give me a markdown-formatted status report.",
  },
  {
    id: "md-2",
    role: "assistant",
    createdAt: FIXED_DATE,
    status: { type: "complete", reason: "stop" },
    content: MARKDOWN_BODY,
  },
];

// ---------------------------------------------------------------------------
// thread-tool-calls — four ToolFallback states, each forced by putting the
// tool-call in its own message (see file header note #2).
// ---------------------------------------------------------------------------
export const TOOL_CALLS_MESSAGES: ThreadMessageLike[] = [
  {
    id: "tool-complete-user",
    role: "user",
    createdAt: FIXED_DATE,
    content: "What's the weather like at the Tokyo depot?",
  },
  {
    id: "tool-complete-assistant",
    role: "assistant",
    createdAt: FIXED_DATE,
    status: { type: "complete", reason: "stop" },
    content: [
      { type: "text", text: "Let me check that for you." },
      {
        type: "tool-call",
        toolCallId: "call-weather-1",
        toolName: "get_weather",
        args: { city: "Tokyo", units: "metric" },
        // has a result -> always renders as "complete", regardless of
        // message.status (see toMessagePartStatus in message-runtime.ts).
        result: { tempC: 18, condition: "cloudy" },
      },
    ],
  },
  {
    id: "tool-error-user",
    role: "user",
    createdAt: FIXED_DATE,
    content: "Search the manual for error code E204.",
  },
  {
    id: "tool-error-assistant",
    role: "assistant",
    createdAt: FIXED_DATE,
    // No result on the tool-call below -> its status mirrors this whole
    // message's status, so "incomplete/error" is a MESSAGE-level property.
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
  },
  {
    id: "tool-approval-user",
    role: "user",
    createdAt: FIXED_DATE,
    content: "Delete the temp diagnostics bundle from G1-042.",
  },
  {
    id: "tool-approval-assistant",
    role: "assistant",
    createdAt: FIXED_DATE,
    status: { type: "requires-action", reason: "tool-calls" },
    content: [
      {
        type: "tool-call",
        toolCallId: "call-delete-1",
        toolName: "delete_resource",
        args: { path: "/var/diagnostics/tmp-bundle-2026-01-01.tar" },
        approval: {
          id: "approval-1",
          options: [
            { id: "once", kind: "allow-once", label: "Allow" },
            { id: "always", kind: "allow-always" },
            { id: "deny", kind: "reject-once", label: "Deny" },
          ],
        },
      },
    ],
  },
  {
    id: "tool-running-user",
    role: "user",
    createdAt: FIXED_DATE,
    content: "Kick off a full inventory scan of the warehouse.",
  },
  {
    id: "tool-running-assistant",
    role: "assistant",
    createdAt: FIXED_DATE,
    // Deliberately frozen "running" state (no timers): the spinner +
    // shimmer are masked in the screenshot baseline (aui-visual.e2e.spec.ts)
    // because their CSS animations have no natural end state to settle on.
    status: { type: "running" },
    content: [
      {
        type: "tool-call",
        toolCallId: "call-scan-1",
        toolName: "scan_inventory",
        args: { zone: "warehouse-b" },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// thread-tool-group — 3 consecutive *complete* tool-calls in ONE message so
// groupPartByType's "group-tool" grouping kicks in (thread.tsx).
// ---------------------------------------------------------------------------
export const TOOL_GROUP_MESSAGES: ThreadMessageLike[] = [
  {
    id: "toolgroup-user",
    role: "user",
    createdAt: FIXED_DATE,
    content: "Run the standard 3-step pre-flight check on G1-042.",
  },
  {
    id: "toolgroup-assistant",
    role: "assistant",
    createdAt: FIXED_DATE,
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

// ---------------------------------------------------------------------------
// thread-reasoning — a done (collapsed) reasoning group + a frozen streaming
// reasoning group. Two *consecutive* reasoning parts are required in one
// message so groupPartByType groups them into "group-reasoning" (a single
// reasoning part renders as bare MarkdownText, no disclosure chrome).
// ---------------------------------------------------------------------------
export const REASONING_MESSAGES: ThreadMessageLike[] = [
  {
    id: "reasoning-done-user",
    role: "user",
    createdAt: FIXED_DATE,
    content: "Which robot should charge next?",
  },
  {
    id: "reasoning-done-assistant",
    role: "assistant",
    createdAt: FIXED_DATE,
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
  {
    id: "reasoning-running-user",
    role: "user",
    createdAt: FIXED_DATE,
    content: "And after that?",
  },
  {
    id: "reasoning-running-assistant",
    role: "assistant",
    createdAt: FIXED_DATE,
    // Frozen "running" state: the message's last part is "reasoning", so
    // thread.tsx's ReasoningGroupImpl auto-opens with a bottom-pinned
    // preview + shimmer label. Masked in the screenshot baseline.
    status: { type: "running" },
    content: [
      {
        type: "reasoning",
        text: "Checking the queue for the next scheduled task...",
      },
      {
        type: "reasoning",
        text: "Cross-referencing with the maintenance window...",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// thread-attachments — a sent user message with an image + a document
// attachment (UserMessageAttachments). The composer-side (unsent) attachment
// is seeded imperatively via `composerRuntime.addAttachment(...)` in
// aui-main.tsx (`CreateAttachment` shape needs no adapter — see
// base-composer-runtime-core.ts `addAttachment`).
// ---------------------------------------------------------------------------
export const ATTACHMENTS_MESSAGES: ThreadMessageLike[] = [
  {
    id: "attach-user",
    role: "user",
    createdAt: FIXED_DATE,
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
    createdAt: FIXED_DATE,
    status: { type: "complete", reason: "stop" },
    content: "Got both — reviewing now.",
  },
];

// ---------------------------------------------------------------------------
// thread-composer-states — docked composer, idle. A second scene
// (COMPOSER_RUNNING_MESSAGES) freezes `thread.isRunning` via the last
// message's status so the Composer swaps Send -> Cancel deterministically.
// ---------------------------------------------------------------------------
export const COMPOSER_IDLE_MESSAGES: ThreadMessageLike[] = [
  {
    id: "composer-idle-user",
    role: "user",
    createdAt: FIXED_DATE,
    content: "Status check please.",
  },
  {
    id: "composer-idle-assistant",
    role: "assistant",
    createdAt: FIXED_DATE,
    status: { type: "complete", reason: "stop" },
    content: "All systems nominal.",
  },
];

export const COMPOSER_RUNNING_MESSAGES: ThreadMessageLike[] = [
  {
    id: "composer-running-user",
    role: "user",
    createdAt: FIXED_DATE,
    content: "Scan every robot on the floor and summarize.",
  },
  {
    id: "composer-running-assistant",
    role: "assistant",
    createdAt: FIXED_DATE,
    status: { type: "running" },
    content: "Checking inventory levels across warehouses",
  },
];

// ---------------------------------------------------------------------------
// thread-voice — fake, synchronous RealtimeVoiceAdapter. No microphone, no
// WebRTC, no timers: `connect()` resolves the session immediately in the
// "running"/"listening" state. mute/unmute/disconnect are recorded but the
// runtime tracks isMuted/status locally (see base-thread-runtime-core.ts
// `connectVoice`/`muteVoice`), so the fake adapter never needs to invoke its
// own change callbacks for the demo's interaction flow to work.
// ---------------------------------------------------------------------------
export function createFakeVoiceAdapter(): RealtimeVoiceAdapter {
  return {
    connect: () => ({
      status: { type: "running" },
      isMuted: false,
      disconnect: () => {},
      mute: () => {},
      unmute: () => {},
      onStatusChange: () => () => {},
      onTranscript: () => () => {},
      onModeChange: () => () => {},
      onVolumeChange: () => () => {},
    }),
  };
}
