/**
 * @file The chrome layer's keyboard accelerators.
 *
 * These keys are the native twin controls' shortcuts, so the cases below are
 * about WHICH command a key reaches and when it must not reach any: the Escape
 * ladder peeling exactly one layer, and the guard that keeps Delete from
 * eating waypoints while the operator is typing a name.
 *
 * The canvas is not involved at all - that separation is what keeps the map
 * surface from becoming a focusable widget, and it is pinned statically in
 * `spec/direct-manipulation-boundary.spec.ts`.
 */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi, type Mock } from "vitest";
import { isTextEntry, useEditCommandKeys, type EditCommandKeysOptions } from "./index";

type Command = Mock<() => void>;

type Commands = {
  readonly onFinishRun: Command;
  readonly onCancelRun: Command;
  readonly onDisarm: Command;
  readonly onDeselectAll: Command;
  readonly onDeleteSelection: Command;
};

function commands(): Commands {
  return {
    onFinishRun: vi.fn<() => void>(),
    onCancelRun: vi.fn<() => void>(),
    onDisarm: vi.fn<() => void>(),
    onDeselectAll: vi.fn<() => void>(),
    onDeleteSelection: vi.fn<() => void>(),
  };
}

function mount(options: Partial<EditCommandKeysOptions> & Commands) {
  function Chrome() {
    useEditCommandKeys({
      enabled: true,
      armed: false,
      runLength: 0,
      hasSelection: false,
      ...options,
    });
    return (
      <div>
        <input data-testid="name" defaultValue="dock" />
        <textarea data-testid="notes" defaultValue="" />
        <div data-testid="rich" contentEditable />
      </div>
    );
  }
  return render(<Chrome />);
}

/** Which commands fired, by name, so an assertion reads as one statement. */
function fired(all: Commands): readonly string[] {
  return Object.entries(all)
    .filter(([, command]) => command.mock.calls.length > 0)
    .map(([name]) => name)
    .sort();
}

describe("useEditCommandKeys", () => {
  it("ends a run on Enter, and does nothing when there is no run to end", () => {
    const withRun = commands();
    mount({ ...withRun, armed: true, runLength: 3 });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(fired(withRun)).toEqual(["onFinishRun"]);

    const withoutRun = commands();
    mount({ ...withoutRun, armed: true, runLength: 0 });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(fired(withoutRun)).toEqual([]);
  });

  it("peels exactly ONE layer per Escape: run, then mode, then selection", () => {
    // An operator abandoning a run does not also expect to lose their
    // selection, so each press stops after one rung. Each rung is mounted and
    // unmounted on its own: two live listeners would have the first one's
    // preventDefault suppress the second, which is the yield below.
    const rungs = [
      { state: { armed: true, runLength: 2, hasSelection: true }, expected: ["onCancelRun"] },
      { state: { armed: true, runLength: 0, hasSelection: true }, expected: ["onDisarm"] },
      { state: { armed: false, runLength: 0, hasSelection: true }, expected: ["onDeselectAll"] },
    ] as const;
    for (const rung of rungs) {
      const all = commands();
      const { unmount } = mount({ ...all, ...rung.state });
      fireEvent.keyDown(window, { key: "Escape" });
      expect(fired(all), JSON.stringify(rung.state)).toEqual(rung.expected);
      unmount();
    }

    const idle = commands();
    mount({ ...idle, armed: false, runLength: 0, hasSelection: false });
    const escape = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    window.dispatchEvent(escape);
    expect(fired(idle)).toEqual([]);
    // Nothing to do means the key stays the browser's.
    expect(escape.defaultPrevented).toBe(false);
  });

  it("removes the selection on Delete and on Backspace, and only when there is one", () => {
    for (const key of ["Delete", "Backspace"] as const) {
      const withSelection = commands();
      const selected = mount({ ...withSelection, hasSelection: true });
      fireEvent.keyDown(window, { key });
      expect(fired(withSelection), key).toEqual(["onDeleteSelection"]);
      selected.unmount();

      const without = commands();
      const empty = mount({ ...without, hasSelection: false });
      fireEvent.keyDown(window, { key });
      expect(fired(without), `${key} with no selection`).toEqual([]);
      empty.unmount();
    }
  });

  it("never fires while the operator is typing", () => {
    // Delete inside a text field means "erase a character". Reaching the map's
    // delete from there would remove waypoints the operator cannot see.
    const all = commands();
    const { getByTestId } = mount({ ...all, armed: true, runLength: 2, hasSelection: true });
    for (const testId of ["name", "notes", "rich"]) {
      for (const key of ["Delete", "Backspace", "Escape", "Enter"]) {
        fireEvent.keyDown(getByTestId(testId), { key, bubbles: true });
      }
    }
    expect(fired(all)).toEqual([]);
  });

  it("does nothing at all while the chrome declares the session closed", () => {
    const all = commands();
    mount({ ...all, enabled: false, armed: true, runLength: 2, hasSelection: true });
    for (const key of ["Enter", "Escape", "Delete", "Backspace"]) {
      fireEvent.keyDown(window, { key });
    }
    expect(fired(all)).toEqual([]);
  });

  it("yields to a handler that already claimed the key", () => {
    const all = commands();
    mount({ ...all, hasSelection: true });
    const claimed = new KeyboardEvent("keydown", { key: "Delete", cancelable: true });
    claimed.preventDefault();
    window.dispatchEvent(claimed);
    expect(fired(all)).toEqual([]);
  });

  it("recognises text entry by tag and by contentEditable, and nothing else", () => {
    const { getByTestId } = mount({ ...commands() });
    expect(isTextEntry(getByTestId("name"))).toBe(true);
    expect(isTextEntry(getByTestId("notes"))).toBe(true);
    expect(isTextEntry(getByTestId("rich"))).toBe(true);
    expect(isTextEntry(document.createElement("select"))).toBe(true);
    expect(isTextEntry(document.createElement("button"))).toBe(false);
    expect(isTextEntry(document.createElement("svg"))).toBe(false);
    expect(isTextEntry(null)).toBe(false);
  });
});
