/**
 * @file Tooltip + TooltipProvider — hand-rolled hover/focus label (v0.18).
 *
 * Ported from `.codex/ref/Tooltip.tsx` (the dashboard's
 * `@radix-ui/react-tooltip` implementation this library absorbs) —
 * WITHOUT radix. The ref's own header argues a tooltip has none of
 * `Popover`/`Menu`'s surface (no owned focus, no free content, no dismiss
 * semantics to fight) so radix's hover/focus + collision-aware placement +
 * a11y wiring is the right tool THERE; this library makes the same call
 * the other direction — the collision-aware-placement half is already the
 * tested core `Popover`/`Menu` share (`src/floating/anchored-position.ts`),
 * and the remaining half (hover-intent timing, a shared open-delay clock,
 * `aria-describedby` wiring) is a small enough surface to hand-roll rather
 * than take on `@radix-ui/react-tooltip` (and `@radix-ui/react-slot`, its
 * `asChild` dependency) as this library's first radix dependency. `./aui`
 * keeps its own radix tooltip untouched; this is a separate, radix-free
 * component with no relationship to it.
 *
 * ## Deliberately DROPPED: the grace area
 *
 * Radix's `disableHoverableContent` (the ref already sets it) turns off a
 * grace area that keeps the tooltip open while the pointer travels from
 * the trigger onto the content. This port does not merely disable that
 * area — there is no code path that could reintroduce it. A label
 * tooltip carries no interactive content, so there is nothing to travel
 * onto; keeping the area structurally absent is the fix for the
 * 2026-07-08 sidebar incident (`omksos_web`
 * `reports/sidebar-collapsed-tooltip/`), where radix's grace area made a
 * collapsed-rail tooltip feel sticky under real pointer movement — a
 * defect jsdom-only coverage shipped and only a real-browser check caught.
 *
 * ## Trigger: cloned, never wrapped
 *
 * `children` must be exactly one element (`Children.only`, throws
 * otherwise — silently taking the first of several would be the same
 * banned fallback `LinkAppearance.tsx`'s `asChild` path already refuses).
 * It is `cloneElement`d, not wrapped in a `<span>`: a wrapper would change
 * the flex box a caller (a `<Link>` in a sidebar rail) lays the trigger
 * out inside. Every handler this component needs
 * (`onPointerEnter`/`onPointerLeave`/`onFocus`/`onBlur`) is CHAINED after
 * whatever handler the child already carries — overwriting it would be
 * the same silent-fallback shape, extended here from a `className` string
 * to an event handler. The child's own `ref` (if any) is composed with
 * this component's (`composeRef` below): the anchored-position core needs
 * a live DOM node to measure, and the child may already be forwarding its
 * own ref to its owner.
 *
 * ## Shared delay clock (`TooltipProvider`)
 *
 * A `TooltipProvider` ancestor holds, in a ref (not state — recording a
 * close timestamp should not itself trigger a re-render), the instant its
 * last child `Tooltip` closed. A `Tooltip` asked to open by a pointer
 * checks that clock: within `skipDelayDuration` of the last close, it
 * opens INSTANTLY and stamps `data-state="instant-open"` — the exact
 * attribute the ref's own CSS keys its no-fade rule off, ported unchanged
 * below — otherwise it waits `delayDuration`. This is what lets the
 * pointer travel down a rail of triggers with the label tracking it after
 * the first hover-intent delay. A `Tooltip` requires a `TooltipProvider`
 * ancestor UNLESS `enabled={false}` (which renders the child alone and
 * touches no tooltip machinery at all) — a missing provider throws rather
 * than silently picking a default clock, the same "no silent fallback"
 * stance the rest of this library takes.
 *
 * ## Focus/blur bypass the delay; every close is immediate
 *
 * Fidelity to radix's own behavior, not a deviation: pointer hover is the
 * only path that waits on `delayDuration`/`skipDelayDuration`. Focus opens
 * immediately (a keyboard user should not wait on a hover timer the
 * pointer never triggered); blur, pointerleave and Escape all close
 * immediately. There is no grace area or debounce on any dismissal path —
 * see "Deliberately DROPPED" above.
 *
 * ## Positioning: the shared core directly, not `useAnchoredPanel`
 *
 * `Popover` and `Menu` both consume `useAnchoredPanel`
 * (`src/floating/useAnchoredPanel.ts`), which wraps `anchoredPanelPosition`
 * in a callback-ref measure but returns only the resolved `{ top, left,
 * side }` — enough for a panel with no further geometry to draw. This
 * component's arrow (KEEP #7 below) needs one more number the hook does
 * not expose: the anchor's own cross-axis midpoint, clamped inside the
 * panel, so the arrow sits at the TRIGGER's midpoint rather than the
 * panel's. That cannot be derived from the hook's output alone (it does
 * not return the anchor rect it measured), so this component calls
 * `anchoredPanelPosition` — the same shared, tested core `Popover`/`Menu`
 * consume — directly, in its own small callback-ref measure. Only the
 * "where does a callback ref stash the result" wiring is not reused (it
 * does not fit this component's extra output); the positioning MATH
 * itself (flip, clamp) stays the one implementation in
 * `src/floating/anchored-position.ts`.
 *
 * ## Fixed non-props
 *
 * `offset: 8`, `align: "center"` are constants, not props — the same
 * "no speculative host vocabulary" stance `SegmentedMeter`/`StatusGlyph`
 * take for their own size registers. Nothing in this library's three
 * consuming apps asks for a tooltip offset or alignment other than these.
 */
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FocusEvent, PointerEvent, ReactElement, ReactNode, Ref } from "react";
import { createPortal } from "react-dom";
import { anchoredPanelPosition } from "./floating/anchored-position";
import type { AnchoredPanelPosition, Side } from "./floating/anchored-position";
import { PanelScopeReset } from "./PanelScope";
import styles from "./Tooltip.module.css";

/** Which edge of the trigger the label attaches to. */
export type TooltipSide = Side;

/** Gap between the trigger and the label, in px — see the file header's
 * "Fixed non-props". */
const TOOLTIP_OFFSET_PX = 8;
/** Keep the label's cross-axis box inside the viewport, with a small
 * margin — the same constant `Popover`/`Menu` use. */
const VIEWPORT_MARGIN_PX = 8;
/** Radix's own default `delayDuration` — the hover-intent wait before a
 * tooltip with no recently-closed sibling opens. */
const DEFAULT_DELAY_DURATION_MS = 700;
/** Radix's own default `skipDelayDuration` — how long after a close a
 * sibling tooltip still opens instantly. */
const DEFAULT_SKIP_DELAY_DURATION_MS = 300;
/** Keeps the arrow's tip clear of the panel's rounded corner
 * (`--ds-radius-control`'s 6px fallback) plus half the arrow's own
 * cross-axis footprint (5px) — the same shape as `anchored-position.ts`'s
 * viewport-margin clamp, applied against the panel's own corner instead
 * of the viewport's edge. */
const ARROW_EDGE_CLEARANCE_PX = 10;

type OpenReason = "delayed-open" | "instant-open";

/** The shared open-delay clock a `TooltipProvider` hands its descendants. */
type TooltipDelayClock = {
  readonly delayDuration: number;
  readonly skipDelayDuration: number;
  readonly getLastCloseAt: () => number | null;
  readonly setLastCloseAt: (value: number | null) => void;
};

const TooltipDelayContext = createContext<TooltipDelayClock | null>(null);

/**
 * Shares the tooltip open-delay clock across every {@link Tooltip} inside
 * it. Wrap the group of triggers (e.g. a sidebar nav rail) once — see the
 * file header's "Shared delay clock" section.
 */
export function TooltipProvider(props: {
  /** Hover-intent wait before an unrelated open. Default: radix's own
   * 700ms. */
  delayDuration?: number;
  /** How long after a close a sibling tooltip still opens instantly.
   * Default: radix's own 300ms. */
  skipDelayDuration?: number;
  children: ReactNode;
}) {
  const delayDuration = props.delayDuration ?? DEFAULT_DELAY_DURATION_MS;
  const skipDelayDuration = props.skipDelayDuration ?? DEFAULT_SKIP_DELAY_DURATION_MS;
  // A ref, not state: stamping the close instant must never itself
  // trigger a re-render of every tooltip under this provider.
  const lastCloseAtRef = useRef<number | null>(null);

  const clock = useMemo<TooltipDelayClock>(
    () => ({
      delayDuration,
      skipDelayDuration,
      getLastCloseAt: () => lastCloseAtRef.current,
      setLastCloseAt: (value) => {
        lastCloseAtRef.current = value;
      },
    }),
    [delayDuration, skipDelayDuration],
  );

  return <TooltipDelayContext.Provider value={clock}>{props.children}</TooltipDelayContext.Provider>;
}

/** Props this component may find already on the cloned child — merged,
 * never overwritten (see the file header). */
type ClonableTriggerProps = {
  onPointerEnter?: (event: PointerEvent) => void;
  onPointerLeave?: (event: PointerEvent) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  "aria-describedby"?: string;
  ref?: Ref<HTMLElement>;
};

/** Calls `theirs` (the child's own handler, if any) THEN `ours` — chaining,
 * never overwriting (see the file header's "Trigger: cloned, never
 * wrapped"). */
function chainHandlers<E>(
  theirs: ((event: E) => void) | undefined,
  ours: (event: E) => void,
): (event: E) => void {
  return (event: E) => {
    theirs?.(event);
    ours(event);
  };
}

const VERTICAL_ARROW_SIZE = { w: 10, h: 5 } as const;
const HORIZONTAL_ARROW_SIZE = { w: 5, h: 10 } as const;

/** One triangle per resolved side, drawn base-out/apex-in so it always
 * points FROM the panel TOWARD the anchor. */
const ARROW_PATH_BY_SIDE: Record<TooltipSide, string> = {
  // Panel sits ABOVE the anchor: arrow at the panel's bottom edge,
  // pointing down.
  top: "M0,0 L10,0 L5,5 Z",
  // Panel sits BELOW the anchor: arrow at the panel's top edge, pointing
  // up.
  bottom: "M0,5 L10,5 L5,0 Z",
  // Panel sits to the LEFT of the anchor: arrow at the panel's right
  // edge, pointing right.
  left: "M0,0 L0,10 L5,5 Z",
  // Panel sits to the RIGHT of the anchor: arrow at the panel's left
  // edge, pointing left.
  right: "M5,0 L5,10 L0,5 Z",
};

/** The inline SVG arrow — KEEP #7: follows the RESOLVED side (post-flip),
 * positioned on the cross axis at the trigger's own midpoint (clamped
 * clear of the panel's corner radius by the caller). */
function TooltipArrow(props: { side: TooltipSide; crossOffset: number }) {
  const vertical = props.side === "top" || props.side === "bottom";
  const size = vertical ? VERTICAL_ARROW_SIZE : HORIZONTAL_ARROW_SIZE;
  const crossStyle = vertical
    ? { left: props.crossOffset - size.w / 2 }
    : { top: props.crossOffset - size.h / 2 };
  return (
    <svg
      className={styles.arrow}
      data-side={props.side}
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
      style={crossStyle}
      aria-hidden="true"
    >
      <path d={ARROW_PATH_BY_SIDE[props.side]} />
    </svg>
  );
}

export type TooltipProps = {
  /** Text shown in the floating label. */
  label: string;
  /** Which edge of the trigger the label attaches to. Default `"top"`. */
  side?: TooltipSide;
  /**
   * Whether the tooltip is active. Default `true`. When `false` the
   * trigger renders alone with no tooltip — for a trigger whose label is
   * hidden only in some states (e.g. a collapsed sidebar rail, where the
   * expanded rail already shows the label inline), so the caller keeps
   * one child element instead of branching the JSX. Does not require a
   * `TooltipProvider` ancestor.
   */
  enabled?: boolean;
  /** The trigger element the label describes — exactly one. */
  children: ReactElement;
};

/**
 * Wraps a trigger element with a floating label shown on hover/focus. See
 * the file header for the full set of decisions this hand-rolled port
 * makes.
 *
 * Usage contract: the tooltip never CARRIES the trigger's accessible
 * name — it only DESCRIBES it (`aria-describedby`, present while open,
 * absent while closed). A consumer whose trigger has no visible text (an
 * icon-only button) must set its own `aria-label`; a screen reader that
 * announces only the description and never the name would leave the
 * control unnamed.
 */
export function Tooltip(props: TooltipProps): ReactElement {
  const label = props.label;
  const side = props.side ?? "top";
  const enabled = props.enabled ?? true;

  const only = Children.only(props.children);
  if (!isValidElement(only)) {
    throw new Error("Tooltip: children must be exactly one valid React element.");
  }
  const child = only as ReactElement<ClonableTriggerProps>;

  const clock = useContext(TooltipDelayContext);
  const tooltipId = useId();
  const anchorRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const openTimerRef = useRef<number | null>(null);

  // The child's own ref (if it forwards one), re-read every render so the
  // stable `composeRef` callback below always composes the LATEST one.
  const originalChildRefRef = useRef<Ref<HTMLElement> | undefined>(undefined);
  originalChildRefRef.current = child.props.ref;

  const [open, setOpen] = useState(false);
  const [openReason, setOpenReason] = useState<OpenReason>("delayed-open");
  const [position, setPosition] = useState<AnchoredPanelPosition | null>(null);
  const [arrowCrossOffset, setArrowCrossOffset] = useState<number | null>(null);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const openNow = useCallback((reason: OpenReason) => {
    setOpenReason(reason);
    setOpen(true);
  }, []);

  // KEEP #4: leave/blur/Escape all close immediately — no grace area, no
  // debounce (see the file header).
  const closeNow = useCallback(() => {
    clearOpenTimer();
    setOpen(false);
    clock?.setLastCloseAt(Date.now());
  }, [clearOpenTimer, clock]);

  // KEEP #2 + #3: pointer hover waits `delayDuration`, UNLESS a sibling
  // closed within `skipDelayDuration` — then it opens instantly.
  const requestHoverOpen = useCallback(() => {
    if (open || clock === null) {
      return;
    }
    const lastCloseAt = clock.getLastCloseAt();
    const now = Date.now();
    if (lastCloseAt !== null && now - lastCloseAt <= clock.skipDelayDuration) {
      openNow("instant-open");
      return;
    }
    clearOpenTimer();
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      openNow("delayed-open");
    }, clock.delayDuration);
  }, [open, clock, clearOpenTimer, openNow]);

  // KEEP #5: focus opens with no delay at all.
  const requestFocusOpen = useCallback(() => {
    if (open) {
      return;
    }
    clearOpenTimer();
    openNow("delayed-open");
  }, [open, clearOpenTimer, openNow]);

  // KEEP #4: pointerleave/blur. If not yet open, this cancels a still-
  // pending hover-intent timer instead (the pointer left before the delay
  // elapsed, so it must never fire).
  const requestClose = useCallback(() => {
    if (open) {
      closeNow();
      return;
    }
    clearOpenTimer();
  }, [open, closeNow, clearOpenTimer]);

  // KEEP #7: measure the anchor + panel directly against the shared core
  // (see the file header's "Positioning" section for why not
  // `useAnchoredPanel`).
  const measurePanel = useCallback(
    (panel: HTMLDivElement | null) => {
      panelRef.current = panel;
      const anchor = anchorRef.current;
      if (panel === null || anchor === null) {
        return;
      }
      const anchorRect = anchor.getBoundingClientRect();
      const panelSize = { w: panel.offsetWidth, h: panel.offsetHeight };
      const resolved = anchoredPanelPosition(anchorRect, panelSize, {
        side,
        align: "center",
        offset: TOOLTIP_OFFSET_PX,
        margin: VIEWPORT_MARGIN_PX,
        viewport: { w: window.innerWidth, h: window.innerHeight },
      });
      setPosition(resolved);

      const vertical = resolved.side === "top" || resolved.side === "bottom";
      const anchorCrossMid = vertical
        ? (anchorRect.left + anchorRect.right) / 2
        : (anchorRect.top + anchorRect.bottom) / 2;
      const panelCrossStart = vertical ? resolved.left : resolved.top;
      const panelCrossSize = vertical ? panelSize.w : panelSize.h;
      const lo = ARROW_EDGE_CLEARANCE_PX;
      const hi = Math.max(panelCrossSize - ARROW_EDGE_CLEARANCE_PX, lo);
      setArrowCrossOffset(Math.min(Math.max(anchorCrossMid - panelCrossStart, lo), hi));
    },
    [side],
  );

  // Composes this component's own anchor ref with whatever ref the child
  // already forwards — see the file header's "Trigger: cloned, never
  // wrapped".
  const composeRef = useCallback((node: HTMLElement | null) => {
    anchorRef.current = node;
    const originalRef = originalChildRefRef.current;
    if (typeof originalRef === "function") {
      originalRef(node);
    } else if (originalRef !== null && originalRef !== undefined) {
      (originalRef as { current: HTMLElement | null }).current = node;
    }
  }, []);

  // KEEP #6: Escape closes while open, at the document level — independent
  // of which element inside the trigger holds focus.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeNow();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, closeNow]);

  // A pending hover-intent timer must not fire after unmount.
  useEffect(() => clearOpenTimer, [clearOpenTimer]);

  // KEEP #8: enabled=false renders the child alone — no provider required,
  // no tooltip machinery touched.
  if (!enabled) {
    return child;
  }
  if (clock === null) {
    throw new Error("Tooltip must be rendered inside a TooltipProvider.");
  }

  const cloned = cloneElement(child, {
    ref: composeRef,
    // KEEP #11: points at the live portaled label while open; absent
    // when closed.
    "aria-describedby": open ? tooltipId : undefined,
    onPointerEnter: chainHandlers(child.props.onPointerEnter, requestHoverOpen),
    onPointerLeave: chainHandlers(child.props.onPointerLeave, requestClose),
    onFocus: chainHandlers(child.props.onFocus, requestFocusOpen),
    onBlur: chainHandlers(child.props.onBlur, requestClose),
  });

  return (
    <>
      {cloned}
      {open
        ? createPortal(
            <div
              ref={measurePanel}
              id={tooltipId}
              role="tooltip"
              className={styles.content}
              data-side={position?.side ?? side}
              data-state={openReason}
              style={
                position === null
                  ? { visibility: "hidden", top: 0, left: 0 }
                  : { top: position.top, left: position.left }
              }
            >
              {/* A tooltip is its own top-level layer, not content of
                  whatever Panel happened to render the trigger — see
                  PanelScope.tsx's "PanelScopeReset — the third
                  direction". */}
              <PanelScopeReset>
                {label}
                {position !== null && arrowCrossOffset !== null ? (
                  <TooltipArrow side={position.side} crossOffset={arrowCrossOffset} />
                ) : null}
              </PanelScopeReset>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
