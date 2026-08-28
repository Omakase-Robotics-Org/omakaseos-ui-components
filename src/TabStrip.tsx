/**
 * @file TabStrip — the tablist half of the tab pattern: roving
 * tabindex, arrow/Home/End traversal, and `data-active` styling,
 * WITHOUT owning panels.
 *
 * Split from `Tabs` because two shapes share the strip but not the
 * panel contract:
 *
 *   - `Tabs` (a detail page's section switcher, a monitor page's mode
 *     switcher): strip + mounted `tabpanel` per item. It layers panel
 *     wiring on top of this component.
 *   - View switchers (a page's ViewBar): the "panel" is the page
 *     itself (the table/board below), not a component this strip
 *     owns. Before extraction a ViewBar-shaped consumer hand-rolled
 *     its `role="tab"` buttons and silently lacked roving tabindex and
 *     arrow-key traversal — the strip's keyboard decisions existed
 *     only inside `Tabs`.
 *
 * `getPanelId` is optional: when the consumer owns real tabpanels it
 * supplies the id mapping and each tab gets `aria-controls`; a
 * panel-less strip omits it rather than pointing at ids that do not
 * exist.
 *
 * `trailing` renders inside the tablist row but outside the tab
 * sequence (e.g. a ViewBar's toolbar) so the strip keeps one bottom
 * rule across tabs and actions.
 *
 * `itemAdornment` renders INSIDE a tab's slot, after its button —
 * the home for per-tab controls (a kebab menu, config-state chips),
 * so such a control lives within the visual boundary of the tab it
 * operates on instead of floating in a toolbar with no stated scope.
 * The slot — not the label button — carries the active underline and
 * the hover wash, so the label AND its adornments read as ONE tab
 * unit (an adornment outside the underline still reads as "between
 * the tabs", which is exactly the scope collapse this exists to
 * fix). Consumers whose adornments are activation-dependent should
 * reserve the box by visibility (not omission) so tab widths do not
 * shift when the active tab changes.
 *
 * `editing` supports IN-PLACE tab rename with NO layout shift across
 * the whole interaction: the tab button hides (`display: none`) and
 * a stretchy editor takes its slot — an invisible ghost span carries
 * the current draft (same font and padding as the tab), so the slot
 * is exactly as wide as the text being typed. It starts at the old
 * label's width (draft = old label), follows the content while
 * typing, and is ALREADY at the final width when the rename commits:
 * there is no jump at start, none while typing, none at commit.
 * Enter/blur commit; Escape cancels. Double-clicking a tab is the
 * direct-manipulation entry point (`onItemDoubleClick`); consumers
 * may also trigger editing from a menu.
 *
 * Dedup note: `Pager` is ordinal traversal through one dataset's
 * pages (`role="navigation"`, one "current" member advancing by
 * position); this is selection among mutually exclusive views
 * (`role="tablist"`) — different semantics even though both render a
 * row of buttons with one active member. `Toolbar` is `role="toolbar"`,
 * a plain action row with no selection state at all.
 */
import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import styles from "./TabStrip.module.css";

/** One strip entry — a stable id and its visible label. */
export type TabStripItem<T extends string> = {
  readonly id: T;
  readonly label: string;
};

/** In-place rename state for one tab (see file overview). */
export type TabStripEditing<T extends string> = {
  /** Which tab's label is being edited. */
  readonly id: T;
  readonly defaultValue: string;
  readonly placeholder: string;
  /** Accessible name of the transient input. */
  readonly ariaLabel: string;
  readonly onCommit: (name: string) => void;
  readonly onCancel: () => void;
};

/**
 * The transient in-place rename editor occupying one tab's slot. A
 * separate component because it owns two pieces of private state: the
 * controlled draft (mirrored into the invisible ghost that keeps the
 * slot content-width — the no-shift mechanism) and the Escape-vs-blur
 * ordering (Escape cancels and must suppress the commit the
 * subsequent blur would otherwise fire).
 */
function TabRenameInput<T extends string>(props: { editing: TabStripEditing<T> }) {
  const { editing } = props;
  const cancelled = useRef(false);
  const [draft, setDraft] = useState(editing.defaultValue);
  const ghostText = draft === "" ? editing.placeholder : draft;
  return (
    <span className={styles.tabEditStretch}>
      <span aria-hidden className={styles.tabEditGhost}>
        {ghostText}
      </span>
      <input
        autoFocus
        // size=1 kills the input's intrinsic ~20ch width so the ghost
        // alone decides the slot's width (the no-shift mechanism).
        size={1}
        className={styles.tabRenameInput}
        value={draft}
        placeholder={editing.placeholder}
        aria-label={editing.ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={(e) => {
          if (!cancelled.current) {
            editing.onCommit(e.target.value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            editing.onCommit(e.currentTarget.value);
            return;
          }
          if (e.key === "Escape") {
            cancelled.current = true;
            editing.onCancel();
          }
        }}
      />
    </span>
  );
}

/** The rename editor for a tab, rendered only when that tab is the one being edited. */
function TabEditor<T extends string>(props: { itemId: T; editing: TabStripEditing<T> | null | undefined }): ReactNode {
  const { editing } = props;
  if (editing == null || editing.id !== props.itemId) {
    return null;
  }
  return <TabRenameInput editing={editing} />;
}

/**
 * Map an arrow / Home / End key to the index of the tab that should
 * become active next. Returns null for keys that do not move the
 * selection — the caller treats null as a no-op.
 */
function nextTabIndex(key: string, currentIndex: number, count: number): number | null {
  if (key === "ArrowRight") {
    return (currentIndex + 1) % count;
  }
  if (key === "ArrowLeft") {
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

/** Controlled tablist strip (no panels). */
export function TabStrip<T extends string>(props: {
  items: readonly TabStripItem<T>[];
  value: T | null;
  onChange: (id: T) => void;
  /** Stable prefix for tab ids — keeps multiple strips on one page distinct. */
  idPrefix: string;
  /**
   * Accessible name of the tablist.
   *
   * Optional because a strip whose tabs sit under a heading that
   * already names them ("Views") is named by its surroundings; supply
   * it when the strip stands on its own, so a screen reader does not
   * meet an unnamed tablist between a page title and its content.
   */
  ariaLabel?: string;
  /** Maps a tab id to its tabpanel id; omit when no panels exist. */
  getPanelId?: (id: T) => string;
  /** Rendered after the tabs, inside the strip row (not in the tab order). */
  trailing?: ReactNode;
  /** Per-tab control rendered inside the tab's slot (see file overview). */
  itemAdornment?: (id: T) => ReactNode;
  /** In-place rename overlay for one tab (see file overview). */
  editing?: TabStripEditing<T> | null;
  /** Direct-manipulation hook (e.g. double-click a tab to rename it). */
  onItemDoubleClick?: (id: T) => void;
}) {
  const { items, value, onChange, idPrefix, getPanelId } = props;

  const onTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const currentIndex = items.findIndex((item) => item.id === value);
      if (currentIndex < 0) {
        return;
      }
      const nextIndex = nextTabIndex(event.key, currentIndex, items.length);
      if (nextIndex === null) {
        return;
      }
      event.preventDefault();
      const nextItem = items[nextIndex];
      if (nextItem) {
        onChange(nextItem.id);
        // Roving tabindex is only half the pattern: the tabindex moves with
        // the controlled re-render, but the browser never blurs an element
        // whose tabindex drops to -1, so without this the OLD tab keeps DOM
        // focus and the next Tab keypress leaves the strip from the wrong
        // place. The dashboard original had this hole; fixed in transit
        // (same class as the aria-disabled click guard on Button). The
        // deterministic id is looked up by getElementById because idPrefix
        // is caller text and must not need CSS escaping.
        document.getElementById(`${idPrefix}-tab-${String(nextItem.id)}`)?.focus();
      }
    },
    [items, value, onChange, idPrefix],
  );

  return (
    <div role="tablist" aria-label={props.ariaLabel} className={styles.tablist}>
      {items.map((item) => {
        const active = item.id === value;
        const editingThis = props.editing != null && props.editing.id === item.id;
        return (
          <span
            key={item.id}
            className={styles.tabSlot}
            data-active={active}
            data-editing={editingThis ? "" : undefined}
          >
            <button
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${item.id}`}
              aria-controls={getPanelId?.(item.id)}
              aria-selected={active}
              tabIndex={editingThis ? -1 : active ? 0 : -1}
              data-active={active}
              className={styles.tab}
              onClick={() => onChange(item.id)}
              onDoubleClick={() => props.onItemDoubleClick?.(item.id)}
              onKeyDown={onTabKeyDown}
            >
              {item.label}
            </button>
            <TabEditor itemId={item.id} editing={props.editing} />
            {props.itemAdornment?.(item.id)}
          </span>
        );
      })}
      {props.trailing}
    </div>
  );
}
