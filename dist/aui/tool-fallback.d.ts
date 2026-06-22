import { ToolCallMessagePart, ToolCallMessagePartProps, ToolCallMessagePartStatus, ToolCallMessagePartComponent } from '@assistant-ui/react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
export type ToolFallbackRootProps = Omit<React.ComponentProps<typeof Collapsible>, "open" | "onOpenChange"> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
};
declare function ToolFallbackRoot({ className, open: controlledOpen, onOpenChange: controlledOnOpenChange, defaultOpen, children, ...props }: ToolFallbackRootProps): import("react").JSX.Element;
declare function ToolFallbackTrigger({ toolName, status, className, ...props }: React.ComponentProps<typeof CollapsibleTrigger> & {
    toolName: string;
    status?: ToolCallMessagePartStatus;
}): import("react").JSX.Element;
declare function ToolFallbackContent({ className, children, ...props }: React.ComponentProps<typeof CollapsibleContent>): import("react").JSX.Element;
declare function ToolFallbackArgs({ argsText, className, ...props }: React.ComponentProps<"div"> & {
    argsText?: string;
}): import("react").JSX.Element | null;
declare function ToolFallbackResult({ result, className, ...props }: React.ComponentProps<"div"> & {
    result?: unknown;
}): import("react").JSX.Element | null;
declare function ToolFallbackError({ status, className, ...props }: React.ComponentProps<"div"> & {
    status?: ToolCallMessagePartStatus;
}): import("react").JSX.Element | null;
declare function ToolFallbackApproval({ className, addResult, resume, interrupt, approval, respondToApproval, ...props }: React.ComponentProps<"div"> & Partial<Pick<ToolCallMessagePartProps, "addResult" | "resume" | "respondToApproval">> & {
    interrupt?: ToolCallMessagePart["interrupt"];
    approval?: ToolCallMessagePart["approval"];
}): import("react").JSX.Element | null;
declare const ToolFallback: ToolCallMessagePartComponent & {
    Root: typeof ToolFallbackRoot;
    Trigger: typeof ToolFallbackTrigger;
    Content: typeof ToolFallbackContent;
    Args: typeof ToolFallbackArgs;
    Result: typeof ToolFallbackResult;
    Error: typeof ToolFallbackError;
    Approval: typeof ToolFallbackApproval;
};
export { ToolFallback, ToolFallbackRoot, ToolFallbackTrigger, ToolFallbackContent, ToolFallbackArgs, ToolFallbackResult, ToolFallbackError, ToolFallbackApproval, };
