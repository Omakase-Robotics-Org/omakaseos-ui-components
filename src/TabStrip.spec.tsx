import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TabStrip } from "./TabStrip";
import type { TabStripEditing, TabStripItem } from "./TabStrip";

type Id = "alpha" | "bravo" | "charlie";

const ITEMS: readonly TabStripItem<Id>[] = [
  { id: "alpha", label: "Alpha" },
  { id: "bravo", label: "Bravo" },
  { id: "charlie", label: "Charlie" },
];

describe("TabStrip", () => {
  it("renders a tablist with one tab per item, named by idPrefix", () => {
    render(<TabStrip items={ITEMS} value="alpha" onChange={() => {}} idPrefix="demo" />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    for (const item of ITEMS) {
      const tab = screen.getByRole("tab", { name: item.label });
      expect(tab).toHaveAttribute("id", `demo-tab-${item.id}`);
    }
  });

  it("names the tablist from ariaLabel when supplied, and leaves it unnamed otherwise", () => {
    const { rerender } = render(
      <TabStrip items={ITEMS} value="alpha" onChange={() => {}} idPrefix="demo" ariaLabel="Views" />,
    );
    expect(screen.getByRole("tablist", { name: "Views" })).toBeInTheDocument();

    rerender(<TabStrip items={ITEMS} value="alpha" onChange={() => {}} idPrefix="demo" />);
    expect(screen.getByRole("tablist")).not.toHaveAttribute("aria-label");
  });

  it("marks exactly the active tab aria-selected, and gives it the only tabIndex=0 (roving tabindex)", () => {
    render(<TabStrip items={ITEMS} value="bravo" onChange={() => {}} idPrefix="demo" />);
    const alpha = screen.getByRole("tab", { name: "Alpha" });
    const bravo = screen.getByRole("tab", { name: "Bravo" });
    const charlie = screen.getByRole("tab", { name: "Charlie" });

    expect(bravo).toHaveAttribute("aria-selected", "true");
    expect(alpha).toHaveAttribute("aria-selected", "false");
    expect(charlie).toHaveAttribute("aria-selected", "false");

    expect(bravo).toHaveAttribute("tabIndex", "0");
    expect(alpha).toHaveAttribute("tabIndex", "-1");
    expect(charlie).toHaveAttribute("tabIndex", "-1");
  });

  it("wires aria-controls from getPanelId only when supplied", () => {
    const { rerender } = render(
      <TabStrip
        items={ITEMS}
        value="alpha"
        onChange={() => {}}
        idPrefix="demo"
        getPanelId={(id) => `demo-panel-${id}`}
      />,
    );
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute(
      "aria-controls",
      "demo-panel-alpha",
    );

    rerender(<TabStrip items={ITEMS} value="alpha" onChange={() => {}} idPrefix="demo" />);
    expect(screen.getByRole("tab", { name: "Alpha" })).not.toHaveAttribute("aria-controls");
  });

  it("clicking a tab calls onChange with its id", () => {
    const onChange = vi.fn();
    render(<TabStrip items={ITEMS} value="alpha" onChange={onChange} idPrefix="demo" />);
    fireEvent.click(screen.getByRole("tab", { name: "Charlie" }));
    expect(onChange).toHaveBeenCalledWith("charlie");
  });

  describe("keyboard traversal (Arrow/Home/End) on the tablist", () => {
    it("ArrowRight moves to the next tab, wrapping past the last", () => {
      const onChange = vi.fn();
      render(<TabStrip items={ITEMS} value="charlie" onChange={onChange} idPrefix="demo" />);
      fireEvent.keyDown(screen.getByRole("tab", { name: "Charlie" }), { key: "ArrowRight" });
      expect(onChange).toHaveBeenCalledWith("alpha");
    });

    it("ArrowLeft moves to the previous tab, wrapping past the first", () => {
      const onChange = vi.fn();
      render(<TabStrip items={ITEMS} value="alpha" onChange={onChange} idPrefix="demo" />);
      fireEvent.keyDown(screen.getByRole("tab", { name: "Alpha" }), { key: "ArrowLeft" });
      expect(onChange).toHaveBeenCalledWith("charlie");
    });

    it("Home jumps to the first tab, End to the last", () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <TabStrip items={ITEMS} value="bravo" onChange={onChange} idPrefix="demo" />,
      );
      fireEvent.keyDown(screen.getByRole("tab", { name: "Bravo" }), { key: "Home" });
      expect(onChange).toHaveBeenLastCalledWith("alpha");

      rerender(<TabStrip items={ITEMS} value="bravo" onChange={onChange} idPrefix="demo" />);
      fireEvent.keyDown(screen.getByRole("tab", { name: "Bravo" }), { key: "End" });
      expect(onChange).toHaveBeenLastCalledWith("charlie");
    });

    it("ignores keys that do not map to a traversal (no onChange call)", () => {
      const onChange = vi.fn();
      render(<TabStrip items={ITEMS} value="alpha" onChange={onChange} idPrefix="demo" />);
      fireEvent.keyDown(screen.getByRole("tab", { name: "Alpha" }), { key: "Tab" });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it("data-active is carried by both the tab and its slot (the underline lives on the slot)", () => {
    render(<TabStrip items={ITEMS} value="bravo" onChange={() => {}} idPrefix="demo" />);
    const bravo = screen.getByRole("tab", { name: "Bravo" });
    expect(bravo).toHaveAttribute("data-active", "true");
    const slot = bravo.parentElement;
    expect(slot).toHaveAttribute("data-active", "true");
  });

  it("renders trailing content inside the tablist but not as a tab", () => {
    render(
      <TabStrip
        items={ITEMS}
        value="alpha"
        onChange={() => {}}
        idPrefix="demo"
        trailing={<button type="button">Add view</button>}
      />,
    );
    const tablist = screen.getByRole("tablist");
    const trailingButton = screen.getByRole("button", { name: "Add view" });
    expect(tablist).toContainElement(trailingButton);
    expect(screen.queryAllByRole("tab")).toHaveLength(3);
  });

  it("renders itemAdornment inside the tab's own slot", () => {
    render(
      <TabStrip
        items={ITEMS}
        value="alpha"
        onChange={() => {}}
        idPrefix="demo"
        itemAdornment={(id) => <span data-testid={`adorn-${id}`}>*</span>}
      />,
    );
    const alphaTab = screen.getByRole("tab", { name: "Alpha" });
    const slot = alphaTab.parentElement as HTMLElement;
    expect(slot).toContainElement(screen.getByTestId("adorn-alpha"));
  });

  it("onItemDoubleClick fires with the double-clicked tab's id", () => {
    const onItemDoubleClick = vi.fn();
    render(
      <TabStrip
        items={ITEMS}
        value="alpha"
        onChange={() => {}}
        idPrefix="demo"
        onItemDoubleClick={onItemDoubleClick}
      />,
    );
    fireEvent.doubleClick(screen.getByRole("tab", { name: "Bravo" }));
    expect(onItemDoubleClick).toHaveBeenCalledWith("bravo");
  });

  describe("in-place rename editor", () => {
    function editing(overrides: Partial<TabStripEditing<Id>> = {}): TabStripEditing<Id> {
      return {
        id: "bravo",
        defaultValue: "Bravo",
        placeholder: "Untitled",
        ariaLabel: "Rename tab",
        onCommit: vi.fn(),
        onCancel: vi.fn(),
        ...overrides,
      };
    }

    it("hides the tab button and shows an input in its place, only for the tab being edited", () => {
      render(
        <TabStrip items={ITEMS} value="bravo" onChange={() => {}} idPrefix="demo" editing={editing()} />,
      );
      // The editing tab's button leaves the a11y tree (display: none is
      // simulated in jsdom by the [data-editing] CSS rule, which jsdom does
      // not apply — so assert the structural marker + input presence, the
      // things this component controls directly).
      const bravoTab = screen.getByRole("tab", { name: "Bravo" });
      const slot = bravoTab.parentElement as HTMLElement;
      expect(slot).toHaveAttribute("data-editing", "");
      expect(bravoTab).toHaveAttribute("tabIndex", "-1");

      const input = screen.getByRole("textbox", { name: "Rename tab" });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("Bravo");
      expect(input).toHaveAttribute("size", "1");

      // The other tabs are untouched — only the editing tab's slot carries
      // data-editing.
      const alphaSlot = screen.getByRole("tab", { name: "Alpha" }).parentElement;
      expect(alphaSlot).not.toHaveAttribute("data-editing");
    });

    it("mirrors the draft into an aria-hidden ghost, falling back to the placeholder when empty", () => {
      render(
        <TabStrip items={ITEMS} value="bravo" onChange={() => {}} idPrefix="demo" editing={editing()} />,
      );
      const input = screen.getByRole("textbox", { name: "Rename tab" });

      fireEvent.change(input, { target: { value: "Renamed" } });
      expect(screen.getByText("Renamed")).toHaveAttribute("aria-hidden");

      fireEvent.change(input, { target: { value: "" } });
      expect(screen.getByText("Untitled")).toHaveAttribute("aria-hidden");
    });

    it("Enter commits the current draft", () => {
      const onCommit = vi.fn();
      render(
        <TabStrip
          items={ITEMS}
          value="bravo"
          onChange={() => {}}
          idPrefix="demo"
          editing={editing({ onCommit })}
        />,
      );
      const input = screen.getByRole("textbox", { name: "Rename tab" });
      fireEvent.change(input, { target: { value: "Renamed" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onCommit).toHaveBeenCalledWith("Renamed");
    });

    it("blur commits the current draft", () => {
      const onCommit = vi.fn();
      render(
        <TabStrip
          items={ITEMS}
          value="bravo"
          onChange={() => {}}
          idPrefix="demo"
          editing={editing({ onCommit })}
        />,
      );
      const input = screen.getByRole("textbox", { name: "Rename tab" });
      fireEvent.change(input, { target: { value: "Renamed" } });
      fireEvent.blur(input);
      expect(onCommit).toHaveBeenCalledWith("Renamed");
    });

    it("Escape cancels AND suppresses the blur-commit that follows it (the suppression latch)", () => {
      const onCommit = vi.fn();
      const onCancel = vi.fn();
      render(
        <TabStrip
          items={ITEMS}
          value="bravo"
          onChange={() => {}}
          idPrefix="demo"
          editing={editing({ onCommit, onCancel })}
        />,
      );
      const input = screen.getByRole("textbox", { name: "Rename tab" });
      fireEvent.change(input, { target: { value: "Renamed" } });
      fireEvent.keyDown(input, { key: "Escape" });
      expect(onCancel).toHaveBeenCalledTimes(1);

      // Escape does not itself blur the input (jsdom does not do that for a
      // synthetic keydown) — a consumer's real Escape handling typically
      // blurs afterward (e.g. by moving focus away). The latch's whole job
      // is to make THAT blur a no-op instead of a second, contradictory
      // commit.
      fireEvent.blur(input);
      expect(onCommit).not.toHaveBeenCalled();
    });

    it("a blur with no preceding Escape still commits normally (the latch is one-shot per mount)", () => {
      const onCommit = vi.fn();
      render(
        <TabStrip
          items={ITEMS}
          value="bravo"
          onChange={() => {}}
          idPrefix="demo"
          editing={editing({ onCommit })}
        />,
      );
      const input = screen.getByRole("textbox", { name: "Rename tab" });
      fireEvent.blur(input);
      expect(onCommit).toHaveBeenCalledWith("Bravo");
    });
  });
});
