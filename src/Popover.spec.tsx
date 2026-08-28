/**
 * @file Popover — jsdom coverage of the behavior a layout engine cannot
 * change: ARIA shape, the portal, focus management, and the dismissal
 * rules (including the `dialog[open]` carve-out `.codex/ref/Popover.tsx`'s
 * header argues for). Positioning math itself is pinned separately in
 * `floating/anchored-position.spec.ts` — jsdom reports every rect as
 * all-zero, so it cannot prove pixel placement (this is a jsdom limit, not
 * a claim this file makes; see AGENTS.md's ui-check note on the same
 * limit for real components).
 */
import { useRef, useState } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Popover } from "./Popover";
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

function Harness(props: {
  align?: "start" | "end";
  children?: ReactNode;
  onRequestClose?: (returnFocus: boolean) => void;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" ref={anchorRef}>
        anchor
      </button>
      <Popover
        open={open}
        anchorRef={anchorRef}
        align={props.align}
        ariaLabel="Rename column"
        onRequestClose={(returnFocus) => {
          setOpen(false);
          props.onRequestClose?.(returnFocus);
        }}
      >
        {props.children ?? <input aria-label="value" defaultValue="battery_pct" />}
      </Popover>
    </>
  );
}

describe("Popover", () => {
  it("renders nothing when closed", () => {
    function Closed() {
      const anchorRef = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button type="button" ref={anchorRef}>
            anchor
          </button>
          <Popover open={false} anchorRef={anchorRef} ariaLabel="x" onRequestClose={() => {}}>
            content
          </Popover>
        </>
      );
    }
    render(<Closed />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("portals role=dialog content to document.body, not the call-site subtree", () => {
    const { container } = render(<Harness />);
    const dialog = screen.getByRole("dialog", { name: "Rename column" });
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it("moves focus to [data-autofocus] on open", () => {
    render(
      <Harness>
        <input aria-label="first" />
        <input aria-label="second" data-autofocus />
      </Harness>,
    );
    expect(screen.getByLabelText("second")).toHaveFocus();
  });

  it("falls back to the first focusable element when nothing is data-autofocus", () => {
    render(
      <Harness>
        <input aria-label="only" />
      </Harness>,
    );
    expect(screen.getByLabelText("only")).toHaveFocus();
  });

  it("Escape closes and requests focus return to the anchor", () => {
    const onRequestClose = vi.fn();
    render(<Harness onRequestClose={onRequestClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onRequestClose).toHaveBeenCalledWith(true);
  });

  it("outside pointerdown closes without requesting focus return", () => {
    const onRequestClose = vi.fn();
    render(<Harness onRequestClose={onRequestClose} />);
    fireEvent.pointerDown(document.body);
    expect(onRequestClose).toHaveBeenCalledWith(false);
  });

  it("pointerdown inside the panel does not close it", () => {
    const onRequestClose = vi.fn();
    render(<Harness onRequestClose={onRequestClose} />);
    fireEvent.pointerDown(screen.getByRole("dialog"));
    expect(onRequestClose).not.toHaveBeenCalled();
  });

  it("pointerdown on the anchor does not close it", () => {
    const onRequestClose = vi.fn();
    render(<Harness onRequestClose={onRequestClose} />);
    fireEvent.pointerDown(screen.getByRole("button", { name: "anchor" }));
    expect(onRequestClose).not.toHaveBeenCalled();
  });

  it("dialog[open] rule: a click inside an open native dialog stacked over the panel is NOT outside", () => {
    const onRequestClose = vi.fn();
    function WithStackedDialog() {
      return (
        <>
          <Harness onRequestClose={onRequestClose} />
          <dialog open data-testid="stacked-dialog">
            <button type="button">inside the dialog</button>
          </dialog>
        </>
      );
    }
    render(<WithStackedDialog />);
    fireEvent.pointerDown(screen.getByText("inside the dialog"));
    expect(onRequestClose).not.toHaveBeenCalled();
  });

  it("dialog[open] rule: Escape inside the stacked dialog does not close the popover", () => {
    const onRequestClose = vi.fn();
    function WithStackedDialog() {
      return (
        <>
          <Harness onRequestClose={onRequestClose} />
          <dialog open>
            <button type="button">inside the dialog</button>
          </dialog>
        </>
      );
    }
    render(<WithStackedDialog />);
    fireEvent.keyDown(screen.getByText("inside the dialog"), { key: "Escape" });
    expect(onRequestClose).not.toHaveBeenCalled();
  });

  it("without a stacked dialog, Escape from any document target still closes it (control: same case, no carve-out)", () => {
    const onRequestClose = vi.fn();
    function WithPlainButton() {
      return (
        <>
          <Harness onRequestClose={onRequestClose} />
          <button type="button">elsewhere on the page</button>
        </>
      );
    }
    render(<WithPlainButton />);
    fireEvent.keyDown(screen.getByText("elsewhere on the page"), { key: "Escape" });
    expect(onRequestClose).toHaveBeenCalledWith(true);
  });

  it("PanelScope is reset inside the portaled panel — a Card in its content does not throw, even anchored from inside a Panel", () => {
    const errors: Error[] = [];
    function Scenario() {
      const anchorRef = useRef<HTMLButtonElement>(null);
      return (
        <Panel title="Conversation state">
          <button type="button" ref={anchorRef}>
            anchor
          </button>
          <Popover open anchorRef={anchorRef} ariaLabel="Editor" onRequestClose={() => {}}>
            <Card title="Prompt">popover content</Card>
          </Popover>
        </Panel>
      );
    }
    render(
      <ErrorBoundary onError={(error) => errors.push(error)}>
        <Scenario />
      </ErrorBoundary>,
    );
    expect(errors).toEqual([]);
    expect(within(document.body).getByRole("heading", { name: "Prompt" })).toBeInTheDocument();
  });
});
