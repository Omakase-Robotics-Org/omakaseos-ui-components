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
export { Thread } from './thread';
export type { ThreadProps, ThreadComponents, ThreadGroupPart } from './thread';
export { MarkdownText } from './markdown-text';
export { ToolFallback } from './tool-fallback';
export type { ToolFallbackRootProps } from './tool-fallback';
export { ToolGroupRoot, ToolGroupTrigger, ToolGroupContent, } from './tool-group';
export type { ToolGroupRootProps } from './tool-group';
export { Reasoning, ReasoningRoot, ReasoningTrigger, ReasoningContent, ReasoningText, } from './reasoning';
export { ComposerAddAttachment, ComposerAttachments, UserMessageAttachments, } from './attachment';
export { VoiceOrb, VoiceControl, VoiceStatusDot, VoiceConnectButton, VoiceMuteButton, VoiceDisconnectButton, deriveVoiceOrbState, } from './voice';
export type { VoiceOrbProps, VoiceOrbState, VoiceOrbVariant, } from './voice';
export { TooltipIconButton } from './tooltip-icon-button';
export { Button, buttonVariants } from './ui/button';
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from './ui/tooltip';
export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger, } from './ui/dialog';
export { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
export { cn } from './lib/cn';
export { ReadonlyThreadProvider, AssistantRuntimeProvider, fromThreadMessageLike, useLocalRuntime, } from '@assistant-ui/react';
export type { ThreadMessage, ThreadMessageLike, ChatModelAdapter, ChatModelRunOptions, ChatModelRunResult, } from '@assistant-ui/react';
