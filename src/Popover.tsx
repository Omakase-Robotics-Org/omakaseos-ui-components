/**
 * @file Popover — anchored free-content panel (the editing-surface
 * sibling of `Menu`).
 *
 * Ported from `.codex/ref/Popover.tsx` (the dashboard implementation this
 * library absorbs). `Menu` is deliberately an action-list primitive: fixed
 * `role="menu"` semantics, button items, roving arrow-key focus. Editing
 * surfaces — a cell's option picker, a column header's rename/type panel —
 * need arbitrary content (inputs, chip lists, sections) under the same
 * floating-panel decisions, so this component reuses Menu's judgement
 * calls one-for-one:
 *
 *   - PORTALS to document.body and positions from the anchor's viewport
 *     rect, so call-site ancestry (overflow, table layout, text-align)
 *     cannot clip or contaminate it.
 *   - Measures the panel in a callback ref (synchronous at mount) and
 *     flips above the anchor when the viewport bottom would clip it.
 *   - Dismisses on outside pointerdown, Escape, scroll, resize. Escape
 *     returns focus to the anchor; outside-click does not steal focus
 *     back.
 *
 * Where it differs from Menu, by design:
 *
 *   - CONTROLLED. The consumer owns `open` — cells open their editor from
 *     a keyboard Enter as well as a click, and close it on commit, so an
 *     internal trigger-toggle would fight the owner.
 *   - Content is free-form (`role="dialog"`, non-modal). On open, focus
 *     moves to the first `[data-autofocus]` element, else the first
 *     focusable one, so a keyboard flow lands in the panel without an
 *     extra Tab.
 *
 * Scope note: this is for DIRECT-manipulation editing surfaces — the
 * panel a cell or header opens on itself. It is not a license for hidden
 * row-level overflow menus (see Menu's scope guard).
 *
 * Positioning is delegated to `useAnchoredPanel` / `anchoredPanelPosition`
 * (`src/floating/`) — the core this component and `Menu` share, so the
 * `panelPosition` function the two refs each carried (verbatim identical)
 * collapses into one tested implementation. Called with `side: "bottom"`
 * (this component's only orientation), `offset: 4`, `margin: 8` — the
 * refs' fixed constants — so the coordinates produced are byte-identical
 * to the ref's own `panelPosition` for the same inputs (pinned in
 * `floating/anchored-position.spec.ts`).
 *
 * Do NOT merge this with `Menu` — different ARIA tree (`role="dialog"`,
 * free content, vs `role="menu"`, button items) and different open
 * ownership (controlled here, uncontrolled there); both consume the
 * shared positioning core, no more.
 */
import { useEffect } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { useAnchoredPanel } from "./floating/useAnchoredPanel";
import { PanelScopeReset } from "./PanelScope";
import styles from "./Popover.module.css";

/** Gap between the anchor and the panel, in px. */
const PANEL_OFFSET = 4;
/** Keep the panel's cross-axis box inside the viewport, with a small margin. */
const VIEWPORT_MARGIN = 8;

/**
 * Is this event coming from a layer ABOVE the panel — i.e. from inside
 * an open `<dialog>`?
 *
 * ★ A dismissal rule reads "the operator went somewhere else, so put
 * this away". A modal dialog is not somewhere else: it is the browser's
 * own top layer, and the only way one can be over an open popover is
 * that the panel's own content opened it (a cell's image editor opens
 * the media library picker; a header's panel could open a confirm).
 * Treating a click, a keystroke or a scroll inside it as "outside"
 * unmounts the panel — and with it the dialog it owns — so the gesture
 * the operator was in the middle of never completes. Measured: picking
 * an image in the library picker closed the cell's editor and wrote
 * nothing.
 *
 * `dialog[open]` rather than a registry of nested surfaces, because the
 * top layer is exactly the thing being asked about and the DOM already
 * states it.
 */
function isAboveThePanel(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return target.closest("dialog[open]") !== null;
}

/** Anchored, controlled, free-content floating panel. */
export function Popover(props: {
  open: boolean;
  /** The element the panel visually attaches to (usually the cell/header surface). */
  anchorRef: RefObject<HTMLElement | null>;
  /**
   * Close request from inside the primitive. `returnFocus` is true
   * for Escape (keyboard flows resume on the anchor) and false for
   * outside-click / scroll / resize (the pointer already went
   * somewhere else on purpose).
   */
  onRequestClose: (returnFocus: boolean) => void;
  /** Accessible name of the panel. */
  ariaLabel: string;
  /** Which anchor edge the panel's matching edge sticks to. */
  align?: "start" | "end";
  children: ReactNode;
}) {
  const { open, anchorRef, onRequestClose } = props;
  const align = props.align ?? "start";

  const { measurePanel, panelRef, position } = useAnchoredPanel({
    anchorRef,
    side: "bottom",
    align,
    offset: PANEL_OFFSET,
    margin: VIEWPORT_MARGIN,
  });

  // Initial focus AFTER the position replaces visibility:hidden —
  // focus() on a hidden subtree is a browser no-op (the same gating
  // Menu documents for its item focus).
  useEffect(() => {
    if (!open || position === null) {
      return;
    }
    const panel = panelRef.current;
    if (panel === null || panel.contains(document.activeElement)) {
      return;
    }
    const target =
      panel.querySelector<HTMLElement>("[data-autofocus]") ??
      panel.querySelector<HTMLElement>(
        "input, select, textarea, button, [tabindex]:not([tabindex='-1'])",
      );
    target?.focus();
  }, [open, position, panelRef]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) === true) {
        return;
      }
      if (anchorRef.current?.contains(target) === true) {
        return;
      }
      if (isAboveThePanel(event.target)) {
        return;
      }
      onRequestClose(false);
    };
    const onDismiss = (event: Event): void => {
      // A dialog over the panel scrolling its own body is not the PAGE
      // moving out from under the panel — see `isAboveThePanel`.
      if (isAboveThePanel(event.target)) {
        return;
      }
      onRequestClose(false);
    };
    // Escape at the document level (capture-independent) so it works
    // no matter which element inside the panel holds focus. Stopped
    // from bubbling further: the page behind must not also act on it.
    //
    // An Escape inside a dialog over the panel belongs to the DIALOG:
    // it is the topmost thing on screen, and closing the panel out from
    // under it would take the dialog with it.
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !isAboveThePanel(event.target)) {
        event.stopPropagation();
        onRequestClose(true);
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
  }, [open, anchorRef, onRequestClose, panelRef]);

  // No position reset on close: the panel unmounts entirely, and the
  // next open's callback-ref measure runs during commit — before the
  // browser paints — so a stale coordinate can never reach the screen.

  if (!open) {
    return null;
  }
  return createPortal(
    <div
      ref={measurePanel}
      role="dialog"
      aria-label={props.ariaLabel}
      className={styles.panel}
      data-side={position?.side}
      style={
        position === null
          ? { visibility: "hidden", top: 0, left: 0 }
          : { top: position.top, left: position.left }
      }
    >
      {/* An editing surface a Popover opens is its own top-level layer,
          not content of whatever Panel happened to render the anchor —
          see PanelScope.tsx's "PanelScopeReset — the third direction". */}
      <PanelScopeReset>{props.children}</PanelScopeReset>
    </div>,
    document.body,
  );
}
