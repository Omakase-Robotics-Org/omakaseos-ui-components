import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AsyncMultiCombobox } from "./AsyncMultiCombobox";
import type { AsyncComboboxOption } from "./AsyncCombobox";

const SAMPLE: readonly AsyncComboboxOption[] = [
  { value: "tag-aurora", label: "Aurora" },
  { value: "tag-beacon", label: "Beacon" },
  { value: "tag-night", label: "Night Shift" },
];

function renderMultiCombobox(
  override: Partial<React.ComponentProps<typeof AsyncMultiCombobox>> = {},
) {
  const onChange = vi.fn();
  const searchFn = vi.fn(async () => SAMPLE);
  const result = render(
    <AsyncMultiCombobox
      id="tags"
      selected={[]}
      onChange={onChange}
      searchFn={searchFn}
      placeholder="Search…"
      loadingLabel="Searching…"
      noResultsLabel="No matches"
      listboxLabel="Tags"
      removeLabel={(label) => `Remove ${label}`}
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

describe("AsyncMultiCombobox", () => {
  it("opens the panel on focus and runs an initial empty search", async () => {
    const { searchFn } = renderMultiCombobox();
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    expect(input.getAttribute("aria-expanded")).toBe("true");
    await vi.advanceTimersByTimeAsync(300);
    expect(searchFn).toHaveBeenCalledTimes(1);
    expect(searchFn).toHaveBeenLastCalledWith("", expect.any(AbortSignal));
  });

  it("aria-controls stays resolvable while the panel is closed", () => {
    renderMultiCombobox();
    const input = screen.getByRole("combobox");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    const listboxId = input.getAttribute("aria-controls");
    expect(listboxId).toBeTruthy();
    // The listbox element exists in the DOM even though the panel is
    // display:none while closed — aria-controls must resolve to a real
    // element, not a dangling id.
    expect(document.getElementById(listboxId!)).not.toBeNull();
    expect(document.getElementById(listboxId!)!.getAttribute("role")).toBe("listbox");
  });

  it("already-selected candidates are excluded from the panel", async () => {
    renderMultiCombobox({ selected: ["tag-beacon"] });
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    await vi.advanceTimersByTimeAsync(300);
    await vi.runAllTimersAsync();
    const rows = screen.getAllByRole("option").map((el) => el.textContent);
    expect(rows).toEqual(["Aurora", "Night Shift"]);
  });

  it("Enter adds the active candidate AND keeps the panel open", async () => {
    const { onChange } = renderMultiCombobox();
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    await vi.advanceTimersByTimeAsync(300);
    await vi.runAllTimersAsync();
    expect(screen.getAllByRole("option")).toHaveLength(3);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    // activeIndex now 1 = Beacon.
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["tag-beacon"]);
    expect(input.getAttribute("aria-expanded")).toBe("true");
  });

  it("clicking an option keeps focus on the input (mousedown preventDefault)", async () => {
    const { onChange } = renderMultiCombobox();
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    await vi.advanceTimersByTimeAsync(300);
    await vi.runAllTimersAsync();
    const beacon = screen.getByText("Beacon");
    fireEvent.mouseDown(beacon);
    expect(onChange).toHaveBeenCalledWith(["tag-beacon"]);
  });

  it("Backspace on an empty query removes the last selected chip", () => {
    const { onChange } = renderMultiCombobox({
      selected: ["tag-aurora", "tag-beacon"],
    });
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    expect(input).toHaveValue("");
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(onChange).toHaveBeenCalledWith(["tag-aurora"]);
  });

  it("Backspace does nothing while the query is non-empty", () => {
    const { onChange } = renderMultiCombobox({ selected: ["tag-aurora"] });
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "be" } });
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("a freshly-picked chip renders its label immediately (seen-label memory)", async () => {
    function Harness() {
      const [selected, setSelected] = useState<string[]>([]);
      return (
        <AsyncMultiCombobox
          id="tags"
          selected={selected}
          onChange={setSelected}
          searchFn={async () => SAMPLE}
          loadingLabel="Searching…"
          noResultsLabel="No matches"
          listboxLabel="Tags"
          removeLabel={(label) => `Remove ${label}`}
        />
      );
    }
    render(<Harness />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    await vi.advanceTimersByTimeAsync(300);
    await vi.runAllTimersAsync();
    const beacon = screen.getByText("Beacon");
    fireEvent.mouseDown(beacon);
    // No resolveLabel was supplied at all — the chip's label can only
    // have come from the widget's own seen-label memory, painted in the
    // SAME commit as the add (no async round trip).
    expect(screen.getByRole("listitem", { name: "Remove Beacon" })).toHaveTextContent("Beacon");
  });

  it("resolveLabel fallback order is seen -> resolveLabel -> raw key", () => {
    // "tag-aurora" was never seen by this widget (no search has run), so
    // resolveLabel is consulted; "tag-unknown" has neither a seen label
    // nor a resolveLabel entry, so it falls back to the raw key.
    const resolveLabel = (key: string): string | undefined =>
      key === "tag-aurora" ? "Aurora (catalog)" : undefined;
    renderMultiCombobox({
      selected: ["tag-aurora", "tag-unknown"],
      resolveLabel,
    });
    expect(screen.getByRole("listitem", { name: "Remove Aurora (catalog)" })).toHaveTextContent(
      "Aurora (catalog)",
    );
    expect(screen.getByRole("listitem", { name: "Remove tag-unknown" })).toHaveTextContent(
      "tag-unknown",
    );
  });

  it("a seen label takes priority over a conflicting resolveLabel for the same key", async () => {
    function Harness() {
      const [selected, setSelected] = useState<string[]>([]);
      return (
        <AsyncMultiCombobox
          id="tags"
          selected={selected}
          onChange={setSelected}
          searchFn={async () => SAMPLE}
          // Deliberately conflicting label for the same key: if the
          // fallback order were wrong (resolveLabel before seen), this
          // stale catalog value would win instead of the freshly-seen
          // search result's label.
          resolveLabel={(key) => (key === "tag-beacon" ? "Stale catalog label" : undefined)}
          loadingLabel="Searching…"
          noResultsLabel="No matches"
          listboxLabel="Tags"
          removeLabel={(label) => `Remove ${label}`}
        />
      );
    }
    render(<Harness />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    await vi.advanceTimersByTimeAsync(300);
    await vi.runAllTimersAsync();
    fireEvent.mouseDown(screen.getByText("Beacon"));
    expect(
      screen.getByRole("listitem", { name: "Remove Beacon" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Stale catalog label")).toBeNull();
  });

  it("disabled propagates to the input and to every chip", () => {
    renderMultiCombobox({ selected: ["tag-aurora"], disabled: true });
    const input = screen.getByRole("combobox");
    expect(input).toBeDisabled();
    const chip = screen.getByRole("listitem", { name: "Remove tag-aurora" });
    expect(chip).toHaveAttribute("aria-disabled", "true");
    expect(chip).not.toHaveAttribute("disabled");
  });

  it("renders the loading label while a fetch is in-flight", async () => {
    let resolveFn: ((items: readonly AsyncComboboxOption[]) => void) | null = null;
    const slowSearch = vi.fn(
      () =>
        new Promise<readonly AsyncComboboxOption[]>((resolve) => {
          resolveFn = resolve;
        }),
    );
    renderMultiCombobox({ searchFn: slowSearch });
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    await vi.advanceTimersByTimeAsync(300);
    expect(screen.getByText("Searching…")).toBeInTheDocument();
    resolveFn!(SAMPLE);
    await vi.runAllTimersAsync();
    await vi.runAllTimersAsync();
    expect(screen.queryByText("Searching…")).toBeNull();
  });

  it("renders noResultsLabel once every candidate is excluded", async () => {
    renderMultiCombobox({
      selected: SAMPLE.map((option) => option.value),
    });
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    await vi.advanceTimersByTimeAsync(300);
    await vi.runAllTimersAsync();
    expect(screen.getByText("No matches")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("Escape closes the panel without touching the selection", async () => {
    const { onChange } = renderMultiCombobox({ selected: ["tag-aurora"] });
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    expect(input.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(onChange).not.toHaveBeenCalled();
  });
});
