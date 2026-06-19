/**
 * @file Card + CardHeader — bordered surface with an optional titled header.
 *
 * Two call shapes are accepted:
 *   <Card title="Foo">…</Card>                                  // omks-robo/web shorthand
 *   <Card><CardHeader title="Foo" hint? right?/>…</Card>        // status_server_webui style
 * The shorthand is implemented as <Card><CardHeader title=…/>…</Card>.
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
