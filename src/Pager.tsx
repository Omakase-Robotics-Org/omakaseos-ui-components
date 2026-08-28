/**
 * @file Pager — presentational number-pager footer.
 *
 * A page-number paginator: First / Previous / [centered window of
 * page-number buttons] / Next / Last, plus a localized "page X of N"
 * summary. The component owns no state; the consumer passes `page` +
 * `totalPages` and reacts to `onChange` by updating its own source of
 * truth (a URL, a query param, local state).
 *
 * Hidden when there is at most one page — a one-page list does not need
 * pagination chrome.
 *
 * The numeric window is computed by `pageWindow` (this module's sibling)
 * and capped at `maxButtons` (5 by default); the operator can always reach
 * the first/last page in one click via the boundary buttons, so an
 * unbounded button row would just be visual noise.
 *
 * Labels are a REQUIRED, un-defaulted bag (`labels`) — the workspace bans
 * silent fallbacks, and a baked-in English default is exactly that. Every
 * accessible name (boundary buttons, number buttons, the `<nav>` region)
 * is written EXPLICITLY from `labels` rather than relying on a
 * title-mirrors-to-aria-label convention: the dashboard ref this was
 * ported from depended on a local title→aria-label mirror that is being
 * retired, so this library writes `aria-label` itself.
 *
 * Dedup note: `ButtonRow` is a margin-free horizontal group — an internal
 * detail at most, not a navigation contract. `Toolbar` is `role="toolbar"`,
 * a different landmark than this component's `role="navigation"`.
 * `TabStrip` is selection among views (mutually exclusive panels); this is
 * ordinal traversal through one dataset's pages — different semantics even
 * though both render a row of buttons with one "current" member.
 */
import { pageWindow } from "./page-window";
import styles from "./Pager.module.css";
import { Button } from "./Button";

/** Localized labels `Pager` needs — required, no English fallback. */
export type PagerLabels = {
  /** `aria-label` for the `<nav>` landmark. */
  readonly region: string;
  readonly first: string;
  readonly previous: string;
  readonly next: string;
  readonly last: string;
  /** `aria-label` for a numbered page button, e.g. "Go to page 4". */
  readonly goToPage: (n: number) => string;
  /** "Page X of Y" summary text. */
  readonly summary: (page: number, total: number) => string;
};

/** Props for {@link Pager}. */
export type PagerProps = {
  readonly page: number;
  readonly totalPages: number;
  readonly onChange: (page: number) => void;
  /** Width of the numeric window. Defaults to 5. */
  readonly maxButtons?: number;
  readonly labels: PagerLabels;
};

function ChevronLeftIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function ChevronsLeftIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 17l-5-5 5-5M11 17l-5-5 5-5" />
    </svg>
  );
}

function ChevronsRightIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 17l5-5-5-5M13 17l5-5-5-5" />
    </svg>
  );
}

/** Render the pager. Returns `null` when there is at most one page. */
export function Pager(props: PagerProps) {
  const { page, totalPages, onChange, labels } = props;
  if (totalPages <= 1) {
    return null;
  }
  const atFirst = page <= 1;
  const atLast = page >= totalPages;
  const window = pageWindow({ page, totalPages, maxButtons: props.maxButtons ?? 5 });

  return (
    <nav className={styles.pager} role="navigation" aria-label={labels.region}>
      <Button aria-label={labels.first} disabled={atFirst} onClick={() => onChange(1)}>
        <ChevronsLeftIcon />
      </Button>
      <Button
        aria-label={labels.previous}
        disabled={atFirst}
        onClick={() => onChange(Math.max(1, page - 1))}
      >
        <ChevronLeftIcon />
      </Button>
      <span className={styles.numbers}>
        {window.map((n) => (
          <Button
            key={n}
            aria-label={labels.goToPage(n)}
            aria-current={n === page ? "page" : undefined}
            variant={n === page ? "primary" : "secondary"}
            onClick={() => onChange(n)}
          >
            <span className={n === page ? styles.numberCurrent : undefined}>{n}</span>
          </Button>
        ))}
      </span>
      <Button
        aria-label={labels.next}
        disabled={atLast}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
      >
        <ChevronRightIcon />
      </Button>
      <Button aria-label={labels.last} disabled={atLast} onClick={() => onChange(totalPages)}>
        <ChevronsRightIcon />
      </Button>
      <span className={styles.summary}>{labels.summary(page, totalPages)}</span>
    </nav>
  );
}
