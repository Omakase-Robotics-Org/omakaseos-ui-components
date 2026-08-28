/**
 * @file Tabs — accessible tab list + panel pair.
 *
 * Controlled component: the parent owns the active id. Tab and panel
 * pairing follows ARIA's `tablist / tab / tabpanel` shape, with
 * `aria-controls` / `aria-labelledby` cross-linking by deterministic
 * ids (`tab-<id>` / `panel-<id>`) so screen readers expose the
 * relationship without the consumer wiring it up.
 *
 * The strip itself (roving tabindex, arrow/Home/End traversal,
 * data-active styling) lives in `TabStrip` — shared with panel-less
 * view switchers — and this component layers the panel contract on
 * top: it supplies `getPanelId` so each tab carries `aria-controls`,
 * and renders the ACTIVE panel only (hidden panels do not pay mount
 * cost; consumers hoist cross-tab state into the page).
 *
 * Why a dedicated component (and not, say, `useState` segments inline
 * in each page): a dashboard-shaped consumer has multiple page types
 * that benefit from a tab metaphor — a detail page's section switcher,
 * a monitor page's mode switcher — and the alternative (each page
 * rolls its own ad-hoc tab UI) would diverge in keyboard handling,
 * ARIA wiring, and visual tokens. Centralising it keeps those
 * decisions in one place.
 *
 * ## PanelScope — explicit NON-action
 *
 * Tabs renders panel content in flow, not a portal, so it must NOT
 * reset `PanelScope` (unlike the overlay components — `Dialog` et al
 * open a fresh scope because their content mounts in a layer the host
 * does not otherwise nest). A `Panel` rendered inside a `Tabs` panel
 * that itself sits inside a `Panel` should still throw: the tab panel
 * is not a scope boundary, it is exactly as "inside" as any other
 * child of the outer panel's content, and this component must never
 * be changed to "harmonise" that away.
 */
import type { ReactNode } from "react";
import { TabStrip } from "./TabStrip";
import styles from "./Tabs.module.css";

/** One tab entry — its stable id, the visible label, and panel content. */
export type TabItem<T extends string> = {
  readonly id: T;
  readonly label: string;
  readonly content: ReactNode;
};

/** Controlled tab list + panel. */
export function Tabs<T extends string>(props: {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /**
   * Stable prefix used to build tab/panel ids, so multiple Tabs on the
   * same page stay disambiguated. Required: silently inheriting a
   * default ("tabs") would let two Tabs collide their ARIA ids.
   */
  idPrefix: string;
}) {
  const { items, value, idPrefix } = props;

  return (
    <div className={styles.surface}>
      <TabStrip
        items={items.map((item) => ({ id: item.id, label: item.label }))}
        value={value}
        onChange={props.onChange}
        idPrefix={idPrefix}
        getPanelId={(id) => `${idPrefix}-panel-${id}`}
      />
      {items.map((item) => {
        const active = item.id === value;
        if (!active) {
          // Render only the active panel so heavy panel content does
          // not pay the mount cost while hidden. Consumers that need
          // to preserve panel state across tab switches should hoist
          // that state into the page itself.
          return null;
        }
        return (
          <div
            key={item.id}
            role="tabpanel"
            id={`${idPrefix}-panel-${item.id}`}
            aria-labelledby={`${idPrefix}-tab-${item.id}`}
            className={styles.panel}
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}
