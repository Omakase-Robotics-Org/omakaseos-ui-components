/**
 * @file Panel — a titled section that occupies one cell of a page grid.
 *
 * Status layer. Added in v0.11 from `robot-status-server-app`
 * (`src/components/ui/Panel.tsx`, 39 call sites — every screen of the
 * robot console is a grid of these). See
 * `omksos_web/reports/rssa-ui-unification/README.md`.
 *
 * ## Panel is not Card, and neither is a variant of the other
 *
 * `Card` is a surface that holds a run of related rows inside a page: a
 * softer header that carries a `hint` and a `right` slot, no divider, and
 * padding that continues straight into the content. It is what a list of
 * facts sits on.
 *
 * `Panel` is a *section of the page itself*. It is one cell of a grid of
 * peers, so it states its identity the way a section heading does — a
 * small, uppercase, letter-spaced title over a hard divider — and it
 * carries the two things a grid cell needs and a card does not:
 * `fullWidth`, which spans every column of the grid it sits in, and `id`,
 * which makes it the target of an in-page anchor (the console links to
 * four of its panels this way).
 *
 * Collapsing the two would mean either giving `Card` a grid-cell mode it
 * has no business knowing about, or restyling every existing `Card` call
 * site in the dashboard. So both exist, and the question a caller asks is
 * "is this a section of the page, or a surface within one?".
 *
 * The header renders an `<h2>`, so a page built out of Panels has a real
 * document outline.
 *
 * ## Elevation is not nested (v0.12)
 *
 * A Panel is a page section: it *floats* — `--ds-border` + `--ds-shadow-card`
 * over `--ds-radius-lg`. A Card inside that body is a *grouping* — it divides
 * the section's content — and must not restate the elevation, because Panel
 * and Card are drawn from the same recipe (identical border colour, identical
 * shadow). Nested, that recipe stops reading as "a group within a section" and
 * starts reading as "a frame inside a frame"; measured on the dashboard's
 * monitor page, where `ConversationStatePanel` is Panel > Card x4 and
 * `NavigationPanel` is Panel > Card x3-4 > row borders (omksos_web
 * `reports/monitor-ia-recomposition/`).
 *
 * So the body declares itself as that scope with the `data-panel-body`
 * attribute, and `Card.module.css` carries the descendant rule that drops the
 * shadow and steps the border down to `--ds-border-subtle`. The rule lives on
 * the Card side because Card is the surface being demoted, and it is keyed off
 * an ancestor so that **no call site changes**: nesting is a fact about where a
 * Card sits, which the caller already stated by putting it there.
 *
 * The marker sits on the body rather than on the `<section>` deliberately — the
 * header's `headerRight` slot is chrome of the section itself, not content
 * inside it, so a surface placed there is not demoted.
 *
 * If another elevated container is ever added to this library, it declares the
 * same scope (add its marker to the selector list in `Card.module.css`) rather
 * than inventing a second rule.
 */
import type { ReactNode } from "react";
import styles from "./Panel.module.css";

export type PanelProps = {
  title: string;
  /** Span every column of the grid this panel sits in. */
  fullWidth?: boolean;
  /** Controls or status that belong to the panel as a whole (right of the title). */
  headerRight?: ReactNode;
  children: ReactNode;
  /** Anchor target: rendered on the `<section>` so the page can link here. */
  id?: string;
};

/** A titled section of a page grid, with a header bar and a padded body. */
export function Panel({ title, fullWidth, headerRight, children, id }: PanelProps) {
  return (
    <section
      id={id}
      className={styles.panel}
      data-full-width={fullWidth ? "true" : undefined}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {headerRight}
      </div>
      {/* The scope marker for "elevation is not nested" (see the file header).
          It carries no value because it is neither a flag with an off state nor
          a variant: a panel body always is one, so `[data-panel-body]` is the
          whole statement. */}
      <div className={styles.body} data-panel-body="">
        {children}
      </div>
    </section>
  );
}
