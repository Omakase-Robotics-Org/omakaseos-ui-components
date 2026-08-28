/**
 * @file LinkAppearance — the two inline-link visual registers shared
 * across tables, fact lists and detail-page headers.
 *
 * Ported from two dashboard primitives that drew the same shape from two
 * separate `<Link>` wrappers: `InlineLink` (`tone="accent"` — the
 * drill-down link used inside table cells / fact values) and `BackLink`
 * (`tone="muted"` — the "← back to X" link above a detail page's header).
 * This library ships no router, so it cannot own a `<Link to>` itself;
 * instead it owns only the APPEARANCE and hands the DOM node back to the
 * caller via `asChild`, so a consumer wraps its own router's `<Link>` (or
 * a plain `<a>`) without a wrapper element ever coming between the two.
 *
 * - `asChild` omitted: renders a plain `<a>` around `children` — enough
 *   for a Storybook story or any host with no router in scope.
 * - `asChild`: `React.Children.only(children)` (throws on anything but
 *   exactly one element — silently taking the first of several would be
 *   a banned fallback) then `cloneElement`s the child, APPENDING this
 *   tone's class to whatever `className` the child already carries. No
 *   wrapper element is ever introduced — a wrapper would change the flex
 *   box a caller lays the link out inside. Plain React only; this
 *   library does not depend on `@radix-ui/react-slot` for this.
 *
 * Dedup note: `Button` `variant="ghost"` is a PRESS TARGET with control
 * geometry (height, padding, focus ring sized for a button) — this is
 * inline text flow with no control chrome at all. `StatusBadge` is a
 * register for a piece of DATA (a state word), not a navigational
 * affordance.
 *
 * Deliberately NOT ported: BackLink's `margin-bottom`. That is the
 * consumer's layout relationship to whatever sits below it (a
 * `PageHeader`, in the dashboard) — an app-side rule, not part of what a
 * "muted inline link" looks like.
 */
import { Children, cloneElement, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import styles from "./LinkAppearance.module.css";

export type LinkAppearanceTone = "accent" | "muted";

/** Props for {@link LinkAppearance}. */
export type LinkAppearanceProps = {
  /** `accent` = drill-down link register; `muted` = back-link register. */
  readonly tone: LinkAppearanceTone;
  /**
   * When true, clone the single child element instead of rendering a
   * wrapper `<a>`. See the file header — no wrapper is ever introduced.
   */
  readonly asChild?: boolean;
  readonly children: ReactNode | ReactElement;
};

function toneClassName(tone: LinkAppearanceTone): string {
  return tone === "accent" ? styles.accent! : styles.muted!;
}

/** Shared inline-link appearance. See the file header for the two registers. */
export function LinkAppearance(props: LinkAppearanceProps) {
  const { tone, asChild, children } = props;
  const toneClass = toneClassName(tone);

  if (asChild) {
    // Throws (not a silent "take the first") when `children` is not
    // exactly one valid element.
    const only = Children.only(children);
    if (!isValidElement(only)) {
      throw new Error(
        "LinkAppearance: asChild requires exactly one valid React element child.",
      );
    }
    const child = only as ReactElement<{ className?: string }>;
    const existingClassName = child.props.className;
    const mergedClassName = existingClassName
      ? `${existingClassName} ${toneClass}`
      : toneClass;
    return cloneElement(child, { className: mergedClassName });
  }

  return <a className={toneClass}>{children}</a>;
}
