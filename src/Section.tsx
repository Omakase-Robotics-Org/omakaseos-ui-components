/**
 * @file Section + SectionHeader — a headed group that is not a container.
 *
 * Two call shapes are accepted, the same pair `Card` accepts (the library is
 * upper-compatible with both consuming apps' idioms — CONTRIBUTING.md
 * "Backwards-compatible call shapes"), so a call site moving off `Card` keeps
 * its shape and only changes the word:
 *
 *   <Section title="Foo">…</Section>                                 // shorthand
 *   <Section><SectionHeader title="Foo" hint? right?/>…</Section>    // two-piece
 *
 * The shorthand is implemented as the two-piece form, exactly as `Card`'s is.
 *
 * ## What it is for (v0.14)
 *
 * A `Panel` is a section of the page and draws the surface that says so. Its
 * body is not a place for a second surface: a frame inside a frame makes the
 * reader count boxes to know what contains what. But a panel's content does
 * need dividing — "prompt", "turn", "language override" are separate matters
 * within one panel — and until v0.14 the only vocabulary for that was `Card`,
 * i.e. another container.
 *
 * `Section` is that vocabulary. It states a heading, its content, and the
 * rhythm that holds one apart from the next, and it draws nothing: no outline,
 * no fill, no lift, no corner. Grouping is carried by proximity and by the
 * heading, which is the reading that still works when a panel grows a fourth
 * and fifth part. Inside a `Panel` body it is the ONLY legal grouping — `Card`
 * and `Panel` both throw there (see `PanelScope.tsx`).
 *
 * It is not panel-only, though, and nothing about it refers to a panel: a
 * `Section` outside one is a headed group with the same rhythm, which is why
 * moving a section into or out of a panel changes nothing about how it renders.
 * That is the property v0.13's ancestor-selector rule could not have — there,
 * the same call rendered as two different things depending on where it sat.
 *
 * ## The heading is Card's heading
 *
 * `CardHeader` is implemented as `SectionHeader` (see `Card.tsx`): a card is a
 * section drawn on a surface, so its heading is the same object — 15px/600 over
 * an optional hint, with a right-hand slot. Sharing the implementation rather
 * than copying it is what makes "a section's heading is the heading a card
 * draws" a fact instead of a coincidence that drifts on the next edit. The
 * heading is an `<h2>` for the same reason `Card`'s is, so the two are
 * interchangeable in a document outline as well as on screen.
 */
import type { ReactNode } from "react";
import styles from "./Section.module.css";

export type SectionProps = {
  children: ReactNode;
  className?: string;
  /** Shorthand for a `SectionHeader` with only a title. */
  title?: string;
};

/** A headed group with no surface of its own — the way to divide a `Panel`. */
export function Section({ children, className, title }: SectionProps) {
  return (
    <section className={className ? `${styles.section} ${className}` : styles.section}>
      {title === undefined ? null : <SectionHeader title={title} />}
      {children}
    </section>
  );
}

export type SectionHeaderProps = {
  title: string;
  hint?: string;
  right?: ReactNode;
};

/** The heading of a section — and, as `CardHeader`, of a card. */
export function SectionHeader({ title, hint, right }: SectionHeaderProps) {
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
