/**
 * @file Heading — semantic heading element bound to a typographic level.
 *
 * `level` controls BOTH the rendered HTML element (h1..h4) and the
 * typographic scale via data-level. They are intentionally coupled — using
 * h2 styling on an h4 element (or vice versa) is exactly the misuse this
 * component prevents. If a consumer needs to display heading-styled text
 * outside of a document outline, render an Input/text directly with the
 * appropriate font-size token.
 *
 * `truncate` opts into single-line ellipsis. The default is multi-line wrap
 * (overflow-wrap: anywhere) so a long heading inside a narrow Card stays
 * fully visible without breaking layout — never silently clipped.
 */
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Heading.module.css";

export type HeadingLevel = 1 | 2 | 3 | 4;

export type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  level: HeadingLevel;
  truncate?: boolean;
  children: ReactNode;
};

export function Heading({
  level,
  truncate,
  className,
  children,
  ...rest
}: HeadingProps) {
  const cls = className ? `${styles.heading} ${className}` : styles.heading;
  const dataLevel = String(level);
  const dataTruncate = truncate ? "true" : undefined;
  const common = {
    className: cls,
    "data-level": dataLevel,
    "data-truncate": dataTruncate,
    ...rest,
  };
  if (level === 1) {
    return <h1 {...common}>{children}</h1>;
  }
  if (level === 2) {
    return <h2 {...common}>{children}</h2>;
  }
  if (level === 3) {
    return <h3 {...common}>{children}</h3>;
  }
  return <h4 {...common}>{children}</h4>;
}
