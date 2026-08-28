/**
 * @file Storybook-only mounting helpers for the `src/aui/` surface.
 *
 * Every `Aui/*` story that needs a live assistant-ui runtime shares this
 * one file instead of re-deriving the wiring per story — the same
 * treatment `DirectManipulationStoryCanvas`
 * (`src/DirectManipulationStoryCanvas.tsx`) gets for the direct-manipulation
 * glyph stories. NOT re-exported from `src/aui/index.ts`: a story-only
 * fixture is invisible to `storybook-coverage.spec.ts`'s export-derived
 * story requirement (built by parsing the barrel's `export { ... } from`
 * lines, not by scanning the directory), so it needs no separate exclusion.
 *
 * Two things every `Aui/*` story needs:
 *
 *   1. The `.aui-root` scope aui.css's shadcn theme tokens and scoped
 *      preflight target (see `src/aui/aui.css`'s file header) — imported
 *      here as a side effect so any story file that imports from this
 *      module pulls it in exactly once.
 *   2. A root-level `TooltipProvider`: `AttachmentUI` (`src/aui/
 *      attachment.tsx`) mounts a bare `<Tooltip>` with no ancestor
 *      `TooltipProvider` of its own (unlike `TooltipIconButton`, which
 *      wraps one per instance) — it assumes the consuming app supplies
 *      exactly one near the app root, confirmed by reading
 *      `demo/aui-main.tsx`'s own header comment for the same reason.
 *
 * `AuiThreadStage` additionally wires a live `useLocalRuntime` seeded from
 * a fixed `ThreadMessageLike[]` fixture, with a deterministic, network-free
 * echo `ChatModelAdapter` so a story's composer stays interactive without
 * a network call or a timer.
 *
 * `ReadonlyThreadProvider` — the pattern `src/aui/index.ts`'s own header
 * comment documents for archived, read-only transcripts — is deliberately
 * NOT used here. Reproduced directly against the installed
 * `@assistant-ui/react@0.14.23` before writing these stories: mounting
 * `<Thread />` under `<ReadonlyThreadProvider messages={...}>` throws
 * `Error: The current scope does not have a "tools" property.` the instant
 * ANY assistant message renders (not just tool-call ones) —
 * `ReadonlyThreadProvider.tsx` registers only a `thread` + `composer`
 * scope, while `MessageGroupedParts.tsx` reads `s.tools.toolUIs`
 * unconditionally for every assistant message. The same finding is
 * independently recorded in `demo/aui-fixtures.ts`'s file header (written
 * for the Phase 1 visual-baseline harness) — a pre-existing upstream
 * integration gap in this installed version, not something fixable from
 * this package. `useLocalRuntime` sidesteps the gap and, as a bonus, gives
 * every Thread-based story a genuinely working composer.
 */
import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
  type RealtimeVoiceAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";

import { TooltipProvider } from "./ui/tooltip";

import "./aui.css";

/**
 * Deterministic, network-free chat model: echoes the last user message's
 * text back as a synchronous acknowledgement. No timers, no
 * `Math.random()` — every `Aui/*` story that mounts a live composer stays
 * reproducible.
 */
const ECHO_CHAT_MODEL: ChatModelAdapter = {
  run: async ({ messages }) => {
    const last = messages[messages.length - 1];
    const text = (last?.content ?? [])
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("");
    return {
      content: [
        { type: "text", text: text.length > 0 ? `Echo: ${text}` : "Got it." },
      ],
      status: { type: "complete", reason: "stop" },
    };
  },
};

/**
 * Fake, synchronous `RealtimeVoiceAdapter` — no microphone, no WebRTC, no
 * timers. `connect()` resolves the session immediately in the "running"
 * state, matching `demo/aui-fixtures.ts`'s `createFakeVoiceAdapter`.
 */
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

/**
 * The `.aui-root` scope + root `TooltipProvider` every `Aui/*` story mounts
 * under, with no runtime wired — for the standalone shadcn primitives
 * (`Button`, `Dialog`, `Avatar`, ...) that read no assistant-ui context.
 */
export function AuiRootStage({
  children,
  height,
}: {
  children: ReactNode;
  height?: number;
}) {
  return (
    <div className="aui-root" style={height !== undefined ? { height } : undefined}>
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
    </div>
  );
}

/**
 * `AuiRootStage` plus a live `useLocalRuntime` seeded from `messages` — for
 * every story that mounts `<Thread />` or a component that reads message /
 * thread context (`MarkdownText`, `ToolFallback`, `Reasoning`, the
 * attachment components, the voice surface).
 */
export function AuiThreadStage({
  messages,
  height = 480,
  voice,
  children,
}: {
  messages: readonly ThreadMessageLike[];
  height?: number;
  voice?: RealtimeVoiceAdapter;
  children: ReactNode;
}) {
  const runtime = useLocalRuntime(ECHO_CHAT_MODEL, {
    initialMessages: messages,
    ...(voice ? { adapters: { voice } } : {}),
  });
  return (
    <AuiRootStage height={height}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </AuiRootStage>
  );
}
