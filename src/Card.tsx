/**
 * @file Card + CardHeader — bordered surface with an optional titled header.
 *
 * Two call shapes are accepted:
 *   <Card title="Foo">…</Card>                                  // omks-robo/web shorthand
 *   <Card><CardHeader title="Foo" hint? right?/>…</Card>        // status_server_webui style
 * The shorthand is implemented as <Card><CardHeader title=…/>…</Card>.
 *
 * ## A nested Card is a section (v0.13)
 *
 * On its own, a Card is a *surface* within a page: a `--ds-surface` fill inside
 * a `--ds-border` outline, rounded and lifted by `--ds-shadow-card`. Inside a
 * `Panel`'s body it is not a surface at all. `Panel` is a page section drawn
 * from the same recipe, and a surface inside a surface reads as "a frame inside
 * a frame" — the reader has to count boxes to know what contains what (measured
 * on the dashboard monitor page, where the conversation-state panel is
 * Panel > Card x4 and navigation is Panel > Card x3-4 > row borders — omksos_web
 * `reports/monitor-ia-recomposition/`).
 *
 * v0.12 answered that by relaxing the recipe when nested (shadow dropped,
 * border stepped down to `--ds-border-subtle`), and the consumer's verdict was
 * that a fainter frame inside a frame is still a frame inside a frame — a
 * change of manner, not of structure (`reports/monitor-scope-coherence/`,
 * ruling B). So v0.13 replaces the rule rather than tuning it: in a panel body
 * a Card keeps its element, its API and its header, and gives up the four
 * properties that draw a surface — outline, fill, lift, corner. What is left is
 * what a section is made of: a heading, its content, and space around it.
 *
 * Containment is then stated by proximity and by the heading, which is the
 * reading that survives a panel growing a fourth and fifth section. Two
 * consequences worth knowing at a call site:
 *
 *  - the section's content is flush with the panel's own padding, so a
 *    `CardHeader` title lands on the exact column the panel's title occupies;
 *  - two sections stand `2 x --ds-space-xl` apart, twice the largest gap inside
 *    one of them, and that spacing is each section's own — it does not depend
 *    on the sections being adjacent siblings in the DOM.
 *
 * This is automatic and has no prop. `Card.module.css` keys it off Panel's
 * `data-panel-body` scope marker, so nesting is stated by where the caller put
 * the card and by nothing else — the 36+ existing call sites keep their exact
 * call shape, and the two consuming apps stay consistent with each other for
 * free. Everything `CardHeader` draws is unchanged in both positions: the title
 * is now the only containment signal there is, so it is not stepped down along
 * with the surface.
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
