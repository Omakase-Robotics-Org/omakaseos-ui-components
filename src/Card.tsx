/**
 * @file Card + CardHeader — bordered surface with an optional titled header.
 *
 * Two call shapes are accepted:
 *   <Card title="Foo">…</Card>                                  // omks-robo/web shorthand
 *   <Card><CardHeader title="Foo" hint? right?/>…</Card>        // status_server_webui style
 * The shorthand is implemented as <Card><CardHeader title=…/>…</Card>.
 *
 * A Card is a *surface within a page*: a `--ds-surface` fill inside a
 * `--ds-border` outline, rounded and lifted by `--ds-shadow-card`. It looks the
 * same everywhere it is allowed — there is no context in which it renders as
 * something else.
 *
 * ## A Card may not sit inside a Panel (v0.14)
 *
 * `Panel` is drawn from the same recipe, so a Card in a panel body is a frame
 * inside a frame and the reader has to count boxes to know what contains what
 * (measured on the dashboard monitor page, where `ConversationStatePanel` is
 * Panel > Card x4 and navigation was Panel > Card x3-4 > row borders — omksos_web
 * `reports/monitor-ia-recomposition/`). v0.12 answered that by relaxing the
 * nested recipe and v0.13 by removing the surface from it; both were rejected,
 * the second time on the ground that repainting a violation until it looks
 * legal leaves the structure it was meant to prevent and makes the call site
 * lie (`reports/monitor-scope-coherence/`, ruling B).
 *
 * So v0.14 removes the ancestor rule and states the contract instead: rendering
 * a Card as part of a `Panel`'s content **throws**, naming `Section` — a
 * heading, its content and the rhythm around it, with no surface — as what the
 * caller wanted. The check is a React context read, so it is about composition
 * rather than DOM position: a Card portalled out of a panel's subtree is not a
 * violation and does not throw. `PanelScope.tsx` carries the reasoning.
 *
 * The throw is the first thing this component does, before anything is
 * rendered, and it fires in production as well as in development — see
 * `useInsidePanel`.
 */
import type { ReactNode } from "react";
import { useInsidePanel } from "./PanelScope";
import { SectionHeader, type SectionHeaderProps } from "./Section";
import styles from "./Card.module.css";

export type CardProps = {
  children: ReactNode;
  className?: string;
  title?: string;
};

export function Card({ children, className, title }: CardProps) {
  if (useInsidePanel()) {
    throw new Error(
      "Card must not nest inside a Panel — use Section for grouping within a panel",
    );
  }

  return (
    <section className={className ? `${styles.card} ${className}` : styles.card}>
      {title === undefined ? null : <CardHeader title={title} />}
      {children}
    </section>
  );
}

/**
 * A card's header is a section's heading: same type, same optional hint, same
 * right-hand slot. It is `SectionHeader` rather than a copy of it, so the two
 * cannot drift — a card is a section drawn on a surface. The name stays because
 * both consuming apps call it at 36+ sites and because that is the word for it
 * at a card's call site.
 */
export type CardHeaderProps = SectionHeaderProps;

export function CardHeader({ title, hint, right }: CardHeaderProps) {
  return <SectionHeader title={title} hint={hint} right={right} />;
}
