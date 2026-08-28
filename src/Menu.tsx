/**
 * @file Menu — anchored action-menu primitive (trigger + floating
 * `role="menu"` panel).
 *
 * Ported from `.codex/ref/Menu.tsx` (the dashboard implementation this
 * library absorbs). The dashboard had no shared menu primitive, so every
 * page-level dropdown (knowledge kebab, publish menu) hand-rolled its own
 * absolutely-positioned sibling div — each copy missing outside-click
 * dismissal, Escape, arrow-key traversal, and focus return, and each
 * inheriting the call site's heritable CSS (the same trap Dialog's portal
 * already solved for modals). This component makes those decisions once:
 *
 *   - The panel PORTALS to document.body and positions itself from the
 *     trigger's viewport rect, so ancestry (overflow, text-align,
 *     tabular-nums) cannot clip or contaminate it.
 *   - Dismissal: outside pointerdown, Escape, scroll/resize, or picking
 *     an item. Escape and item-pick return focus to the trigger;
 *     outside-click does not steal it back.
 *   - Keyboard: ArrowDown/ArrowUp/Home/End move the active item,
 *     Enter/Space activate it (native button behavior).
 *   - ARIA: the render-prop trigger receives `aria-haspopup` /
 *     `aria-expanded` so a consumer cannot forget them.
 *
 * Scope guard: this is a PAGE-LEVEL primitive (detail-page kebab, status
 * menus). Do not build row-level overflow menus with it — the dashboard
 * deliberately retracted those in favour of always-visible labeled
 * buttons (see 53de8c8, "zero-knowledge affordances").
 *
 * Positioning is delegated to `useAnchoredPanel` / `anchoredPanelPosition`
 * (`src/floating/`) — the core this component and `Popover` share, so the
 * `panelPosition` function the two refs each carried (verbatim identical)
 * collapses into one tested implementation. Called with `side: "bottom"`
 * (this component's only orientation), `offset: 4`, `margin: 8` — the
 * refs' fixed constants — so the coordinates produced are byte-identical
 * to the ref's own `panelPosition` for the same inputs (pinned in
 * `floating/anchored-position.spec.ts`). A dependency (floating-ui) would
 * buy sub-pixel arrow placement the dashboard does not use.
 *
 * Do NOT merge this with `Popover` — different ARIA tree (`role="menu"`,
 * button items, vs `role="dialog"`, free content) and different open
 * ownership (uncontrolled here, controlled there); both consume the
 * shared positioning core, no more.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAnchoredPanel } from "./floating/useAnchoredPanel";
import type { AnchoredPanelPosition } from "./floating/anchored-position";
import { PanelScopeReset } from "./PanelScope";
import styles from "./Menu.module.css";

/** One activatable entry. */
export type MenuItem = {
  readonly key: string;
  readonly label: ReactNode;
  readonly onSelect: () => void;
  /** Visual + semantic danger (delete-like). */
  readonly danger?: boolean;
  readonly disabled?: boolean;
};

/** Props handed to the consumer's trigger render prop. */
export type MenuTriggerProps = {
  readonly ref: (el: HTMLButtonElement | null) => void;
  readonly onClick: () => void;
  readonly "aria-haspopup": "menu";
  readonly "aria-expanded": boolean;
};

/** Gap between the trigger and the panel, in px. */
const PANEL_OFFSET = 4;
/** Keep the panel's cross-axis box inside the viewport, with a small margin. */
const VIEWPORT_MARGIN = 8;

/** Anchored action menu. The trigger is supplied as a render prop. */
export function Menu(props: {
  items: readonly MenuItem[];
  trigger: (triggerProps: MenuTriggerProps) => ReactNode;
  /** Which trigger edge the panel's matching edge sticks to. */
  align?: "start" | "end";
  /** Accessible name of the menu panel. */
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const align = props.align ?? "end";

  const { measurePanel, panelRef, position, reset } = useAnchoredPanel({
    anchorRef: triggerRef,
    side: "bottom",
    align,
    offset: PANEL_OFFSET,
    margin: VIEWPORT_MARGIN,
  });

  const close = useCallback(
    (returnFocus: boolean) => {
      setOpen(false);
      reset();
      if (returnFocus) {
        triggerRef.current?.focus();
      }
    },
    [reset],
  );

  // Dismiss on outside pointerdown / scroll / resize. Scroll closes
  // (rather than repositions) because an anchored menu drifting away
  // from its trigger mid-scroll reads as broken.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) === true) {
        return;
      }
      if (triggerRef.current?.contains(target) === true) {
        return;
      }
      close(false);
    };
    const onDismiss = (): void => {
      close(false);
    };
    // Escape is handled at the document so it dismisses even while
    // focus still sits on the trigger (e.g. the pointer opened the
    // menu and no arrow key has moved focus into the panel yet).
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        close(true);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("resize", onDismiss);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onDismiss, true);
      window.removeEventListener("resize", onDismiss);
    };
  }, [open, close, panelRef]);

  // Focus the active item whenever it changes while open, so arrow
  // traversal is visible to both the eye and the screen reader.
  // Gated on `position`: until the measure pass replaces
  // visibility:hidden, focus() on the hidden subtree is a browser
  // no-op and the focus would silently stay on the trigger.
  useEffect(() => {
    if (!open || position === null) {
      return;
    }
    const panel = panelRef.current;
    if (panel === null) {
      return;
    }
    const buttons = panel.querySelectorAll<HTMLButtonElement>("[role='menuitem']");
    buttons[activeIndex]?.focus();
  }, [open, position, activeIndex, panelRef]);

  const onPanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const count = props.items.length;
    const next = nextItemIndex(event.key, activeIndex, count);
    if (next !== null) {
      event.preventDefault();
      setActiveIndex(next);
    }
  };

  const toggle = (): void => {
    if (open) {
      close(true);
      return;
    }
    setActiveIndex(0);
    setOpen(true);
  };

  return (
    <>
      {props.trigger({
        ref: (el) => {
          triggerRef.current = el;
        },
        onClick: toggle,
        "aria-haspopup": "menu",
        "aria-expanded": open,
      })}
      <MenuPanel
        open={open}
        measurePanel={measurePanel}
        ariaLabel={props.ariaLabel}
        position={position}
        onPanelKeyDown={onPanelKeyDown}
        items={props.items}
        activeIndex={activeIndex}
        close={close}
      />
    </>
  );
}

/**
 * The floating `role="menu"` panel, portalled to document.body. Mounted
 * unconditionally and self-gated on `open` (returns null when closed) so
 * the closed→open transition mounts a fresh panel — the menu deliberately
 * resets its highlight on each open (see `activeIndex`), so there is no
 * panel state to preserve across opens and `<Activity>` would only keep a
 * hidden portal alive for nothing.
 */
function MenuPanel(props: {
  open: boolean;
  measurePanel: (panel: HTMLElement | null) => void;
  ariaLabel: string;
  position: AnchoredPanelPosition | null;
  onPanelKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  items: readonly MenuItem[];
  activeIndex: number;
  close: (returnFocus: boolean) => void;
}): ReactNode {
  if (!props.open) {
    return null;
  }
  return createPortal(
    <div
      ref={props.measurePanel}
      role="menu"
      aria-label={props.ariaLabel}
      className={styles.panel}
      data-side={props.position?.side}
      style={
        props.position === null
          ? { visibility: "hidden", top: 0, left: 0 }
          : { top: props.position.top, left: props.position.left }
      }
      onKeyDown={props.onPanelKeyDown}
    >
      {/* An action menu is its own top-level layer, not content of
          whatever Panel happened to render the trigger — see
          PanelScope.tsx's "PanelScopeReset — the third direction". */}
      <PanelScopeReset>
        {props.items.map((item, index) => (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            className={styles.item}
            data-danger={item.danger === true ? "" : undefined}
            disabled={item.disabled}
            tabIndex={index === props.activeIndex ? 0 : -1}
            onClick={() => {
              props.close(true);
              item.onSelect();
            }}
          >
            {item.label}
          </button>
        ))}
      </PanelScopeReset>
    </div>,
    document.body,
  );
}

/**
 * Map a traversal key to the next active index. Arrow keys wrap;
 * Home/End jump; anything else is a no-op (null).
 */
function nextItemIndex(key: string, currentIndex: number, count: number): number | null {
  if (count === 0) {
    return null;
  }
  if (key === "ArrowDown") {
    return (currentIndex + 1) % count;
  }
  if (key === "ArrowUp") {
    return (currentIndex - 1 + count) % count;
  }
  if (key === "Home") {
    return 0;
  }
  if (key === "End") {
    return count - 1;
  }
  return null;
}
