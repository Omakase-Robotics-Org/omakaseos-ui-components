import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAsyncCandidates } from "./useAsyncCandidates";
import type { CandidateScheduler } from "./useAsyncCandidates";
import type { AsyncComboboxOption } from "./AsyncCombobox";

const SAMPLE_A: readonly AsyncComboboxOption[] = [
  { value: "tag-aurora", label: "Aurora" },
];
const SAMPLE_B: readonly AsyncComboboxOption[] = [
  { value: "tag-beacon", label: "Beacon" },
];

/**
 * Hand-driven fake `CandidateScheduler`. The repo's lint forbids
 * `vi.useFakeTimers` (see `useAsyncCandidates.ts`'s file header), so
 * this spec drives the debounce window itself via `flushAll` rather
 * than advancing real or mocked wall-clock time — timers only ever
 * fire when the test says so.
 */
function createFakeScheduler(): CandidateScheduler & {
  /** Fire every still-pending timer, in scheduling order. */
  flushAll: () => void;
  /** Count of timers scheduled but not yet fired or cleared. */
  pendingCount: () => number;
} {
  const pending = new Map<number, () => void>();
  let nextHandle = 1;
  return {
    setTimeout: (callback) => {
      const handle = nextHandle;
      nextHandle += 1;
      pending.set(handle, callback);
      return handle;
    },
    clearTimeout: (handle) => {
      pending.delete(handle);
    },
    flushAll: () => {
      const callbacks = Array.from(pending.values());
      pending.clear();
      for (const callback of callbacks) {
        callback();
      }
    },
    pendingCount: () => pending.size,
  };
}

/** Let already-scheduled promise microtasks (and their React commits) settle. */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("useAsyncCandidates", () => {
  it("debounces: two searches inside the window collapse into a single request", async () => {
    const scheduler = createFakeScheduler();
    const searchFn = vi.fn(async () => SAMPLE_B);
    const { result } = renderHook(() =>
      useAsyncCandidates(searchFn, { scheduler }),
    );

    act(() => {
      result.current.search("a");
    });
    act(() => {
      result.current.search("ab");
    });
    // Neither the first search's timer fired (superseded + cleared by
    // the second `search()` call's internal cancel) — the fetch has
    // not been issued yet.
    expect(searchFn).not.toHaveBeenCalled();
    expect(scheduler.pendingCount()).toBe(1);

    await act(async () => {
      scheduler.flushAll();
      await flush();
    });

    expect(searchFn).toHaveBeenCalledTimes(1);
    expect(searchFn).toHaveBeenCalledWith("ab", expect.any(AbortSignal));
    expect(result.current.options).toEqual(SAMPLE_B);
  });

  it("an older response resolving after a newer one does not overwrite it", async () => {
    const scheduler = createFakeScheduler();
    const resolvers: Record<string, (items: readonly AsyncComboboxOption[]) => void> = {};
    const searchFn = vi.fn(
      (query: string) =>
        new Promise<readonly AsyncComboboxOption[]>((resolve) => {
          resolvers[query] = resolve;
        }),
    );
    const { result } = renderHook(() =>
      useAsyncCandidates(searchFn, { scheduler }),
    );

    // Two genuinely concurrent in-flight requests: each one's debounce
    // timer must fire (fetch issued) BEFORE the next search starts, so
    // both promises are outstanding simultaneously.
    act(() => {
      result.current.search("older");
    });
    act(() => {
      scheduler.flushAll();
    });
    act(() => {
      result.current.search("newer");
    });
    act(() => {
      scheduler.flushAll();
    });
    expect(searchFn).toHaveBeenCalledTimes(2);

    // Resolve the NEWER request first.
    await act(async () => {
      resolvers.newer!(SAMPLE_B);
      await flush();
    });
    expect(result.current.options).toEqual(SAMPLE_B);

    // The OLDER request resolves after — its sequence is stale, so it
    // must be dropped rather than overwriting the newer result.
    await act(async () => {
      resolvers.older!(SAMPLE_A);
      await flush();
    });
    expect(result.current.options).toEqual(SAMPLE_B);
  });

  it("aborts the in-flight request's AbortSignal when a newer search supersedes it", () => {
    const scheduler = createFakeScheduler();
    const signals: AbortSignal[] = [];
    const searchFn = vi.fn((_query: string, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<readonly AsyncComboboxOption[]>(() => {
        // Never resolves — this test only cares about the signal.
      });
    });
    const { result } = renderHook(() =>
      useAsyncCandidates(searchFn, { scheduler }),
    );

    act(() => {
      result.current.search("a");
    });
    act(() => {
      scheduler.flushAll();
    });
    expect(signals).toHaveLength(1);
    expect(signals[0]!.aborted).toBe(false);

    act(() => {
      result.current.search("b");
    });
    expect(signals[0]!.aborted).toBe(true);
  });

  it("swallows AbortError from a directly-canceled request, leaving prior options intact", async () => {
    const scheduler = createFakeScheduler();
    let rejectSecond: ((err: unknown) => void) | null = null;
    const searchFn = vi.fn((query: string, signal: AbortSignal) => {
      if (query === "first") {
        return Promise.resolve(SAMPLE_A);
      }
      return new Promise<readonly AsyncComboboxOption[]>((_resolve, reject) => {
        rejectSecond = reject;
        signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    const { result } = renderHook(() =>
      useAsyncCandidates(searchFn, { scheduler }),
    );

    act(() => {
      result.current.search("first");
    });
    await act(async () => {
      scheduler.flushAll();
      await flush();
    });
    expect(result.current.options).toEqual(SAMPLE_A);

    act(() => {
      result.current.search("second");
    });
    act(() => {
      scheduler.flushAll();
    });
    // Cancel directly (NOT via a new `search()` call), so the request
    // sequence is untouched and the eventual AbortError rejection is
    // checked against a still-current sequence — exercising the
    // AbortError branch itself, not the "stale sequence" early return.
    act(() => {
      result.current.cancel();
    });
    expect(result.current.loading).toBe(false);
    expect(rejectSecond).not.toBeNull();

    await act(async () => {
      await flush();
    });
    // The generic-error fallback (which would reset options to []) must
    // not have run — AbortError is swallowed, so the prior options survive.
    expect(result.current.options).toEqual(SAMPLE_A);
  });

  it("unmount clears a pending debounce timer that never fired", () => {
    const scheduler = createFakeScheduler();
    const searchFn = vi.fn(async () => SAMPLE_A);
    const { result, unmount } = renderHook(() =>
      useAsyncCandidates(searchFn, { scheduler }),
    );

    act(() => {
      result.current.search("a");
    });
    expect(scheduler.pendingCount()).toBe(1);
    unmount();
    expect(scheduler.pendingCount()).toBe(0);
    // The timer callback never ran, so the fetch was never issued.
    expect(searchFn).not.toHaveBeenCalled();
  });

  it("unmount aborts an in-flight request's AbortSignal", () => {
    const scheduler = createFakeScheduler();
    let capturedSignal: AbortSignal | undefined;
    const searchFn = vi.fn((_query: string, signal: AbortSignal) => {
      capturedSignal = signal;
      return new Promise<readonly AsyncComboboxOption[]>(() => {});
    });
    const { result, unmount } = renderHook(() =>
      useAsyncCandidates(searchFn, { scheduler }),
    );

    act(() => {
      result.current.search("a");
    });
    act(() => {
      scheduler.flushAll();
    });
    expect(capturedSignal?.aborted).toBe(false);
    unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });

  it("loading is true immediately on search(), stays true through the in-flight fetch, and clears on resolve", async () => {
    const scheduler = createFakeScheduler();
    let resolveFn: ((items: readonly AsyncComboboxOption[]) => void) | null = null;
    const searchFn = vi.fn(
      () =>
        new Promise<readonly AsyncComboboxOption[]>((resolve) => {
          resolveFn = resolve;
        }),
    );
    const { result } = renderHook(() =>
      useAsyncCandidates(searchFn, { scheduler }),
    );

    expect(result.current.loading).toBe(false);
    act(() => {
      result.current.search("a");
    });
    expect(result.current.loading).toBe(true);
    act(() => {
      scheduler.flushAll();
    });
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveFn!(SAMPLE_A);
      await flush();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.options).toEqual(SAMPLE_A);
  });
});
