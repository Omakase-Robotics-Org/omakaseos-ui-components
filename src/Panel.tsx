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
 * ## A Panel body holds Sections — and no container (v0.14)
 *
 * A Panel *is* the surface — `--ds-surface` inside `--ds-border`, over
 * `--ds-radius-lg`, lifted by `--ds-shadow-card`. Its body is therefore not a
 * place for a second one: a container inside a container reads as a frame
 * inside a frame, and the reader has to count boxes to know what contains what
 * (measured on the dashboard's monitor page — omksos_web
 * `reports/monitor-ia-recomposition/`). v0.12 relaxed the nested recipe and
 * v0.13 stripped the surface off it; the verdict on both was that they
 * repainted a violation until it looked legal while leaving the structure in
 * place (`reports/monitor-scope-coherence/`, ruling B).
 *
 * So the body opens a **scope** instead, and the containers refuse to render in
 * it: a `Card` there throws ("use Section for grouping within a panel"), and so
 * does another `Panel` — a panel is a cell of the page grid, so a panel that
 * needs two of them needs two cells, side by side, each stating its own scope.
 * What a body may hold, besides plain content, is `Section`: a heading, its
 * content, and the rhythm around it, drawing nothing. The scope is a React
 * context (`PanelScope.tsx`), so the contract is about composition and not
 * about DOM position — content portalled out of this subtree is not nested.
 *
 * The scope covers the children only. `headerRight` is chrome of the panel
 * itself rather than content within it, and it renders in the header, outside
 * the provider — so a surface placed there is not a nested container, in the
 * contract exactly as in the DOM.
 *
 * `data-panel-body` stays on the same element. It is no longer a style hook
 * (nothing keys off it any more); it is how the browser-level container scan in
 * omksos_web addresses a panel's content, and how consumer specs select it.
 */
import type { ReactNode } from "react";
import { PanelScope, useInsidePanel } from "./PanelScope";
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
  if (useInsidePanel()) {
    throw new Error(
      "Panel must not nest inside another Panel — use Section for grouping within a panel, or a sibling Panel in the page grid",
    );
  }

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
      {/* The marker carries no value because it is neither a flag with an off
          state nor a variant: a panel body always is one, so `[data-panel-body]`
          is the whole statement. What it addresses is a panel's content from
          outside this library; the nesting contract itself is the scope below. */}
      <div className={styles.body} data-panel-body="">
        <PanelScope>{children}</PanelScope>
      </div>
    </section>
  );
}
