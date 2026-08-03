"use client";

import {
  memo,
  useCallback,
  useRef,
  useState,
  type FC,
  type PropsWithChildren,
} from "react";
import { ChevronDownIcon, LoaderIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { useScrollLock } from "@assistant-ui/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import styles from "./tool-group.module.css";

const ANIMATION_DURATION = 200;

const toolGroupVariants = cva(styles.root, {
  variants: {
    variant: {
      outline: styles.rootOutline,
      ghost: "",
      muted: styles.rootMuted,
    },
  },
  defaultVariants: { variant: "outline" },
});

export type ToolGroupRootProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  "open" | "onOpenChange"
> &
  VariantProps<typeof toolGroupVariants> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
  };

function ToolGroupRoot({
  className,
  variant,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
  children,
  ...props
}: ToolGroupRootProps) {
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      lockScroll();
      if (!isControlled) {
        setUncontrolledOpen(open);
      }
      controlledOnOpenChange?.(open);
    },
    [lockScroll, isControlled, controlledOnOpenChange],
  );

  return (
    <Collapsible
      ref={collapsibleRef}
      data-slot="tool-group-root"
      data-variant={variant ?? "outline"}
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn(
        "aui-tool-group-root",
        toolGroupVariants({ variant, className }),
      )}
      style={
        {
          "--animation-duration": `${ANIMATION_DURATION}ms`,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </Collapsible>
  );
}

function ToolGroupTrigger({
  count,
  active = false,
  className,
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & {
  count: number;
  active?: boolean;
}) {
  const label = `${count} tool ${count === 1 ? "call" : "calls"}`;

  return (
    <CollapsibleTrigger
      data-slot="tool-group-trigger"
      className={cn("aui-tool-group-trigger", styles.trigger, className)}
      {...props}
    >
      {active && (
        <LoaderIcon
          data-slot="tool-group-trigger-loader"
          className={cn(
            "aui-tool-group-trigger-loader",
            styles.triggerLoader,
          )}
        />
      )}
      <span
        data-slot="tool-group-trigger-label"
        className={cn(
          "aui-tool-group-trigger-label-wrapper",
          styles.labelWrapper,
        )}
      >
        <span>{label}</span>
        {active && (
          <span
            aria-hidden
            data-slot="tool-group-trigger-shimmer"
            className={cn("aui-tool-group-trigger-shimmer", styles.shimmer)}
          >
            {label}
          </span>
        )}
      </span>
      <ChevronDownIcon
        data-slot="tool-group-trigger-chevron"
        className={cn("aui-tool-group-trigger-chevron", styles.chevron)}
      />
    </CollapsibleTrigger>
  );
}

function ToolGroupContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="tool-group-content"
      className={cn("aui-tool-group-content", styles.content, className)}
      {...props}
    >
      <div className={styles.contentInner}>{children}</div>
    </CollapsibleContent>
  );
}

type ToolGroupComponent = FC<
  PropsWithChildren<{ startIndex: number; endIndex: number }>
> & {
  Root: typeof ToolGroupRoot;
  Trigger: typeof ToolGroupTrigger;
  Content: typeof ToolGroupContent;
};

const ToolGroupImpl: FC<
  PropsWithChildren<{ startIndex: number; endIndex: number }>
> = ({ children, startIndex, endIndex }) => {
  const toolCount = endIndex - startIndex + 1;

  return (
    <ToolGroupRoot>
      <ToolGroupTrigger count={toolCount} />
      <ToolGroupContent>{children}</ToolGroupContent>
    </ToolGroupRoot>
  );
};

/**
 * @deprecated This wrapper targets the legacy `components.ToolGroup` prop
 * on `<MessagePrimitive.Parts>`. Use `<MessagePrimitive.GroupedParts>` with
 * a `groupBy` returning `"group-tool"` and compose `ToolGroupRoot` /
 * `ToolGroupTrigger` / `ToolGroupContent` directly. See `thread.tsx`.
 */
const ToolGroup = memo(ToolGroupImpl) as unknown as ToolGroupComponent;

ToolGroup.displayName = "ToolGroup";
ToolGroup.Root = ToolGroupRoot;
ToolGroup.Trigger = ToolGroupTrigger;
ToolGroup.Content = ToolGroupContent;

export {
  ToolGroup,
  ToolGroupRoot,
  ToolGroupTrigger,
  ToolGroupContent,
  toolGroupVariants,
};
