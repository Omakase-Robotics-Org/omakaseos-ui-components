import { VariantProps } from 'class-variance-authority';
import { ReasoningMessagePartComponent } from '@assistant-ui/react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
declare const reasoningVariants: (props?: ({
    variant?: "outline" | "ghost" | "muted" | null | undefined;
} & import('class-variance-authority/types').ClassProp) | undefined) => string;
export type ReasoningRootProps = Omit<React.ComponentProps<typeof Collapsible>, "open" | "onOpenChange"> & VariantProps<typeof reasoningVariants> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
    /**
     * Whether the reasoning is currently streaming. When provided, it
     * supersedes `defaultOpen`: the disclosure auto-opens while streaming
     * with a bottom-pinned live preview, auto-collapses when streaming
     * ends, and the first manual toggle takes over permanently.
     */
    streaming?: boolean;
};
declare function ReasoningRoot({ className, variant, open: controlledOpen, onOpenChange: controlledOnOpenChange, defaultOpen, streaming, children, ...props }: ReasoningRootProps): import("react").JSX.Element;
declare function ReasoningFade({ side, className, ...props }: React.ComponentProps<"div"> & {
    side?: "top" | "bottom";
}): import("react").JSX.Element;
declare function ReasoningTrigger({ active, duration, className, ...props }: React.ComponentProps<typeof CollapsibleTrigger> & {
    active?: boolean;
    duration?: number;
}): import("react").JSX.Element;
declare function ReasoningContent({ className, children, ...props }: React.ComponentProps<typeof CollapsibleContent>): import("react").JSX.Element;
declare function ReasoningText({ className, children, ...props }: React.ComponentProps<"div">): import("react").JSX.Element;
declare const Reasoning: ReasoningMessagePartComponent & {
    Root: typeof ReasoningRoot;
    Trigger: typeof ReasoningTrigger;
    Content: typeof ReasoningContent;
    Text: typeof ReasoningText;
    Fade: typeof ReasoningFade;
};
/**
 * @deprecated This wrapper targets the legacy `components.ReasoningGroup`
 * prop on `<MessagePrimitive.Parts>`. Use `<MessagePrimitive.GroupedParts>`
 * with a `groupBy` returning `"group-reasoning"` and compose `ReasoningRoot`
 * / `ReasoningTrigger` / `ReasoningContent` / `ReasoningText` directly.
 * See `thread.tsx` for an example.
 */
declare const ReasoningGroup: import('react').NamedExoticComponent<import('@assistant-ui/react').ReasoningGroupProps>;
export { Reasoning, ReasoningGroup, ReasoningRoot, ReasoningTrigger, ReasoningContent, ReasoningText, ReasoningFade, reasoningVariants, };
