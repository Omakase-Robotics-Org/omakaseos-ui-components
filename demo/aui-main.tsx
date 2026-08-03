/**
 * @file Visual-regression demo page for the `src/aui/` surface.
 *
 * This page was built as the safety net for the Tailwind v4 -> CSS Modules
 * migration of `src/aui/`: every scene below mounts real (unmodified)
 * aui components against fixed, network-free fixtures so
 * `spec/aui-visual.e2e.spec.ts` can capture screenshot + computed-style
 * baselines. Phase 1 captured those baselines against the Tailwind
 * implementation; Phase 2 migrated `src/aui/` to plain CSS Modules and
 * re-ran the same spec against the new implementation, diffing against
 * the committed baselines byte-for-byte. This page keeps running the same
 * role afterward — any future `src/aui/` change re-proves itself against
 * the same committed baselines.
 *
 * Deliberately a SEPARATE page from `demo/main.tsx` / `demo/index.html`:
 * that harness renders the v0.1-v0.5 `--ds-*` token primitives and has
 * nothing to do with the aui surface. This page is the only place in the
 * demo app that imports `src/aui/aui.css` (shadcn theme tokens + the
 * `.aui-root`-scoped preflight), matching how a real consumer imports it
 * exactly once at app entry (see
 * `source/service/packages/web/src/apps/customer/main.tsx`).
 *
 * Determinism rules followed throughout this file (see
 * `omksos_web/reports/aui-css-modules/README.md` for the
 * full rationale):
 *   - No network calls, no `setTimeout`/`setInterval`, no `Math.random()`.
 *   - Every `<Thread />` is driven by `useExternalStoreRuntime` (NOT
 *     `ReadonlyThreadProvider`, which throws on any assistant message —
 *     see `demo/aui-fixtures.ts` header comment).
 *   - Genuinely animated content (the WebGL voice orb; the tool/reasoning
 *     "running" shimmer + spinner) is captured but MASKED in the
 *     screenshot spec rather than faked into a fully static equivalent —
 *     the components themselves are the thing under test.
 */
import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  AssistantRuntimeProvider,
  useComposerRuntime,
  useExternalStoreRuntime,
  type AppendMessage,
  type RealtimeVoiceAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";

import { Thread } from "../src/aui/thread";
import { Button } from "../src/aui/ui/button";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "../src/aui/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../src/aui/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../src/aui/ui/tooltip";
// `AttachmentUI` (src/aui/attachment.tsx) renders a bare `<Tooltip>` with no
// ancestor `TooltipProvider` of its own (unlike `TooltipIconButton`, which
// wraps one per-instance) — it assumes the consuming app supplies exactly
// one `TooltipProvider` near the app root, the common shadcn/radix
// integration shape. Without it, mounting any attachment throws
// `Tooltip must be used within TooltipProvider`. `<App>` below wraps its
// whole tree in one root-level `<TooltipProvider>`, matching what a real
// consumer's app entry is expected to do.
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../src/aui/ui/dialog";
import { VoiceControl, VoiceOrb } from "../src/aui/voice";
import type { VoiceOrbState } from "../src/aui/voice";

import {
  ATTACHMENTS_MESSAGES,
  COMPOSER_IDLE_MESSAGES,
  COMPOSER_RUNNING_MESSAGES,
  CONVERSATION_MESSAGES,
  EMPTY_MESSAGES,
  MARKDOWN_MESSAGES,
  REASONING_MESSAGES,
  TINY_PNG_DATA_URI,
  TOOL_CALLS_MESSAGES,
  TOOL_GROUP_MESSAGES,
  createFakeVoiceAdapter,
} from "./aui-fixtures";

import "../src/aui/aui.css";
import "./aui-page.css";

// ---------------------------------------------------------------------------
// Scene shell
// ---------------------------------------------------------------------------

function Scene({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="demo-scene" data-scene={id}>
      <header className="demo-scene-header">
        <h2>{title}</h2>
        {note && <p className="demo-scene-note">{note}</p>}
      </header>
      <div className="demo-scene-body">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Thread runtime factory — one useExternalStoreRuntime per scene, seeded
// from a fixed ThreadMessageLike[] fixture. `onNew` is a deterministic,
// synchronous echo (no network) so composer-submit scenes stay reachable,
// but the visual baseline spec never has to depend on it settling.
// ---------------------------------------------------------------------------

function useDemoRuntime(
  initialMessages: ThreadMessageLike[],
  options?: {
    voice?: RealtimeVoiceAdapter;
  },
) {
  const [messages, setMessages] = useState<ThreadMessageLike[]>(initialMessages);

  const onNew = useCallback(async (message: AppendMessage) => {
    const text = message.content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("");
    setMessages((prev) => [
      ...prev,
      { id: `sent-${String(prev.length)}`, role: "user", content: text || "(empty)" },
      {
        id: `ack-${String(prev.length)}`,
        role: "assistant",
        status: { type: "complete", reason: "stop" },
        content: "Got it.",
      },
    ]);
  }, []);

  return useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    convertMessage: (m) => m,
    onNew,
    // Without `onEdit` the legacy external-store runtime throws "Runtime
    // does not support editing." the moment `ActionBarPrimitive.Edit` is
    // clicked (confirmed by reading the pageerror directly). Reusing `onNew`
    // is enough to make the EditComposer UI reachable for the visual
    // baseline — this demo doesn't need real edit-branch semantics.
    onEdit: onNew,
    ...(options?.voice ? { adapters: { voice: options.voice } } : {}),
  });
}

function ThreadFrame({
  messages,
  height = 460,
  voice,
  children,
}: {
  messages: ThreadMessageLike[];
  height?: number;
  voice?: RealtimeVoiceAdapter;
  children?: ReactNode;
}) {
  const runtime = useDemoRuntime(messages, { voice });
  return (
    <div className="demo-thread-frame" style={{ height }}>
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread />
        {children}
      </AssistantRuntimeProvider>
    </div>
  );
}

/**
 * Seeds one image attachment into the live composer on mount via
 * `composerRuntime.addAttachment({ name, type, content })` — the
 * `CreateAttachment` overload needs no `AttachmentAdapter` at all (see
 * `base-composer-runtime-core.ts`). Guarded with a ref so React 19
 * StrictMode's dev-only double-invoke of effects does not seed the
 * attachment twice.
 */
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

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

function ThreadEmptyScene() {
  return (
    <Scene
      id="thread-empty"
      title="Thread — welcome / empty state"
      note="0 messages: Welcome heading, centered composer. (No suggestion chips — see gap note in the visual-baseline report: the legacy useExternalStoreRuntime this Thread is built against never wires an adapter's suggestions into the scope ThreadPrimitive.Suggestions reads.)"
    >
      <ThreadFrame messages={EMPTY_MESSAGES} height={420} />
    </Scene>
  );
}

function ThreadConversationScene() {
  return (
    <Scene
      id="thread-conversation"
      title="Thread — multi-turn conversation"
      note="Docked composer, default-visible action bar on the last turn, edit action on user turns."
    >
      <ThreadFrame messages={CONVERSATION_MESSAGES} height={520} />
    </Scene>
  );
}

function ThreadMarkdownScene() {
  return (
    <Scene
      id="thread-markdown"
      title="Thread — markdown rendering"
      note="Headings, emphasis, inline code, fenced code block, lists, table, link, blockquote, hr (remark-gfm)."
    >
      <ThreadFrame messages={MARKDOWN_MESSAGES} height={1800} />
    </Scene>
  );
}

function ThreadToolCallsScene() {
  return (
    <Scene
      id="thread-tool-calls"
      title="Thread — ToolFallback states"
      note="get_weather (complete), search_docs (error), delete_resource (requires-action/approval), scan_inventory (running, frozen+masked)."
    >
      <ThreadFrame messages={TOOL_CALLS_MESSAGES} height={640} />
    </Scene>
  );
}

function ThreadToolGroupScene() {
  return (
    <Scene
      id="thread-tool-group"
      title="Thread — tool-group (3 consecutive complete tool-calls)"
      note="groupPartByType groups consecutive tool-call parts into a single ToolGroupRoot/Trigger/Content disclosure."
    >
      <ThreadFrame messages={TOOL_GROUP_MESSAGES} height={420} />
    </Scene>
  );
}

function ThreadReasoningScene() {
  return (
    <Scene
      id="thread-reasoning"
      title="Thread — reasoning groups"
      note="First turn: done, collapsed by default. Second turn: frozen 'running' — auto-open preview + shimmer, masked."
    >
      <ThreadFrame messages={REASONING_MESSAGES} height={620} />
    </Scene>
  );
}

function ThreadAttachmentsScene() {
  return (
    <Scene
      id="thread-attachments"
      title="Thread — attachments"
      note="Sent user message: image + document attachment (preview dialog on the image). Composer: one seeded, unsent image attachment."
    >
      <ThreadFrame messages={ATTACHMENTS_MESSAGES} height={780}>
        <ComposerAttachmentSeeder />
      </ThreadFrame>
    </Scene>
  );
}

function ThreadComposerStatesScene() {
  return (
    <Scene
      id="thread-composer-states"
      title="Thread — composer states (idle)"
      note="Empty vs typed input; Send button visible when not running (see thread-composer-running for the Cancel/stop swap)."
    >
      <ThreadFrame messages={COMPOSER_IDLE_MESSAGES} height={420} />
    </Scene>
  );
}

function ThreadComposerRunningScene() {
  return (
    <Scene
      id="thread-composer-running"
      title="Thread — composer while running (frozen)"
      note="Last assistant message is frozen mid-run: thread.isRunning derives true, Composer swaps Send for Cancel."
    >
      <ThreadFrame messages={COMPOSER_RUNNING_MESSAGES} height={420} />
    </Scene>
  );
}

const VOICE_ORB_STATES: VoiceOrbState[] = [
  "idle",
  "connecting",
  "listening",
  "speaking",
  "muted",
];

function ThreadVoiceScene() {
  const voiceAdapter = useRef(createFakeVoiceAdapter()).current;
  return (
    <Scene
      id="thread-voice"
      title="Voice surface"
      note="VoiceControl (fake, synchronous adapter — no mic/WebRTC) + VoiceOrb state swatches. Orb canvas is WebGL-animated and masked in screenshots."
    >
      <AssistantRuntimeProvider
        runtime={useDemoRuntime(EMPTY_MESSAGES, { voice: voiceAdapter })}
      >
        <div className="demo-thread-frame" style={{ height: 120 }}>
          <div className="aui-root">
            <VoiceControl />
          </div>
        </div>
        {/* VoiceOrb calls `useVoiceState()` unconditionally even when a
            `state` prop is supplied (see src/aui/voice.tsx) — the swatch
            grid below needs the same AssistantRuntimeProvider ancestor, not
            just the VoiceControl block above. */}
        <div className="demo-voice-orb-grid" data-testid="voice-orb-grid">
          {VOICE_ORB_STATES.map((state) => (
            <figure key={state} className="demo-voice-orb-swatch" data-testid={`voice-orb-${state}`}>
              <div className="aui-root">
                <VoiceOrb state={state} />
              </div>
              <figcaption>{state}</figcaption>
            </figure>
          ))}
        </div>
      </AssistantRuntimeProvider>
    </Scene>
  );
}

function PrimitivesScene() {
  const [collapsibleOpen, setCollapsibleOpen] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <Scene
      id="primitives"
      title="Low-level ui/* primitives"
      note="Button variants x sizes, Avatar sizes/fallback/badge/group, Tooltip (forced open), Dialog (click-triggered, closed by default), Collapsible (open + closed)."
    >
      <div className="aui-root demo-primitives">
        <div data-testid="button-grid" className="demo-primitives-row">
          {(
            [
              "default",
              "destructive",
              "outline",
              "secondary",
              "ghost",
              "link",
            ] as const
          ).map((variant) => (
            <div key={variant} className="demo-primitives-col">
              {(["xs", "sm", "default", "lg", "icon"] as const).map((size) => (
                <Button
                  key={size}
                  variant={variant}
                  size={size}
                  data-testid={`button-${variant}-${size}`}
                >
                  {size === "icon" ? "B" : `${variant} ${size}`}
                </Button>
              ))}
            </div>
          ))}
        </div>

        <div data-testid="avatar-row" className="demo-primitives-row">
          <Avatar size="sm" data-testid="avatar-sm">
            <AvatarImage src={TINY_PNG_DATA_URI} alt="" />
          </Avatar>
          <Avatar size="default" data-testid="avatar-default">
            <AvatarImage src={TINY_PNG_DATA_URI} alt="" />
          </Avatar>
          <Avatar size="lg" data-testid="avatar-lg">
            <AvatarImage src={TINY_PNG_DATA_URI} alt="" />
          </Avatar>
          <Avatar data-testid="avatar-fallback">
            <AvatarFallback>OP</AvatarFallback>
          </Avatar>
          <Avatar data-testid="avatar-badge">
            <AvatarFallback>G1</AvatarFallback>
            <AvatarBadge />
          </Avatar>
          <AvatarGroup data-testid="avatar-group">
            <Avatar>
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>B</AvatarFallback>
            </Avatar>
            <AvatarGroupCount>+3</AvatarGroupCount>
          </AvatarGroup>
        </div>

        <div data-testid="collapsible-block" className="demo-primitives-row">
          <Collapsible open={false} data-testid="collapsible-closed">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                Closed collapsible
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p>Hidden content</p>
            </CollapsibleContent>
          </Collapsible>
          <Collapsible
            open={collapsibleOpen}
            onOpenChange={setCollapsibleOpen}
            data-testid="collapsible-open"
          >
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                Open collapsible
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p>Visible content — forced open via a controlled prop.</p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Tooltip content and Dialog content portal to document.body — kept
          out of `.demo-primitives` above, addressed directly by test id in
          the visual spec. `side="right"` (rather than the default "top")
          keeps the force-open tooltip from floating up and over the
          Collapsible row directly above it in this page's layout. */}
      <div className="aui-root demo-primitives-floating">
        <TooltipProvider>
          <Tooltip open>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" data-testid="tooltip-trigger">
                Hover target
              </Button>
            </TooltipTrigger>
            <TooltipContent data-testid="tooltip-content" side="right">
              Forced-open tooltip content
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Unlike Tooltip above, Dialog's overlay is `fixed inset-0` — if
            left force-open for the page's whole lifetime it would tint
            every OTHER scene's screenshot gray. So this one stays closed by
            default (controlled `open` state) and the visual spec clicks
            `dialog-trigger` open, screenshots, then closes it again before
            moving to the next scene. */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" data-testid="dialog-trigger">
              Open dialog
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-content">
            <DialogHeader>
              <DialogTitle>Confirm action</DialogTitle>
              <DialogDescription>
                This dialog is opened via a controlled prop for the visual
                baseline (clicked by the spec, not force-mounted).
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
              <Button size="sm">Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Scene>
  );
}

function App() {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="demo-page">
        <h1 className="demo-page-title">aui surface — visual baseline harness</h1>
        <ThreadEmptyScene />
        <ThreadConversationScene />
        <ThreadMarkdownScene />
        <ThreadToolCallsScene />
        <ThreadToolGroupScene />
        <ThreadReasoningScene />
        <ThreadAttachmentsScene />
        <ThreadComposerStatesScene />
        <ThreadComposerRunningScene />
        <ThreadVoiceScene />
        <PrimitivesScene />
      </div>
    </TooltipProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
