import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AsyncCombobox } from "./AsyncCombobox";
import type { AsyncComboboxOption } from "./AsyncCombobox";

const SAMPLE: readonly AsyncComboboxOption[] = [
  { value: "tag-aurora", label: "Aurora" },
  { value: "tag-beacon", label: "Beacon" },
  { value: "tag-night", label: "Night Shift" },
];

function renderCombobox(
  override: Partial<React.ComponentProps<typeof AsyncCombobox>> = {},
) {
  const onChange = vi.fn();
  const searchFn = vi.fn(async () => SAMPLE);
  const result = render(
    <AsyncCombobox
      value=""
      selectedLabel=""
      onChange={onChange}
      searchFn={searchFn}
      placeholder="Search…"
      anyOptionLabel="Any tag"
      loadingLabel="Searching…"
      noResultsLabel="No matches"
      {...override}
    />,
  );
  return { ...result, onChange, searchFn };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AsyncCombobox", () => {
  it("displays selectedLabel verbatim before the user starts editing", () => {
    renderCombobox({ value: "tag-aurora", selectedLabel: "Aurora" });
    expect(screen.getByRole("combobox")).toHaveValue("Aurora");
  });

  it("opens the listbox on focus and runs an initial empty search", async () => {
    const { searchFn } = renderCombobox();
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    expect(input.getAttribute("aria-expanded")).toBe("true");
    // Debounce window expires.
    await vi.advanceTimersByTimeAsync(300);
    expect(searchFn).toHaveBeenCalledTimes(1);
    expect(searchFn).toHaveBeenLastCalledWith("", expect.any(AbortSignal));
  });

  it("debounces searchFn at 300ms — three rapid keystrokes collapse to a single fetch", async () => {
    const { searchFn } = renderCombobox();
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    // The focus alone enqueues an empty search; advance partway, change
    // the input twice, then advance to fire only the final value.
    await vi.advanceTimersByTimeAsync(100);
    fireEvent.change(input, { target: { value: "a" } });
    await vi.advanceTimersByTimeAsync(100);
    fireEvent.change(input, { target: { value: "au" } });
    await vi.advanceTimersByTimeAsync(100);
    fireEvent.change(input, { target: { value: "aur" } });
    // Nothing has fired yet — every change reset the timer.
    expect(searchFn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(searchFn).toHaveBeenCalledTimes(1);
    expect(searchFn).toHaveBeenLastCalledWith("aur", expect.any(AbortSignal));
  });

  it("aborts the in-flight signal when a newer query arrives", async () => {
    let firstSignal: AbortSignal | undefined;
    let secondSignal: AbortSignal | undefined;
    const searchFn = vi.fn(async (q: string, signal: AbortSignal) => {
      if (q === "a") {
        firstSignal = signal;
      } else if (q === "ab") {
        secondSignal = signal;
      }
      return SAMPLE;
    });
    render(
      <AsyncCombobox
        value=""
        selectedLabel=""
        onChange={vi.fn()}
        searchFn={searchFn}
        anyOptionLabel="Any tag"
        loadingLabel="Searching…"
        noResultsLabel="No matches"
      />,
    );
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "a" } });
    await vi.advanceTimersByTimeAsync(300);
    expect(firstSignal?.aborted).toBe(false);
    fireEvent.change(input, { target: { value: "ab" } });
    // The new search starts a fresh debounce timer; the prior signal
    // is aborted as soon as the next request is initiated.
    expect(firstSignal?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(300);
    expect(secondSignal?.aborted).toBe(false);
  });

  it("paints search results inside role=listbox with role=option per row", async () => {
    renderCombobox();
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    await vi.advanceTimersByTimeAsync(300);
    // Drain the microtask queue so the resolved searchFn promise +
    // the React state-set scheduled inside its `.then()` flush.
    await vi.runAllTimersAsync();
    // Three results + one synthetic "any" sentinel = 4 options.
    expect(screen.getAllByRole("option")).toHaveLength(4);
    expect(screen.getAllByRole("option").map((el) => el.textContent)).toEqual([
      "Any tag",
      "Aurora",
      "Beacon",
      "Night Shift",
    ]);
  });

  it("ArrowDown moves the active descendant; Enter commits it", async () => {
    const { onChange } = renderCombobox();
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    await vi.advanceTimersByTimeAsync(300);
    await vi.runAllTimersAsync();
    expect(screen.getAllByRole("option")).toHaveLength(4);
    // activeIndex starts at 0 ("Any tag").
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    // activeIndex is now 2 = Beacon.
    expect(input.getAttribute("aria-activedescendant")).toMatch(/option-2$/);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      value: "tag-beacon",
      label: "Beacon",
    });
  });

  it("Escape reverts the input to the previously selected label without firing onChange", async () => {
    const { onChange } = renderCombobox({
      value: "tag-aurora",
      selectedLabel: "Aurora",
    });
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Beac" } });
    expect(input).toHaveValue("Beac");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("Aurora");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clicking an option commits the value+label pair", async () => {
    const { onChange } = renderCombobox();
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    await vi.advanceTimersByTimeAsync(300);
    await vi.runAllTimersAsync();
    const beacon = screen.getByText("Beacon");
    fireEvent.mouseDown(beacon);
    expect(onChange).toHaveBeenCalledWith({
      value: "tag-beacon",
      label: "Beacon",
    });
  });

  it("picking the synthetic 'any' row emits an empty value (clear)", async () => {
    const { onChange } = renderCombobox({
      value: "tag-aurora",
      selectedLabel: "Aurora",
    });
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    await vi.advanceTimersByTimeAsync(300);
    await vi.runAllTimersAsync();
    const anyRow = screen.getByText("Any tag");
    fireEvent.mouseDown(anyRow);
    expect(onChange).toHaveBeenCalledWith({ value: "", label: "" });
  });

  it("renders the loading label while a fetch is in-flight (and clears it on resolve)", async () => {
    let resolveFn: ((items: readonly AsyncComboboxOption[]) => void) | null = null;
    const slowSearch = vi.fn(
      () =>
        new Promise<readonly AsyncComboboxOption[]>((resolve) => {
          resolveFn = resolve;
        }),
    );
    render(
      <AsyncCombobox
        value=""
        selectedLabel=""
        onChange={vi.fn()}
        searchFn={slowSearch}
        anyOptionLabel="Any tag"
        loadingLabel="Searching…"
        noResultsLabel="No matches"
      />,
    );
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    await vi.advanceTimersByTimeAsync(300);
    expect(screen.getByText("Searching…")).toBeInTheDocument();
    resolveFn!(SAMPLE);
    // Drain the resolved promise's `.then(...)` and any React commit
    // it schedules. `runAllTimersAsync` flushes the microtask queue
    // and the React act() boundary; we call it twice because the
    // first pass enqueues the state-set, the second runs the
    // resulting commit.
    await vi.runAllTimersAsync();
    await vi.runAllTimersAsync();
    expect(screen.queryByText("Searching…")).toBeNull();
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });

  it("renders noResultsLabel when the searchFn returns an empty array", async () => {
    const empty = vi.fn(async () => [] as readonly AsyncComboboxOption[]);
    render(
      <AsyncCombobox
        value=""
        selectedLabel=""
        onChange={vi.fn()}
        searchFn={empty}
        anyOptionLabel="Any tag"
        loadingLabel="Searching…"
        noResultsLabel="No matches"
      />,
    );
    fireEvent.focus(screen.getByRole("combobox"));
    await vi.advanceTimersByTimeAsync(300);
    await vi.runAllTimersAsync();
    expect(screen.getByText("No matches")).toBeInTheDocument();
    // The synthetic "any" row is still rendered above "No matches".
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("invalid prop flips data-invalid and aria-invalid", () => {
    const { container } = renderCombobox({ invalid: true });
    expect(container.querySelector('[data-invalid="true"]')).not.toBeNull();
    const input = screen.getByRole("combobox");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("comboboxSize propagates as data-size", () => {
    const { container } = renderCombobox({ comboboxSize: "lg" });
    expect(container.querySelector('[data-size="lg"]')).not.toBeNull();
  });

  it("sets aria-selected on the row matching the current value", async () => {
    renderCombobox({ value: "tag-beacon", selectedLabel: "Beacon" });
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    await vi.advanceTimersByTimeAsync(300);
    await vi.runAllTimersAsync();
    expect(screen.getAllByRole("option")).toHaveLength(4);
    const selected = screen
      .getAllByRole("option")
      .filter((el) => el.getAttribute("aria-selected") === "true");
    expect(selected.map((el) => el.textContent)).toEqual(["Beacon"]);
  });
});
