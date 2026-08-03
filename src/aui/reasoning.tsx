"use client";

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import {
  useScrollLock,
  useAuiState,
  type ReasoningMessagePartComponent,
  type ReasoningGroupComponent,
} from "@assistant-ui/react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import styles from "./reasoning.module.css";

const ANIMATION_DURATION = 200;

const ReasoningPreviewContext = createContext(false);

const reasoningVariants = cva(styles.root, {
  variants: {
    variant: {
      outline: styles.rootOutline,
      ghost: "",
      muted: styles.rootMuted,
    },
  },
  defaultVariants: {
    variant: "outline",
  },
});

export type ReasoningRootProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  "open" | "onOpenChange"
> &
  VariantProps<typeof reasoningVariants> & {
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

function ReasoningRoot({
  className,
  variant,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
  streaming,
  children,
  ...props
}: ReasoningRootProps) {
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const initialOpenRef = useRef(defaultOpen);
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled
    ? controlledOpen
    : (userOpen ?? streaming ?? initialOpenRef.current);
  const isAutoMode = isControlled || userOpen === null;
  const isPreview = streaming === true && isOpen && isAutoMode;

  const prevStreamingRef = useRef(streaming);
  useLayoutEffect(() => {
    if (prevStreamingRef.current === streaming) return;
    prevStreamingRef.current = streaming;
    if (!isControlled && userOpen === null) lockScroll();
  }, [streaming, isControlled, userOpen, lockScroll]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      lockScroll();
      if (!isControlled) {
        setUserOpen(open);
      }
      controlledOnOpenChange?.(open);
    },
    [lockScroll, isControlled, controlledOnOpenChange],
  );

  return (
    <Collapsible
      ref={collapsibleRef}
      data-slot="reasoning-root"
      data-variant={variant}
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn("aui-reasoning-root", reasoningVariants({ variant, className }))}
      style={
        {
          "--animation-duration": `${ANIMATION_DURATION}ms`,
        } as React.CSSProperties
      }
      {...props}
    >
      <ReasoningPreviewContext.Provider value={isPreview}>
        {children}
      </ReasoningPreviewContext.Provider>
    </Collapsible>
  );
}

function ReasoningFade({
  side = "bottom",
  className,
  ...props
}: React.ComponentProps<"div"> & { side?: "top" | "bottom" }) {
  return (
    <div
      data-slot="reasoning-fade"
      className={cn(
        "aui-reasoning-fade",
        side === "top" ? styles.fadeTop : styles.fadeBottom,
        className,
      )}
      {...props}
    />
  );
}

function ReasoningTrigger({
  active,
  duration,
  className,
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & {
  active?: boolean;
  duration?: number;
}) {
  const durationText = duration ? ` (${duration}s)` : "";

  return (
    <CollapsibleTrigger
      data-slot="reasoning-trigger"
      className={cn("aui-reasoning-trigger", styles.trigger, className)}
      {...props}
    >
      <BrainIcon
        data-slot="reasoning-trigger-icon"
        className={cn("aui-reasoning-trigger-icon", styles.triggerIcon)}
      />
      <span
        data-slot="reasoning-trigger-label"
        className={cn(
          "aui-reasoning-trigger-label-wrapper",
          styles.labelWrapper,
        )}
      >
        <span>Reasoning{durationText}</span>
        {active ? (
          <span
            aria-hidden
            data-slot="reasoning-trigger-shimmer"
            className={cn("aui-reasoning-trigger-shimmer", styles.shimmer)}
          >
            Reasoning{durationText}
          </span>
        ) : null}
      </span>
      <ChevronDownIcon
        data-slot="reasoning-trigger-chevron"
        className={cn("aui-reasoning-trigger-chevron", styles.chevron)}
      />
    </CollapsibleTrigger>
  );
}

function ReasoningContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  const isPreview = useContext(ReasoningPreviewContext);

  return (
    <CollapsibleContent
      data-slot="reasoning-content"
      className={cn("aui-reasoning-content", styles.content, className)}
      {...props}
    >
      {isPreview ? <ReasoningFade side="top" /> : null}
      {children}
      <ReasoningFade />
    </CollapsibleContent>
  );
}

function ReasoningText({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const isPreview = useContext(ReasoningPreviewContext);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPreview) return;
    const scrollEl = scrollRef.current;
    const contentEl = contentRef.current;
    if (!scrollEl || !contentEl) return;
    const pin = () => {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    };
    pin();
    const observer = new ResizeObserver(pin);
    observer.observe(contentEl);
    return () => observer.disconnect();
  }, [isPreview]);

  return (
    <div
      ref={scrollRef}
      data-slot="reasoning-text"
      className={cn("aui-reasoning-text", styles.text, className)}
      {...props}
    >
      <div
        ref={contentRef}
        className={cn("aui-reasoning-text-content", styles.textContent)}
      >
        {children}
      </div>
    </div>
  );
}

const ReasoningImpl: ReasoningMessagePartComponent = () => <MarkdownText />;

const ReasoningGroupImpl: ReasoningGroupComponent = ({
  children,
  startIndex,
  endIndex,
}) => {
  const isReasoningStreaming = useAuiState((s) => {
    if (s.message.status?.type !== "running") return false;
    const lastIndex = s.message.parts.length - 1;
    if (lastIndex < 0) return false;
    const lastType = s.message.parts[lastIndex]?.type;
    if (lastType !== "reasoning") return false;
    return lastIndex >= startIndex && lastIndex <= endIndex;
  });

  return (
    <ReasoningRoot streaming={isReasoningStreaming}>
      <ReasoningTrigger active={isReasoningStreaming} />
      <ReasoningContent aria-busy={isReasoningStreaming}>
        <ReasoningText>{children}</ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  );
};

const Reasoning = memo(
  ReasoningImpl,
) as unknown as ReasoningMessagePartComponent & {
  Root: typeof ReasoningRoot;
  Trigger: typeof ReasoningTrigger;
  Content: typeof ReasoningContent;
  Text: typeof ReasoningText;
  Fade: typeof ReasoningFade;
};

Reasoning.displayName = "Reasoning";
Reasoning.Root = ReasoningRoot;
Reasoning.Trigger = ReasoningTrigger;
Reasoning.Content = ReasoningContent;
Reasoning.Text = ReasoningText;
Reasoning.Fade = ReasoningFade;

/**
 * @deprecated This wrapper targets the legacy `components.ReasoningGroup`
 * prop on `<MessagePrimitive.Parts>`. Use `<MessagePrimitive.GroupedParts>`
 * with a `groupBy` returning `"group-reasoning"` and compose `ReasoningRoot`
 * / `ReasoningTrigger` / `ReasoningContent` / `ReasoningText` directly.
 * See `thread.tsx` for an example.
 */
const ReasoningGroup = memo(ReasoningGroupImpl);
ReasoningGroup.displayName = "ReasoningGroup";

export {
  Reasoning,
  ReasoningGroup,
  ReasoningRoot,
  ReasoningTrigger,
  ReasoningContent,
  ReasoningText,
  ReasoningFade,
  reasoningVariants,
};
