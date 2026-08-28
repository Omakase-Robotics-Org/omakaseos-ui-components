/**
 * @file Menu — jsdom coverage of the behavior a layout engine cannot change:
 * ARIA shape, the portal, the trigger contract, roving-focus traversal, and
 * dismissal. Positioning math itself is pinned separately in
 * `floating/anchored-position.spec.ts`.
 *
 * `nextItemIndex` (ported verbatim from `.codex/ref/Menu.tsx`) does not
 * check `item.disabled` at all — it moves the active index by count alone.
 * A `disabled` item can still become "active" via traversal; the browser
 * then simply refuses to focus it (a native `<button disabled>` cannot
 * receive focus), which is the ref's own behavior, not a gap this port
 * introduces. That is exercised below rather than assumed.
 */
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Menu } from "./Menu";
import type { MenuItem, MenuTriggerProps } from "./Menu";
import { Panel } from "./Panel";
import { Card } from "./Card";

class ErrorBoundary extends Component<
  { children: ReactNode; onError: (error: Error) => void },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  override render() {
    return this.state.failed ? <p>boundary caught the error</p> : this.props.children;
  }
}

function trigger(props: MenuTriggerProps) {
  return (
    <button
      type="button"
      ref={props.ref}
      onClick={props.onClick}
      aria-haspopup={props["aria-haspopup"]}
      aria-expanded={props["aria-expanded"]}
    >
      Actions
    </button>
  );
}

function items(overrides?: Partial<Record<string, Partial<MenuItem>>>): readonly MenuItem[] {
  const base: MenuItem[] = [
    { key: "rename", label: "Rename", onSelect: vi.fn() },
    { key: "duplicate", label: "Duplicate", onSelect: vi.fn() },
    { key: "delete", label: "Delete", onSelect: vi.fn(), danger: true },
  ];
  if (overrides === undefined) {
    return base;
  }
  return base.map((item) => (overrides[item.key] ? { ...item, ...overrides[item.key] } : item));
}

function openMenu(menuItems: readonly MenuItem[] = items()) {
  render(<Menu items={menuItems} trigger={trigger} ariaLabel="Robot actions" />);
  fireEvent.click(screen.getByRole("button", { name: "Actions" }));
  return menuItems;
}

describe("Menu", () => {
  it("renders the trigger with aria-haspopup/aria-expanded and no panel before it opens", () => {
    render(<Menu items={items()} trigger={trigger} ariaLabel="Robot actions" />);
    const button = screen.getByRole("button", { name: "Actions" });
    expect(button).toHaveAttribute("aria-haspopup", "menu");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens a role=menu panel, portalled to document.body, on trigger click", () => {
    const { container } = render(<Menu items={items()} trigger={trigger} ariaLabel="Robot actions" />);
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    const menu = screen.getByRole("menu", { name: "Robot actions" });
    expect(container.contains(menu)).toBe(false);
    expect(document.body.contains(menu)).toBe(true);
    expect(screen.getByRole("button", { name: "Actions" })).toHaveAttribute("aria-expanded", "true");
  });

  it("renders one menuitem button per item, item 0 active (tabIndex 0), the rest -1", () => {
    openMenu();
    const menuItems = screen.getAllByRole("menuitem");
    expect(menuItems.map((el) => el.textContent)).toEqual(["Rename", "Duplicate", "Delete"]);
    expect(menuItems[0]).toHaveAttribute("tabindex", "0");
    expect(menuItems[1]).toHaveAttribute("tabindex", "-1");
    expect(menuItems[2]).toHaveAttribute("tabindex", "-1");
  });

  it("marks a danger item with data-danger", () => {
    openMenu();
    const deleteItem = screen.getByRole("menuitem", { name: "Delete" });
    expect(deleteItem).toHaveAttribute("data-danger", "");
    expect(screen.getByRole("menuitem", { name: "Rename" })).not.toHaveAttribute("data-danger");
  });

  it("ArrowDown moves the active item forward and wraps", () => {
    openMenu();
    const panel = screen.getByRole("menu");
    fireEvent.keyDown(panel, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Duplicate" })).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(panel, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(panel, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveAttribute("tabindex", "0");
  });

  it("ArrowUp moves the active item backward and wraps", () => {
    openMenu();
    const panel = screen.getByRole("menu");
    fireEvent.keyDown(panel, { key: "ArrowUp" });
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute("tabindex", "0");
  });

  it("Home/End jump to the first/last item", () => {
    openMenu();
    const panel = screen.getByRole("menu");
    fireEvent.keyDown(panel, { key: "End" });
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(panel, { key: "Home" });
    expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveAttribute("tabindex", "0");
  });

  it("clicking an item calls onSelect, closes the menu, and returns focus to the trigger", () => {
    const onSelect = vi.fn();
    const menuItems = items({ rename: { onSelect } });
    openMenu(menuItems);
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: "Actions" })).toHaveFocus();
  });

  it("Escape closes the menu and returns focus to the trigger", () => {
    openMenu();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: "Actions" })).toHaveFocus();
  });

  it("outside pointerdown closes the menu without stealing focus back", () => {
    openMenu();
    const trigger = screen.getByRole("button", { name: "Actions" });
    (trigger as HTMLElement).blur();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger).not.toHaveFocus();
  });

  it("pointerdown inside the panel does not close it", () => {
    openMenu();
    fireEvent.pointerDown(screen.getByRole("menu"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("re-opening resets the active item to 0", () => {
    openMenu();
    const panel = screen.getByRole("menu");
    fireEvent.keyDown(panel, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Duplicate" })).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveAttribute("tabindex", "0");
  });

  it("a disabled item is still reachable by traversal (index-only, per the ref)", () => {
    // jsdom does not enforce the browser rule that a disabled button cannot
    // receive focus (a real browser would silently no-op the `.focus()` call
    // Menu's active-item effect makes), so this only pins the part jsdom CAN
    // see: `nextItemIndex` does not consult `item.disabled` at all — the ref
    // reaches this same button, disabled attribute and all.
    openMenu(items({ duplicate: { disabled: true } }));
    const panel = screen.getByRole("menu");
    fireEvent.keyDown(panel, { key: "ArrowDown" });
    const duplicate = screen.getByRole("menuitem", { name: "Duplicate" });
    expect(duplicate).toHaveAttribute("tabindex", "0");
    expect(duplicate).toBeDisabled();
  });

  it("PanelScope is reset inside the portaled panel — a Card in an item's label does not throw, even triggered from inside a Panel", () => {
    const errors: Error[] = [];
    const menuItems: readonly MenuItem[] = [
      { key: "wizard", label: <Card title="Prompt">menu item content</Card>, onSelect: vi.fn() },
    ];
    function Scenario() {
      return (
        <Panel title="Conversation state">
          <Menu items={menuItems} trigger={trigger} ariaLabel="Robot actions" />
        </Panel>
      );
    }
    render(
      <ErrorBoundary onError={(error) => errors.push(error)}>
        <Scenario />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(errors).toEqual([]);
    expect(within(document.body).getByRole("heading", { name: "Prompt" })).toBeInTheDocument();
  });
});
