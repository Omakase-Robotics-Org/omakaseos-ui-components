/**
 * @file AsyncMultiCombobox — v0.19: multi-choice, type-to-search picker
 * over an async candidate list, absorbing the dashboard's
 * `ResourceMultiPicker` (`.codex/ref/ResourceMultiPicker.tsx`) into the
 * library.
 *
 * Sibling to `AsyncCombobox` (single-choice), not a variant of it: this
 * widget owns a controlled *set* of selected keys, rendered as a chip row
 * INSIDE the same bordered control box as the search input (one
 * token-input control), with the candidate panel beneath it excluding
 * whatever is already selected. `AsyncCombobox`'s internal race guard
 * (debounce / abort / monotonic sequence) is reused via
 * `useAsyncCandidates` rather than reimplemented — see that hook's file
 * header for why a second, independent reimplementation
 * (`useResourceCandidates`, the ref's own hook) is exactly the
 * duplication that hook exists to retire. This component keeps only the
 * thin query/open state the ref's hook wrapped around it; the debounce,
 * abort, and sequence guarantees themselves live in `useAsyncCandidates`
 * alone.
 *
 * The library's synthetic-widget boundary (`spec/async-combobox-boundary.spec.ts`)
 * now has TWO entries — `AsyncCombobox` and this file — enumerated there
 * by an explicit, bidirectionally-checked `SYNTHETIC_WIDGETS` map rather
 * than a single hard-coded exception.
 *
 * Chips: unified on the library `RemovableChip` by operator ruling
 * (2026-08-28) — the ref's own two-element 999px pill (a label `<span>` +
 * a separate `<button>×</button>`) is RETIRED here. `RemovableChip` is
 * ONE press target (`--ds-radius-chip`), already carries a `disabled`
 * prop, and is reused verbatim rather than forked a second chip
 * implementation.
 *
 * Ported from the ref verbatim (each decision below carries its own
 * inline comment at the call site):
 *  - one bordered "control" box holds the wrapping chip row AND the
 *    growing search input; the focus ring lives on the box
 *    (`:focus-within`), not the input;
 *  - the candidate panel is `display: none` while closed rather than
 *    unmounted, so `aria-controls` stays resolvable even when the panel
 *    is not shown;
 *  - `role="listbox" aria-multiselectable="true"` + `role="option"` +
 *    loading / no-results notes;
 *  - keyboard model: ArrowDown opens-then-moves; ArrowUp/Home/End; Enter
 *    adds the active candidate AND keeps the panel open (rapid
 *    multi-add); Escape closes; Backspace on an empty query removes the
 *    last chip;
 *  - already-selected candidates are excluded from the list, and the
 *    highlighted index is clamped every render so picking an item near
 *    the end of a shrinking list cannot leave the highlight pointing
 *    past it;
 *  - `onMouseDown` + `preventDefault` on BOTH a candidate row and a
 *    chip, so a pointer commit never yields focus to the row/button
 *    before its own click fires — the exact guard `AsyncCombobox` uses
 *    for its options, extended here to the chip's own press target too.
 *    This is NEW relative to the ref: the ref's chip was a `<span>` +
 *    `<button>` pair with no such guard. Ours reuses a real `<button>`
 *    via `RemovableChip`, so the same focus-retention guard applies to
 *    it as to a candidate row;
 *  - the outside-click listener runs in the CAPTURE phase: a pick
 *    removes its `<li>` (or its chip) from the DOM synchronously, and a
 *    bubble-phase handler would see a detached `event.target` and
 *    misread an inside pick as an outside click;
 *  - a "seen label" memory (a plain `Map` ref) remembers every label the
 *    widget has ever rendered for a value — search result rows AND
 *    freshly added chips — so a just-picked key renders its label
 *    immediately, before the consumer's own `resolveLabel` (a
 *    catalog/loader lookup, potentially async on the caller's side) has
 *    a chance to catch up. Resolution order is seen → `resolveLabel` →
 *    the raw key as a last resort.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { RemovableChip } from "./RemovableChip";
import { useAsyncCandidates } from "./useAsyncCandidates";
import type { AsyncComboboxOption, AsyncComboboxSearchFn } from "./AsyncCombobox";
import styles from "./AsyncMultiCombobox.module.css";

export type AsyncMultiComboboxProps = {
  /** DOM id for the `<input>` — supplied by the app's `<Field>` render-prop. */
  id: string;
  /** Controlled selection, by key. */
  selected: readonly string[];
  /** Emits the full next key set on every add / remove. */
  onChange: (nextKeys: string[]) => void;
  /** Async candidate fetcher. See `AsyncComboboxSearchFn`. */
  searchFn: AsyncComboboxSearchFn;
  /**
   * Consumer catalog/loader lookup for a selected key's label. Tried
   * AFTER the widget's own "seen label" memory (a key just picked from a
   * search result, or already visible in a prior search, already has a
   * label this widget observed directly) and BEFORE falling back to the
   * raw key.
   */
  resolveLabel?: (key: string) => string | undefined;
  /** Placeholder shown in the search input. */
  placeholder?: string;
  /** Debounce window (ms) before a search fires. Defaults to 300ms. */
  debounceMs?: number;
  /** Disables the whole control: input, chips, and their remove targets. */
  disabled?: boolean;
  /** Sets `aria-invalid` and shifts the control border to the danger tone. */
  invalid?: boolean;
  /** Shown inside the panel while a fetch is in-flight. */
  loadingLabel: string;
  /** Shown when a search returns no (unselected) candidates. */
  noResultsLabel: string;
  /** Accessible name for the candidate listbox. */
  listboxLabel: string;
  /** Accessible name for a chip's remove control, given its label. */
  removeLabel: (label: string) => string;
};

/** Stable DOM id for the option at `index`, scoped to this widget's own id. */
function optionId(base: string, index: number): string {
  return `${base}-option-${String(index)}`;
}

/**
 * Multi-select synthetic combobox over an async candidate list. See the
 * file header for the decisions ported from `.codex/ref/ResourceMultiPicker.tsx`
 * and the ones that deliberately differ from it.
 */
export function AsyncMultiCombobox(props: AsyncMultiComboboxProps) {
  const {
    id,
    selected,
    onChange,
    searchFn,
    resolveLabel,
    placeholder,
    debounceMs = 300,
    disabled,
    invalid,
    loadingLabel,
    noResultsLabel,
    listboxLabel,
    removeLabel,
  } = props;

  const listboxId = `${id}-listbox`;

  const [query, setQueryState] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Race-safe fetch core — reused, not reimplemented. See file header.
  const {
    options: results,
    loading,
    search: requestSearch,
    cancel: cancelInflight,
  } = useAsyncCandidates(searchFn, { debounceMs });

  // Seen-label memory: every value/label pair this widget has ever
  // observed, from a search result row OR a freshly added chip. Ported
  // from the ref's `seenLabelsRef`. Mutating a plain ref's Map (not
  // component state) during render is a cache update, not a state
  // transition — it does not need the equality-gated "adjust state
  // during render" pattern `AsyncCombobox` uses for `activeIndex`.
  const seenLabelsRef = useRef<Map<string, string>>(new Map());
  for (const option of results) {
    seenLabelsRef.current.set(option.value, option.label);
  }

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  // Excluded candidates: a selected key is always an "add" target, never
  // shown twice in the panel.
  const candidates = results.filter((option) => !selectedSet.has(option.value));
  // Clamp every render — adding an item shrinks the candidate list
  // without `results` itself changing, so a stale index could otherwise
  // point past the end.
  const active = candidates.length === 0 ? 0 : Math.min(activeIndex, candidates.length - 1);

  /** seen → resolveLabel → raw key, in that order. */
  const labelFor = (key: string): string => {
    const remembered = seenLabelsRef.current.get(key);
    if (remembered !== undefined) {
      return remembered;
    }
    const resolved = resolveLabel?.(key);
    if (resolved !== undefined) {
      return resolved;
    }
    return key;
  };

  const changeQuery = (next: string) => {
    setActiveIndex(0);
    setQueryState(next);
    setOpen(true);
    requestSearch(next);
  };

  const openWithReset = () => {
    setActiveIndex(0);
    setOpen(true);
    setQueryState("");
    requestSearch("");
  };

  const closePanel = () => {
    cancelInflight();
    setOpen(false);
    setQueryState("");
  };

  const addOption = (option: AsyncComboboxOption) => {
    seenLabelsRef.current.set(option.value, option.label);
    if (!selectedSet.has(option.value)) {
      onChange([...selected, option.value]);
    }
    // Keep the panel open for rapid multi-add; keep the query so the
    // operator can keep narrowing the same search (ref's own decision).
    inputRef.current?.focus();
  };

  const removeKey = (key: string) => {
    onChange(selected.filter((candidate) => candidate !== key));
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled === true) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        openWithReset();
        return;
      }
      setActiveIndex(Math.min(active + 1, candidates.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        return;
      }
      setActiveIndex(Math.max(active - 1, 0));
      return;
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(candidates.length - 1);
      return;
    }
    if (event.key === "Enter") {
      if (!open || candidates.length === 0) {
        return;
      }
      event.preventDefault();
      const picked = candidates[active];
      if (picked !== undefined) {
        addOption(picked);
      }
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      closePanel();
      return;
    }
    if (event.key === "Backspace" && query === "" && selected.length > 0) {
      event.preventDefault();
      const last = selected[selected.length - 1];
      if (last !== undefined) {
        removeKey(last);
      }
    }
  };

  const onOptionMouseDown = (option: AsyncComboboxOption) => (event: MouseEvent<HTMLLIElement>) => {
    // Hold focus on the input through the commit — see file header.
    event.preventDefault();
    addOption(option);
  };

  const onChipMouseDown = (event: MouseEvent<HTMLSpanElement>) => {
    // Same focus-retention guard as `onOptionMouseDown`, extended to the
    // chip's own press target — see file header for why this is new
    // relative to the ref.
    event.preventDefault();
  };

  // Close on a pointer outside the wrap while the panel is open.
  //
  // CAPTURE phase, not bubble: picking a candidate (or removing a chip)
  // can remove its element from the DOM synchronously as part of the
  // same commit, so by the time a bubble-phase handler ran,
  // `event.target` would already be detached and `wrap.contains(target)`
  // would read false — wrongly treating an inside pick as an outside
  // click and closing the panel. In the capture phase the event is
  // inspected before React commits the removal, so the target is still
  // attached and containment reads correctly.
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
      closePanel();
    };
    document.addEventListener("mousedown", onDocMouseDown, true);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown, true);
    };
    // `closePanel` is stable across renders modulo state setters; we
    // intentionally re-bind only when `open` flips (mirrors AsyncCombobox).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const activeOptionId = open && candidates.length > 0 ? optionId(id, active) : undefined;

  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
      data-open={open ? "true" : undefined}
      data-disabled={disabled === true ? "true" : undefined}
      data-invalid={invalid === true ? "true" : undefined}
    >
      <div className={styles.control}>
        {selected.map((key) => {
          const label = labelFor(key);
          return (
            <span key={key} className={styles.chipSlot} onMouseDown={onChipMouseDown}>
              <RemovableChip
                label={label}
                removeAriaLabel={removeLabel(label)}
                disabled={disabled}
                onRemove={() => removeKey(key)}
              />
            </span>
          );
        })}
        <input
          ref={inputRef}
          id={id}
          type="text"
          className={styles.input}
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-invalid={invalid === true ? "true" : undefined}
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          onFocus={() => {
            if (disabled !== true && !open) {
              openWithReset();
            }
          }}
          onKeyDown={onInputKeyDown}
        />
      </div>
      <div className={styles.panel} role="presentation">
        <PanelNote show={loading && candidates.length === 0} label={loadingLabel} />
        <ul
          id={listboxId}
          className={styles.listbox}
          role="listbox"
          aria-multiselectable="true"
          aria-label={listboxLabel}
        >
          {candidates.map((option, index) => (
            <li
              key={option.value}
              id={optionId(id, index)}
              className={styles.option}
              role="option"
              aria-selected="false"
              data-active={index === active ? "true" : undefined}
              onMouseDown={onOptionMouseDown(option)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
        <PanelNote
          show={!loading && candidates.length === 0 && open}
          label={noResultsLabel}
        />
      </div>
    </div>
  );
}

/**
 * A single-line panel note (loading / no-results). Pulled out of the JSX
 * so the conditional stays a guard clause rather than a multi-line
 * ternary; renders nothing when `show` is false.
 */
function PanelNote(props: { show: boolean; label: string }) {
  if (!props.show) {
    return null;
  }
  return (
    <p className={styles.note} aria-live="polite">
      {props.label}
    </p>
  );
}
