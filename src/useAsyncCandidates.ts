/**
 * @file useAsyncCandidates — headless debounce + race-safety core for a
 * type-to-search async candidate list.
 *
 * This is `AsyncCombobox`'s internal race guard (debounced fetch,
 * monotonic request sequence, one AbortController per request, a
 * stale-response drop) lifted out into a reusable hook, so a consumer
 * that needs the same guarantees without the synthetic listbox widget
 * (e.g. a multi-select picker) does not have to reimplement them.
 *
 * Before this file, the guarantees below existed in exactly two
 * independent places: `AsyncCombobox.tsx` (this library) and the
 * dashboard's own `useResourceCandidates` (a deliberate reimplementation,
 * per that file's own header, because the single-select picker delegated
 * to `AsyncCombobox` but the multi-select picker had nothing to delegate
 * to). This hook is the "exactly one place" both call sites now share:
 * `AsyncCombobox` consumes it internally, and the dashboard's multi-select
 * picker is expected to consume it directly instead of re-deriving the
 * same sequence/abort machinery.
 *
 * Contract:
 *  - every `search()` call is debounced (`debounceMs`, default 300ms —
 *    the same window `AsyncCombobox` and the dashboard's other
 *    text-search surfaces use);
 *  - every fetch gets a monotonically increasing sequence id; a
 *    response is painted only if its sequence is still the latest, so a
 *    slow response can never overwrite a fresher one;
 *  - a superseded fetch is aborted at the wire (AbortController per
 *    request);
 *  - `AbortError` is swallowed (expected outcome of cancellation); any
 *    other rejection falls back to an empty result set so the panel
 *    stays usable.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AsyncComboboxOption,
  AsyncComboboxSearchFn,
} from "./AsyncCombobox";

/**
 * Injectable timer seam. The default binds the real `setTimeout` /
 * `clearTimeout`; specs pass a hand-driven fake so the debounce window
 * opens and closes only when the test advances it (the repo's lint
 * forbids `vi.useFakeTimers` for hook specs written against this seam —
 * see `useAsyncCandidates.spec.ts`).
 *
 * Handles are plain numbers so a hand-driven test fake satisfies the
 * same type as the real scheduler with no cast — the platform
 * `setTimeout` return type (`number` in the browser, `Timeout` under
 * `@types/node`) never leaks into the interface.
 */
export type CandidateScheduler = {
  readonly setTimeout: (callback: () => void, ms: number) => number;
  readonly clearTimeout: (handle: number) => void;
};

/** Handle type of the platform `setTimeout`. */
type RealTimerHandle = ReturnType<typeof globalThis.setTimeout>;

/**
 * The production scheduler. It hands out its own monotonic numeric ids
 * and keeps a registry mapping each id to the real platform handle, so
 * the public `CandidateScheduler` stays `number`-typed regardless of
 * whether the ambient `setTimeout` returns `number` or a node `Timeout`.
 */
function createRealScheduler(): CandidateScheduler {
  const live = new Map<number, RealTimerHandle>();
  const counter = { next: 1 };
  return {
    setTimeout: (callback, ms) => {
      const id = counter.next;
      counter.next += 1;
      const handle = globalThis.setTimeout(() => {
        live.delete(id);
        callback();
      }, ms);
      live.set(id, handle);
      return id;
    },
    clearTimeout: (id) => {
      const handle = live.get(id);
      if (handle !== undefined) {
        globalThis.clearTimeout(handle);
        live.delete(id);
      }
    },
  };
}

const realScheduler: CandidateScheduler = createRealScheduler();

export type UseAsyncCandidatesOptions = {
  /**
   * Debounce window in milliseconds applied between a `search()` call
   * and the actual `searchFn` invocation. Defaults to 300ms.
   */
  readonly debounceMs?: number;
  /**
   * Timer seam. Defaults to a scheduler bound to the real platform
   * `setTimeout` / `clearTimeout`.
   */
  readonly scheduler?: CandidateScheduler;
};

export type UseAsyncCandidatesResult = {
  /** Latest painted results (never a stale response). */
  readonly options: readonly AsyncComboboxOption[];
  /** True while the most recent request is in flight. */
  readonly loading: boolean;
  /** Issue a (debounced) search for `query`. */
  readonly search: (query: string) => void;
  /**
   * Cancel any pending debounce timer and abort any in-flight request
   * without issuing a new one. Not part of the two prior
   * implementations' shared minimal surface, but needed so a consumer
   * that closes its panel (a commit or a revert) can drop stale work in
   * flight instead of leaving it to resolve unobserved later — see the
   * "which side did you keep" note in this hook's extraction report.
   */
  readonly cancel: () => void;
};

/**
 * Drive a debounced, race-safe candidate list off an async fetcher.
 */
export function useAsyncCandidates(
  searchFn: AsyncComboboxSearchFn,
  opts?: UseAsyncCandidatesOptions,
): UseAsyncCandidatesResult {
  const debounceMs = opts?.debounceMs ?? 300;
  const scheduler = opts?.scheduler ?? realScheduler;

  const [options, setOptions] = useState<readonly AsyncComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Monotonic request counter so a late response from an older search
   * cannot overwrite a fresher one. Any time a new fetch begins we ++
   * this counter and the inflight callback compares its captured value
   * before painting.
   */
  const requestSeqRef = useRef(0);
  /** Active AbortController for the in-flight fetch (if any). */
  const abortRef = useRef<AbortController | null>(null);
  /** Pending debounce timer handle (scheduler-typed, not a raw platform handle). */
  const timerRef = useRef<number | null>(null);

  const cancel = useCallback(() => {
    if (abortRef.current !== null) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (timerRef.current !== null) {
      scheduler.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // A caller-initiated cancel (as opposed to `search()` superseding
    // its own prior request) means "there is no longer any pending
    // work" — reflect that in `loading` immediately rather than
    // leaving a stale spinner for a request that will never resolve.
    setLoading(false);
  }, [scheduler]);

  const search = useCallback(
    (nextQuery: string) => {
      cancel();
      setLoading(true);
      const seq = ++requestSeqRef.current;
      const controller = new AbortController();
      abortRef.current = controller;
      timerRef.current = scheduler.setTimeout(() => {
        timerRef.current = null;
        searchFn(nextQuery, controller.signal)
          .then((items) => {
            // Drop the response if a newer search has been started.
            if (seq !== requestSeqRef.current) {
              return;
            }
            setOptions(items);
            setLoading(false);
          })
          .catch((err: unknown) => {
            if (seq !== requestSeqRef.current) {
              return;
            }
            // AbortError is the expected outcome of cancellation —
            // don't surface it to the consumer. Anything else falls
            // back to "no results" so the panel remains usable.
            if (err instanceof DOMException && err.name === "AbortError") {
              return;
            }
            setOptions([]);
            setLoading(false);
          });
      }, debounceMs);
    },
    [cancel, debounceMs, searchFn, scheduler],
  );

  // Cleanup: cancel any pending work on unmount.
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return { options, loading, search, cancel };
}
