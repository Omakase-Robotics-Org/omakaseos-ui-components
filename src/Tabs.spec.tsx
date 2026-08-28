import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Panel } from "./Panel";
import { Tabs } from "./Tabs";
import type { TabItem } from "./Tabs";

type Id = "one" | "two";

const ITEMS: readonly TabItem<Id>[] = [
  { id: "one", label: "One", content: <p>Content one</p> },
  { id: "two", label: "Two", content: <p>Content two</p> },
];

describe("Tabs", () => {
  it("renders the strip and only the ACTIVE panel", () => {
    render(<Tabs items={ITEMS} value="one" onChange={() => {}} idPrefix="demo" />);
    expect(screen.getByText("Content one")).toBeInTheDocument();
    expect(screen.queryByText("Content two")).toBeNull();
  });

  it("switches which panel is mounted when value changes — the inactive one is not just hidden", () => {
    const { rerender } = render(
      <Tabs items={ITEMS} value="one" onChange={() => {}} idPrefix="demo" />,
    );
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);

    rerender(<Tabs items={ITEMS} value="two" onChange={() => {}} idPrefix="demo" />);
    expect(screen.queryByText("Content one")).toBeNull();
    expect(screen.getByText("Content two")).toBeInTheDocument();
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
  });

  it("pairs each tab and panel with deterministic, idPrefix-scoped ids", () => {
    render(<Tabs items={ITEMS} value="one" onChange={() => {}} idPrefix="demo" />);
    const tab = screen.getByRole("tab", { name: "One" });
    const panel = screen.getByRole("tabpanel");

    expect(tab).toHaveAttribute("id", "demo-tab-one");
    expect(panel).toHaveAttribute("id", "demo-panel-one");
    expect(tab).toHaveAttribute("aria-controls", "demo-panel-one");
    expect(panel).toHaveAttribute("aria-labelledby", "demo-tab-one");
  });

  it("clicking a tab calls onChange with its id (the consumer owns which panel mounts next)", () => {
    const onChange = vi.fn();
    render(<Tabs items={ITEMS} value="one" onChange={onChange} idPrefix="demo" />);
    screen.getByRole("tab", { name: "Two" }).click();
    expect(onChange).toHaveBeenCalledWith("two");
  });

  it("two Tabs instances on the same page stay disambiguated by their own idPrefix", () => {
    render(
      <>
        <Tabs items={ITEMS} value="one" onChange={() => {}} idPrefix="left" />
        <Tabs items={ITEMS} value="two" onChange={() => {}} idPrefix="right" />
      </>,
    );
    // Each instance renders both tabs (the strip does not conditionally
    // render tabs — only Tabs conditionally mounts panels), so there are two
    // "One" tabs and two "Two" tabs in document order: left's pair, then
    // right's pair.
    const oneTabs = screen.getAllByRole("tab", { name: "One" });
    const twoTabs = screen.getAllByRole("tab", { name: "Two" });
    expect(oneTabs.map((t) => t.id)).toEqual(["left-tab-one", "right-tab-one"]);
    expect(twoTabs.map((t) => t.id)).toEqual(["left-tab-two", "right-tab-two"]);

    // Each instance mounts only ITS OWN active panel — left="one", right="two".
    const panels = screen.getAllByRole("tabpanel");
    expect(panels.map((p) => p.id)).toEqual(["left-panel-one", "right-panel-two"]);
  });

  // PanelScope — explicit NON-action (see Tabs.tsx file header): a tab panel
  // renders content in flow, not a portal, so it must NOT reset the scope a
  // surrounding Panel opened. Pinned here the same way PanelScope.spec.tsx
  // pins the contract itself, so nobody "harmonises" this away later.
  it("does NOT reset PanelScope — a Panel inside a Tabs panel inside a Panel still throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const itemsWithNestedPanel: readonly TabItem<Id>[] = [
      {
        id: "one",
        label: "One",
        content: <Panel title="Nested">should not be reachable</Panel>,
      },
    ];
    expect(() =>
      render(<Panel title="Outer"><Tabs items={itemsWithNestedPanel} value="one" onChange={() => {}} idPrefix="demo" /></Panel>),
    ).toThrow("Panel must not nest inside another Panel");
    vi.restoreAllMocks();
  });

  it("a Tabs panel with NO surrounding Panel accepts a Panel as content (the scope is opt-in, not global)", () => {
    const itemsWithPanel: readonly TabItem<Id>[] = [
      { id: "one", label: "One", content: <Panel title="Fine here">ok</Panel> },
    ];
    render(<Tabs items={itemsWithPanel} value="one" onChange={() => {}} idPrefix="demo" />);
    expect(screen.getByRole("heading", { level: 2, name: "Fine here" })).toBeInTheDocument();
  });
});
