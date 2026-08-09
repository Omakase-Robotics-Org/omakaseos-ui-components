/**
 * @file Card + CardHeader — bordered surface with an optional titled header.
 *
 * Two call shapes are accepted:
 *   <Card title="Foo">…</Card>                                  // omks-robo/web shorthand
 *   <Card><CardHeader title="Foo" hint? right?/>…</Card>        // status_server_webui style
 * The shorthand is implemented as <Card><CardHeader title=…/>…</Card>.
 *
 * ## Elevation is not nested (v0.12)
 *
 * On its own, a Card is a surface within a page: it floats, with
 * `--ds-border` + `--ds-shadow-card`. Inside a `Panel`'s body it does not.
 * `Panel` is a page section drawn from the same recipe, and when the identical
 * border+shadow pair is nested it stops reading as grouping and starts reading
 * as "a frame inside a frame" (measured on the dashboard monitor page, where
 * the conversation-state panel is Panel > Card x4 and navigation is
 * Panel > Card x3-4 > row borders — omksos_web
 * `reports/monitor-ia-recomposition/`). So a Card inside a panel body drops its
 * shadow and steps its border down to `--ds-border-subtle`: a Panel is
 * elevation, the Cards inside it are division.
 *
 * This is automatic and has no prop. `Card.module.css` keys it off Panel's
 * `data-panel-body` scope marker, so nesting is stated by where the caller put
 * the card and by nothing else — the 36+ existing call sites keep their exact
 * call shape, and the two consuming apps stay consistent with each other for
 * free. The radius and everything `CardHeader` draws are unchanged in both
 * positions; only the two elevation properties move.
 */
import type { ReactNode } from "react";
import styles from "./Card.module.css";

export type CardProps = {
  children: ReactNode;
  className?: string;
  title?: string;
};

export function Card({ children, className, title }: CardProps) {
  return (
    <section className={className ? `${styles.card} ${className}` : styles.card}>
      {title === undefined ? null : <CardHeader title={title} />}
      {children}
    </section>
  );
}

export type CardHeaderProps = {
  title: string;
  hint?: string;
  right?: ReactNode;
};

export function CardHeader({ title, hint, right }: CardHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleBlock}>
        <h2 className={styles.title}>{title}</h2>
        {hint === undefined ? null : <p className={styles.hint}>{hint}</p>}
      </div>
      {right === undefined ? null : <div className={styles.right}>{right}</div>}
    </header>
  );
}
