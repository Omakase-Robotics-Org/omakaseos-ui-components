/**
 * @file TableSurface / Table / TableHeaderCell / TableRow / TableCell /
 * TableNotice — the table skin family, ported from the dashboard's
 * `DataTable.module.css` (233 lines) and the DOM `DataTable.tsx` renders
 * into it.
 *
 * ## The shape ruling: skin from `.table` down, typed components on top
 *
 * The dashboard's `DataTable` is a thin wrapper over TanStack Table's
 * headless model, and TanStack owns DOM this library cannot: `<thead>`
 * rows come from a header-group loop, and a virtualized `<tbody>` mounts
 * aria-hidden spacer `<tr>`s above and below the visible window. A typed
 * `<TableRow>`/`<TableCell>` fence around that DOM is not an option — the
 * consumer's collection engine has to be free to render a raw `<tr>`/`<td>`
 * and still get the identical skin.
 *
 * So the skin is written as DESCENDANT SELECTORS from `.table` (`.table
 * th`, `.table td`, `.table tbody tr:nth-child(even) td`, ...), exactly as
 * the dashboard's module does, and the typed components below are
 * ergonomics on top of that skin, not a fence around it: `TableRow` /
 * `TableCell` are a convenient way to get the right `data-*` attributes
 * right, but a hand-rolled `<tr>`/`<td>` inside `<Table>` renders
 * identically. This is why the zebra `tbody tr:nth-child(even)` rule keeps
 * counting straight through a virtualizer's spacer rows today — the spacer
 * is a plain `<tr>` and the selector does not know or care that it is one.
 *
 * `TableSurface` merges the dashboard's two near-duplicate wrappers
 * (`.surface` and `.virtualSurface`, which differed only in class name and
 * in a hard-coded `max-height` this library does not carry over): whether
 * the consumer virtualizes is entirely its own concern — react-virtual
 * mounts real `<tr>` elements in `<tbody>` either way — so `fill` is the
 * only axis the skin itself needs.
 *
 * `TableRow` forwards its ref (`forwardRef<HTMLTableRowElement, ...>`)
 * because a virtualizer attaches `measureElement` as the row ref
 * (`@tanstack/react-virtual`'s `rowVirtualizer.measureElement`); a
 * component that swallowed the ref would silently break row measurement
 * for exactly the consumer this primitive exists to serve.
 *
 * `TableHeaderCell` carries the ref's span-vs-button rule verbatim: a
 * SORTABLE column's label is a `<button>` (clicking it is how the column
 * sorts); a non-sortable one is a plain `<span>` — never a disabled
 * button — for two reasons that both bite: a `<button>`'s content model
 * forbids interactive content, and a header is exactly where a table puts
 * a select-all checkbox; and Chromium routes a pointer event on a disabled
 * form control's subtree to the disabled control and drops it, so a
 * checkbox nested in one would be unclickable — invalid markup that also
 * does not work. `.heading` is element-agnostic (it sets its own box,
 * border and background) so the two render identically.
 *
 * ## Dedup notes
 *
 * `FactColumns` is a label/value pairs surface with no row/column model —
 * not merged with this family. `Panel`/`Card` are page surfaces; a
 * `TableSurface` is a bordered scroller and must NOT open or close
 * `PanelScope` — a table inside a `Panel` body is the common case, and
 * `TableSurface` composes into it exactly the way `Section`'s plain
 * content does. `aui` has no table (assistant-ui renders markdown tables
 * as plain HTML, not through a shared primitive). `EmptyNote` is the
 * empty-state CONTENT; `TableSurface padded` is its frame (`<TableSurface
 * padded><EmptyNote label="…" /></TableSurface>`).
 */
import { forwardRef } from "react";
import type { MouseEventHandler, ReactNode } from "react";
import styles from "./Table.module.css";

// ---------------------------------------------------------------------------
// TableSurface
// ---------------------------------------------------------------------------

export type TableSurfaceProps = {
  /**
   * Fill the surface's parent (a flex track) and become the in-page
   * scroller on both axes, with a sticky `<thead>` — column context
   * survives scrolling. Off by default: a table embedded in a detail
   * page keeps growing to its content height.
   */
  fill?: boolean;
  /**
   * The empty-state gutter — the frame an `<EmptyNote>` sits inside when
   * the table has no rows. `TableSurface` is the frame; `EmptyNote` is
   * the content (see the dedup note above).
   */
  padded?: boolean;
  children: ReactNode;
};

/** The bordered, shadowed, radius-cornered scroll container a table sits in. */
export function TableSurface({ fill, padded, children }: TableSurfaceProps) {
  return (
    <div
      className={styles.surface}
      data-fill={fill ? "true" : undefined}
      data-padded={padded ? "true" : undefined}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export type TableDensity = "comfortable" | "compact";

export type TableProps = {
  /**
   * Vertical density of body rows. `comfortable` (the default) matches
   * the dashboard's original cell padding; `compact` halves it so a
   * fleet-scale table fits more rows per viewport. Headers stay one fixed
   * height regardless, so the column rhythm is constant across densities.
   */
  density?: TableDensity;
  children: ReactNode;
};

/**
 * The `<table>` itself. Owns ALL descendant skin — header/body cell
 * padding, zebra striping, hover wash, the sticky-header divider fix —
 * via the `.table`-rooted descendant selectors in `Table.module.css`, so
 * every `<thead>`/`<tbody>` shape a consumer's collection engine renders
 * underneath it is styled identically.
 */
export function Table({ density = "comfortable", children }: TableProps) {
  return (
    <table className={styles.table} data-density={density}>
      {children}
    </table>
  );
}

// ---------------------------------------------------------------------------
// TableHeaderCell
// ---------------------------------------------------------------------------

export type TableSortDirection = "asc" | "desc" | null;

export type TableHeaderCellSort = {
  direction: TableSortDirection;
  onSort: () => void;
};

export type TableHeaderCellProps = {
  align?: "end";
  /** Omit for a non-sortable column (renders a plain `<span>`, never a disabled button). */
  sort?: TableHeaderCellSort;
  children: ReactNode;
};

/** Sort-state glyph shown in a sortable column header, 13px inline SVG (no icon package). */
function SortIcon({ direction }: { direction: TableSortDirection }) {
  if (direction === "asc") {
    return (
      <svg
        aria-hidden="true"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={styles.sortIcon}
        data-active="true"
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    );
  }
  if (direction === "desc") {
    return (
      <svg
        aria-hidden="true"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={styles.sortIcon}
        data-active="true"
      >
        <path d="M12 5v14" />
        <path d="m19 12-7 7-7-7" />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles.sortIcon}
    >
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  );
}

/** `TableHeaderCellSort.direction` -> the `aria-sort` value the `<th>` carries. */
function ariaSortOf(direction: TableSortDirection): "ascending" | "descending" | "none" {
  if (direction === "asc") {
    return "ascending";
  }
  if (direction === "desc") {
    return "descending";
  }
  return "none";
}

/**
 * One column header. See the file header for the span-vs-button rule this
 * carries verbatim from the dashboard's `DataTable`.
 */
export function TableHeaderCell({ align, sort, children }: TableHeaderCellProps) {
  if (sort === undefined) {
    return (
      <th data-align={align}>
        <span className={styles.heading} data-align={align}>
          {children}
        </span>
      </th>
    );
  }
  return (
    <th data-sortable="true" data-align={align} aria-sort={ariaSortOf(sort.direction)}>
      <button
        type="button"
        className={styles.heading}
        data-interactive="true"
        data-align={align}
        onClick={sort.onSort}
      >
        {children}
        <SortIcon direction={sort.direction} />
      </button>
    </th>
  );
}

// ---------------------------------------------------------------------------
// TableRow
// ---------------------------------------------------------------------------

export type TableRowProps = {
  /** Row-navigable: pointer cursor, and the row is the click target the caller wires up. */
  clickable?: boolean;
  onClick?: MouseEventHandler<HTMLTableRowElement>;
  children: ReactNode;
};

/**
 * A body row. Forwards its ref to the `<tr>` — see the file header for why
 * this is load-bearing (a virtualizer's `measureElement`).
 */
export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  { clickable, onClick, children },
  ref,
) {
  return (
    <tr ref={ref} data-clickable={clickable ? "true" : undefined} onClick={onClick}>
      {children}
    </tr>
  );
});

// ---------------------------------------------------------------------------
// TableCell
// ---------------------------------------------------------------------------

export type TableCellProps = {
  align?: "end";
  children: ReactNode;
};

export function TableCell({ align, children }: TableCellProps) {
  return <td data-align={align}>{children}</td>;
}

// ---------------------------------------------------------------------------
// TableNotice
// ---------------------------------------------------------------------------

export type TableNoticeProps = {
  children: ReactNode;
};

/** The overflow-notice strip look — a one-line status rendered above the table. */
export function TableNotice({ children }: TableNoticeProps) {
  return (
    <p className={styles.notice} role="status">
      {children}
    </p>
  );
}
