/**
 * @file Canonical assistant-ui primitives — v0.6 sub-entry.
 *
 * This module ships the shadcn-style "registry" components from
 * <https://www.assistant-ui.com/registry> as a vendored copy. The
 * verdict on why a vendored copy (rather than a hand-rolled wrapper)
 * lives in `omksos_web/reports/ui-components-aui-canonical-lift/README.md`:
 *
 *   - `Thread` is a shell of state-bound primitives (Composer,
 *     ScrollToBottom, GroupedParts, ActionBar, BranchPicker,
 *     Suggestions, Welcome) — re-implementing it in CSS Modules
 *     would amount to a parallel registry. We don't.
 *   - `MarkdownText` binds to `@assistant-ui/react-markdown` plumbing
 *     that the Thread expects. Same reason.
 *   - The visual ground truth is `@theme inline` shadcn theme tokens
 *     (--background, --foreground, --primary, --muted, --border, …)
 *     and Tailwind v4 utility classes. We bring Tailwind into THIS
 *     package only — consumers `import "@omakase-robotics/ui-components/aui/aui.css"`
 *     once and don't need their own Tailwind toolchain.
 *
 * Lift baseline (registry tag) + how to refresh:
 *   `npx shadcn@latest add https://r.assistant-ui.com/thread.json`
 *   (run inside `assistant-ui-replacement-poc/app/` to overwrite the
 *    vendored copy, then propagate diffs into THIS directory).
 *
 * Public surface (named exports) is the contract the body web app and
 * status_server_webui consume. Adding a new export is non-breaking;
 * removing or renaming one is a v0.7 break.
 */

// Side-effect import: tokens + scoped `.aui-root` preflight. Vite's library
// build extracts every CSS import reachable from this entry into ONE
// stylesheet (see vite.aui.config.ts `build.lib.cssFileName`), so this
// import is what pulls `aui.css` itself — plus every component's own
// `*.module.css` pulled in transitively below — into `dist/aui/aui.css`.
import "./aui.css";

// Thread shell.
export { Thread } from "./thread";
export type { ThreadProps, ThreadComponents, ThreadGroupPart } from "./thread";

// Markdown.
export { MarkdownText } from "./markdown-text";

// Tool-call rendering.
export { ToolFallback } from "./tool-fallback";
export type { ToolFallbackRootProps } from "./tool-fallback";
export {
  ToolGroupRoot,
  ToolGroupTrigger,
  ToolGroupContent,
} from "./tool-group";
export type { ToolGroupRootProps } from "./tool-group";

// Reasoning (chain-of-thought) rendering.
export {
  Reasoning,
  ReasoningRoot,
  ReasoningTrigger,
  ReasoningContent,
  ReasoningText,
} from "./reasoning";

// Composer / message attachment rendering.
export {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "./attachment";

// Voice (Realtime) — the orb visual + composer mic affordances.
export {
  VoiceOrb,
  VoiceControl,
  VoiceStatusDot,
  VoiceConnectButton,
  VoiceMuteButton,
  VoiceDisconnectButton,
  deriveVoiceOrbState,
} from "./voice";
export type {
  VoiceOrbProps,
  VoiceOrbState,
  VoiceOrbVariant,
} from "./voice";

// Iconographic button used inside the surface; useful for parity inside
// consumer-built rows that sit next to the Thread.
export { TooltipIconButton } from "./tooltip-icon-button";

// shadcn primitives the surface depends on; re-exported so consumers can
// build adjacent affordances (e.g. menus, modals) using the same vocabulary.
export { Button, buttonVariants } from "./ui/button";
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
export { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

// className composer (clsx). Exposed so a consumer composing classNames
// alongside the surface picks the same util the surface itself uses —
// avoids drift.
export { cn } from "./lib/cn";

// Canonical read-only thread mount — re-exported from @assistant-ui/react
// so consumers that only render archived transcripts (e.g. the body web
// app's conversations page) don't need their own direct dependency on
// @assistant-ui/react. Pair with <Thread /> from this same module:
//
//   <ReadonlyThreadProvider messages={threadMessages}>
//     <Thread />
//   </ReadonlyThreadProvider>
//
// The provider wires a readonly runtime into the same hooks <Thread />
// listens to. Composer / Send remain mounted but are no-ops, which is
// the upstream's canonical posture for archived conversations.
export {
  ReadonlyThreadProvider,
  AssistantRuntimeProvider,
  fromThreadMessageLike,
  useLocalRuntime,
} from "@assistant-ui/react";
export type {
  ThreadMessage,
  ThreadMessageLike,
  ChatModelAdapter,
  ChatModelRunOptions,
  ChatModelRunResult,
} from "@assistant-ui/react";
