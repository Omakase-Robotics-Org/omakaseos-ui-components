/**
 * @file AsyncCombobox — type-to-search single-choice picker over a
 * server-fetched candidate list.
 *
 * The library's only synthetic ARIA widget. See the **AsyncCombobox
 * exception** in `AGENTS.md` and the boundary spec
 * (`spec/async-combobox-boundary.spec.ts`) for the rules that keep
 * this primitive bounded.
 *
 * Why a synthetic combobox at all (when the rest of the library is
 * native-only): `<select>` and `<datalist>` both break at thousands
 * of options — the OS picker either freezes, scrolls poorly, or
 * silently truncates. The omksos dashboard has tag and agent lists
 * that grow unboundedly per tenant; a "type-to-search the server"
 * picker is the only way to keep filter UI honest at scale.
 *
 * The native half stays native: the `<input>` is a real input, so
 * IME, mobile soft keyboards, autocomplete, and right-click menus
 * keep working. The synthetic half is a `<ul role="listbox">` panel
 * with arrow-key navigation and ARIA `activedescendant` wiring.
 *
 * Library boundary (what this primitive does NOT do):
 *  - Does not fetch. The consumer passes `searchFn(q) => Promise<Option[]>`.
 *  - Does not own the URL or pagination. Page size lives in the
 *    consumer's searchFn, value lives in the consumer's state.
 *  - Does not localise. The empty / loading labels are passed in.
 *  - Does not handle multi-select. Single value per emit.
 *
 * Race-safe: every searchFn call gets a monotonically increasing
 * request id and an AbortSignal. A late response from request N is
 * dropped if a newer request M (> N) has already been issued, so the
 * dropdown never shows the result of an obsolete query.
 *
 * Typical use (the omksos RobotsPage filter integration):
 *
 *   <AsyncCombobox
 *     id="tag-filter"
 *     value={selectedTagId ?? ""}
 *     selectedLabel={selectedTag?.name ?? ""}
 *     placeholder="Search tags…"
 *     searchFn={(q, signal) =>
 *       api.listOrgTags({ q, limit: 20 }, { signal })
 *         .then((r) => r.items.map((t) => ({ value: t.id, label: t.name })))
 *     }
 *     onChange={(value) => setTag(value)}
 *     anyOptionLabel="Any tag"
 *     loadingLabel="Searching…"
 *     noResultsLabel="No matches"
 *   />
 */
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, KeyboardEvent, MouseEvent } from "react";
import styles from "./AsyncCombobox.module.css";

export type AsyncComboboxSize = "sm" | "md" | "lg";

/** One candidate returned by `searchFn`. */
export type AsyncComboboxOption = {
  /** Stable identifier emitted via `onChange` when this option is picked. */
  readonly value: string;
  /** Visible text rendered in the input and the listbox row. */
  readonly label: string;
};

/**
 * Async fetcher the consumer wires up. Receives the current query
 * string (already trimmed by the consumer's debounce window) and an
 * AbortSignal that fires when a newer query supersedes this one. The
 * fetcher is expected to forward the signal to `fetch` (or its
 * client) so the network call cancels at the wire — but even if it
 * does not, the combobox itself drops late results, so a slow fetcher
 * cannot ever paint stale options.
 */
export type AsyncComboboxSearchFn = (
  query: string,
  signal: AbortSignal,
) => Promise<readonly AsyncComboboxOption[]>;

export type AsyncComboboxProps = {
  /** DOM id for the `<input>`; auto-generated when omitted. */
  id?: string;
  /**
   * Currently selected option's value (controlled). Empty string
   * means "no selection" — the consumer typically maps this to
   * "filter cleared / Any" semantics.
   */
  value: string;
  /**
   * Human-readable label of the currently selected option. Required
   * because the combobox itself does not cache previous searchFn
   * responses: when the consumer's URL is restored from a deep link,
   * only `value` is known up front, and the loader is expected to
   * resolve a label and pass it here.
   *
   * Empty string when no selection.
   */
  selectedLabel: string;
  /** Called when the user picks a new option, clears, or types-to-clear. */
  onChange: (next: { value: string; label: string }) => void;
  /** Placeholder shown when the input is empty AND nothing is selected. */
  placeholder?: string;
  /** Async candidate fetcher. See `AsyncComboboxSearchFn`. */
  searchFn: AsyncComboboxSearchFn;
  /**
   * Localised label for the synthetic "any / clear" sentinel option
   * shown at the top of the panel. Picking it emits
   * `{ value: "", label: "" }`. Required so a chip strip / count line
   * always sees a clear-able state.
   */
  anyOptionLabel: string;
  /** Shown inside the panel while a fetch is in-flight. */
  loadingLabel: string;
  /** Shown when the fetcher returned zero options. */
  noResultsLabel: string;
  /**
   * Debounce window in milliseconds applied between an input change
   * and the next searchFn call. Defaults to 300ms — the same window
   * the consuming dashboard uses for its other text-search fields.
   */
  debounceMs?: number;
  /** Visual size of the input. */
  comboboxSize?: AsyncComboboxSize;
  /** Sets `aria-invalid` and shifts the border to the danger tone. */
  invalid?: boolean;
  /** Disables the combobox entirely. */
  disabled?: boolean;
  /** Optional className appended to the wrap element. */
  className?: string;
};

/**
 * Single-choice synthetic combobox over an async candidate list.
 */
export function AsyncCombobox(props: AsyncComboboxProps) {
  const {
    id,
    value,
    selectedLabel,
    onChange,
    placeholder,
    searchFn,
    anyOptionLabel,
    loadingLabel,
    noResultsLabel,
    debounceMs = 300,
    comboboxSize = "md",
    invalid,
    disabled,
    className,
  } = props;

  const reactId = useId();
  const inputId = id ?? reactId;
  const listboxId = `${inputId}-listbox`;

  // Track whether the user has typed (= editing mode). When NOT
  // editing, the input shows `selectedLabel` verbatim. Once editing,
  // the input shows the user's current query verbatim until either
  // a pick or a blur reverts it.
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const [results, setResults] = useState<readonly AsyncComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);

  // The "active option" (= the row that Enter would commit). Index
  // is over the panel's render order: 0 is the synthetic "any" row,
  // 1..N are the searchFn results.
  const [activeIndex, setActiveIndex] = useState(0);

  /**
   * Monotonic request counter so a late response from an older
   * search cannot overwrite a fresher one. Any time we begin a new
   * fetch we ++ this counter and the inflight callback compares its
   * captured value before painting.
   */
  const requestSeqRef = useRef(0);
  /** Active AbortController for the in-flight fetch (if any). */
  const abortRef = useRef<AbortController | null>(null);
  /** Pending debounce timer id. */
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Outer wrap element so click-outside detection works. */
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const cancelInflight = useCallback(() => {
    if (abortRef.current !== null) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  /**
   * Issue a (debounced) search. The actual fetch fires after
   * `debounceMs` of idle time; an earlier search in the same window
   * is cancelled (its abort signal fires + its sequence becomes
   * stale).
   */
  const requestSearch = useCallback(
    (nextQuery: string) => {
      cancelInflight();
      setLoading(true);
      const seq = ++requestSeqRef.current;
      const controller = new AbortController();
      abortRef.current = controller;
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        searchFn(nextQuery, controller.signal)
          .then((items) => {
            // Drop the response if a newer search has been started.
            if (seq !== requestSeqRef.current) {
              return;
            }
            setResults(items);
            setLoading(false);
            // Reset highlight to the synthetic "any" row whenever the
            // result set changes, to keep keyboard navigation
            // predictable.
            setActiveIndex(0);
          })
          .catch((err: unknown) => {
            if (seq !== requestSeqRef.current) {
              return;
            }
            // AbortError is the expected outcome of cancellation —
            // don't surface it to the user. Anything else falls back
            // to "no results" so the panel remains usable.
            if (
              err instanceof DOMException &&
              err.name === "AbortError"
            ) {
              return;
            }
            setResults([]);
            setLoading(false);
          });
      }, debounceMs);
    },
    [cancelInflight, debounceMs, searchFn],
  );

  // Cleanup: cancel any pending work on unmount.
  useEffect(() => {
    return () => {
      cancelInflight();
    };
  }, [cancelInflight]);

  // Render-list assembly. The "any" sentinel is row 0 so its
  // activeIndex addressing is invariant even when the search returns
  // zero rows.
  const rows = useMemo(
    () => [{ value: "", label: anyOptionLabel } as AsyncComboboxOption, ...results],
    [anyOptionLabel, results],
  );

  const inputDisplay = editing ? query : selectedLabel;

  const optionId = (index: number): string => `${inputId}-option-${index}`;

  const beginEditing = () => {
    setEditing(true);
    setQuery("");
    setOpen(true);
    requestSearch("");
  };

  const commit = (next: AsyncComboboxOption) => {
    cancelInflight();
    setLoading(false);
    setEditing(false);
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
    // The synthetic "any" sentinel has `value === ""`. Surface that
    // verbatim to the consumer with an empty label so a chip-strip
    // / URL writer can treat it as "no selection" without
    // hard-coding the localised label string ("Any tag" /
    // "Any agent" / ...). The non-sentinel path keeps the visible
    // label so the consumer can paint it on the next render
    // without round-tripping through the searchFn.
    const emit =
      next.value === ""
        ? { value: "", label: "" }
        : { value: next.value, label: next.label };
    if (emit.value !== value || emit.label !== selectedLabel) {
      onChange(emit);
    }
  };

  const revert = () => {
    cancelInflight();
    setLoading(false);
    setEditing(false);
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    if (!editing) {
      setEditing(true);
    }
    setQuery(next);
    setOpen(true);
    requestSearch(next);
  };

  const onInputFocus = () => {
    if (disabled) {
      return;
    }
    if (!editing) {
      beginEditing();
    } else {
      setOpen(true);
    }
  };

  const onInputBlur = () => {
    // The blur handler must NOT close the panel synchronously,
    // because a click on a `<li>` option fires `mousedown`+`blur`+
    // `click`, and closing on blur would unmount the option before
    // its click handler runs. We rely on the option's `onMouseDown`
    // (which calls preventDefault) to keep focus on the input until
    // commit. A pointer outside the wrap is handled by the
    // document-level mousedown listener below.
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open || !editing) {
        beginEditing();
        return;
      }
      setActiveIndex((prev) => Math.min(prev + 1, rows.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        return;
      }
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (event.key === "Home") {
      if (!open) {
        return;
      }
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End") {
      if (!open) {
        return;
      }
      event.preventDefault();
      setActiveIndex(rows.length - 1);
      return;
    }
    if (event.key === "Enter") {
      if (!open || !editing) {
        return;
      }
      event.preventDefault();
      const picked = rows[activeIndex];
      if (picked !== undefined) {
        commit(picked);
      }
      return;
    }
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        revert();
      }
    }
  };

  // Click-outside / focus-outside detection. The dropdown stays
  // open while the user types, but a click anywhere else commits a
  // revert (the input goes back to showing `selectedLabel`).
  useEffect(() => {
    if (!open) {
      return;
    }
    const onDocMouseDown = (event: globalThis.MouseEvent) => {
      const wrap = wrapRef.current;
      if (wrap === null) {
        return;
      }
      const target = event.target;
      if (target instanceof Node && wrap.contains(target)) {
        return;
      }
      revert();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
    };
    // `revert` is stable across renders modulo state setters; we
    // intentionally re-bind only when `open` flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onOptionMouseDown = (index: number) => (event: MouseEvent<HTMLLIElement>) => {
    // Keep the input focused while the click resolves so the blur
    // handler does not race with the commit.
    event.preventDefault();
    const picked = rows[index];
    if (picked !== undefined) {
      commit(picked);
    }
  };

  const wrapClassName = className ? `${styles.wrap} ${className}` : styles.wrap;
  const activeOptionId = open ? optionId(activeIndex) : undefined;

  return (
    <div
      ref={wrapRef}
      className={wrapClassName}
      data-size={comboboxSize}
      data-invalid={invalid ? "true" : undefined}
      data-open={open ? "true" : undefined}
    >
      <input
        id={inputId}
        type="text"
        className={styles.input}
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-invalid={invalid ? "true" : undefined}
        disabled={disabled}
        placeholder={placeholder}
        value={inputDisplay}
        onChange={onInputChange}
        onFocus={onInputFocus}
        onBlur={onInputBlur}
        onKeyDown={onKeyDown}
      />
      <span className={styles.chevron} aria-hidden="true" />
      <div className={styles.panel} role="presentation">
        {loading && results.length === 0 ? (
          <p className={styles.loading} aria-live="polite">
            {loadingLabel}
          </p>
        ) : null}
        <ul
          id={listboxId}
          className={styles.listbox}
          role="listbox"
          aria-label={placeholder ?? anyOptionLabel}
        >
          {rows.map((option, index) => (
            <li
              key={`${option.value}::${index}`}
              id={optionId(index)}
              className={styles.option}
              role="option"
              aria-selected={option.value === value}
              data-active={index === activeIndex ? "true" : undefined}
              // Native tooltip on hover so the full label survives
              // even if a future consumer squeezes the panel wide
              // enough that wrapping still cannot fit the text.
              // Defense-in-depth: the CSS wrap is the primary fix,
              // this attribute is the visible fallback.
              title={option.label}
              onMouseDown={onOptionMouseDown(index)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
        {!loading && results.length === 0 && open ? (
          <p className={styles.empty} aria-live="polite">
            {noResultsLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
