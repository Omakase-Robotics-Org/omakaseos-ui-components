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
 * ## A Card in this body is a section of it (v0.13)
 *
 * A Panel is a page section: it *is* the surface — `--ds-surface` inside
 * `--ds-border`, over `--ds-radius-lg`, lifted by `--ds-shadow-card`. A Card
 * inside that body is a *part* of this section, and drawing it from the same
 * recipe makes the pair read as "a frame inside a frame" rather than as a
 * section and its parts; measured on the dashboard's monitor page, where
 * `ConversationStatePanel` is Panel > Card x4 and `NavigationPanel` is
 * Panel > Card x3-4 > row borders (omksos_web
 * `reports/monitor-ia-recomposition/`). v0.12 merely relaxed the nested recipe
 * and the consumer read that as a change of manner, not of structure
 * (`reports/monitor-scope-coherence/`, ruling B).
 *
 * So the body declares itself as that scope with the `data-panel-body`
 * attribute, and `Card.module.css` carries the descendant rule that strips the
 * surface entirely — no outline, fill, lift or corner — and replaces the
 * frame's inset with the rhythm between sections. This panel is then the only
 * box on screen, and what it holds is a run of headed sections. The rule lives
 * on the Card side because Card is the thing being restated, and it is keyed
 * off an ancestor so that **no call site changes**: nesting is a fact about
 * where a Card sits, which the caller already stated by putting it there.
 *
 * The body's own padding becomes the column every section aligns to, header
 * included — the nested sections have no horizontal inset of their own.
 *
 * The marker sits on the body rather than on the `<section>` deliberately — the
 * header's `headerRight` slot is chrome of the section itself, not content
 * inside it, so a surface placed there is not demoted.
 *
 * If another surface container is ever added to this library, it declares the
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
      {/* The scope marker for "a Card in this body is a section" (file header).
          It carries no value because it is neither a flag with an off state nor
          a variant: a panel body always is one, so `[data-panel-body]` is the
          whole statement. */}
      <div className={styles.body} data-panel-body="">
        {children}
      </div>
    </section>
  );
}
