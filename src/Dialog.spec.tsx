/**
 * @file Dialog — jsdom coverage of the behavior a layout/UA engine cannot
 * change: the open/close protocol, ARIA wiring, footer/footerStart
 * placement, and the PanelScope reset. Visual claims (centering under a
 * host `* { margin: 0 }` reset, ::backdrop paint, md/lg widths,
 * footerStart's on-screen position relative to Cancel) are jsdom-blind —
 * those are pinned in `spec/overlay-dialog.e2e.spec.ts` against a real
 * layout engine, the same split `Popover.spec.tsx` / `overlay-popover-menu
 * .e2e.spec.ts` already draw.
 *
 * jsdom (v29, this repo's test environment) implements `<dialog>` as a
 * plain HTMLElement subclass with no `showModal()` / `close()` at all —
 * see `node_modules/jsdom/lib/jsdom/living/nodes/HTMLDialogElement-impl.js`.
 * `.open` IS a working reflected attribute (WebIDL-generated), so only the
 * two imperative methods need a minimal polyfill below: `showModal()` sets
 * the `open` attribute (which the component's effect reads via
 * `dialog.open`), `close()` clears it and fires the native "close" event
 * the ref's `onClose` wiring listens for.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Component } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { Dialog } from "./Dialog";
import { Panel } from "./Panel";
import { Card } from "./Card";
import styles from "./Dialog.module.css";

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

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  });
});

function Harness(props: {
  open?: boolean;
  onClose?: () => void;
  footer?: ReactNode;
  footerStart?: ReactNode;
  description?: string;
  size?: "md" | "lg";
  children?: ReactNode;
}) {
  return (
    <Dialog
      open={props.open ?? true}
      title="Delete robot"
      description={props.description}
      size={props.size}
      closeLabel="Close"
      onClose={props.onClose ?? (() => {})}
      footer={props.footer}
      footerStart={props.footerStart}
    >
      {props.children ?? "Are you sure?"}
    </Dialog>
  );
}

describe("Dialog", () => {
  it("calls showModal() when open, and the open attribute reflects it", () => {
    render(<Harness open />);
    const dialog = document.querySelector("dialog");
    expect(dialog).not.toBeNull();
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
    expect(dialog?.hasAttribute("open")).toBe(true);
  });

  it("does not call showModal() when open=false", () => {
    render(<Harness open={false} />);
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
  });

  it("calls dialog.close() when a controlling parent flips open to false", () => {
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(false)}>
            flip
          </button>
          <Harness open={open} />
        </>
      );
    }
    render(<Controlled />);
    fireEvent.click(screen.getByRole("button", { name: "flip" }));
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1);
  });

  it("portals the dialog to document.body, not the call-site subtree", () => {
    const { container } = render(<Harness />);
    const dialog = document.querySelector("dialog");
    expect(dialog).not.toBeNull();
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it("closeLabel is the close button's accessible name", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("data-size defaults to md and reflects the size prop", () => {
    const { rerender } = render(<Harness />);
    expect(document.querySelector("dialog")).toHaveAttribute("data-size", "md");
    rerender(<Harness size="lg" />);
    expect(document.querySelector("dialog")).toHaveAttribute("data-size", "lg");
  });

  it("wires aria-labelledby to the title and aria-describedby to the description", () => {
    render(<Harness description="This cannot be undone." />);
    const dialog = document.querySelector("dialog")!;
    const labelledby = dialog.getAttribute("aria-labelledby");
    const describedby = dialog.getAttribute("aria-describedby");
    expect(labelledby).not.toBeNull();
    expect(document.getElementById(labelledby!)).toHaveTextContent("Delete robot");
    expect(describedby).not.toBeNull();
    expect(document.getElementById(describedby!)).toHaveTextContent("This cannot be undone.");
  });

  it("omits aria-describedby entirely when there is no description", () => {
    render(<Harness />);
    expect(document.querySelector("dialog")!.hasAttribute("aria-describedby")).toBe(false);
  });

  it("onClose fires when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("onClose fires on the native cancel event (Escape) and its default action is prevented", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const dialog = document.querySelector("dialog")!;
    const event = new Event("cancel", { cancelable: true });
    dialog.dispatchEvent(event);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    // Controlled component: the native default action (closing the dialog
    // out from under `open`) must NOT have run on its own — only the
    // effect, driven by the parent re-rendering with open=false, may call
    // dialog.close(). This harness never flips `open`, so close() must not
    // have been called by the cancel event itself.
    expect(HTMLDialogElement.prototype.close).not.toHaveBeenCalled();
  });

  it("renders no footer wrapper when neither footer nor footerStart is given", () => {
    render(<Harness />);
    expect(document.body.getElementsByClassName(styles.footer!)).toHaveLength(0);
  });

  it("renders footer content inside a .footer row with no .footerStart wrapper when footerStart is absent", () => {
    render(<Harness footer={<button type="button">Confirm</button>} />);
    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    expect(confirmButton.parentElement).toHaveClass(styles.footer!);
    expect(document.body.getElementsByClassName(styles.footerStart!)).toHaveLength(0);
  });

  it("footerStart renders as the footer row's first child, ahead of footer, and sits on the left of the row (DOM order)", () => {
    render(
      <Harness
        footerStart={<button type="button">Delete</button>}
        footer={<button type="button">Cancel</button>}
      />,
    );
    const deleteButton = screen.getByRole("button", { name: "Delete" });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });

    const footerStartWrapper = deleteButton.parentElement!;
    expect(footerStartWrapper).toHaveClass(styles.footerStart!);

    const footerRow = cancelButton.parentElement!;
    expect(footerRow).toHaveClass(styles.footer!);
    expect(footerStartWrapper.parentElement).toBe(footerRow);

    const rowChildren = Array.from(footerRow.children);
    expect(rowChildren.indexOf(footerStartWrapper)).toBeLessThan(rowChildren.indexOf(cancelButton));
  });

  it("PanelScope is reset around the body and footer — a Card in either does not throw, even opened from inside a Panel", () => {
    const errors: Error[] = [];
    function Scenario() {
      return (
        <Panel title="Robot fleet">
          <Harness
            footer={<Card title="Footer card">footer card content</Card>}
          >
            <Card title="Body card">body card content</Card>
          </Harness>
        </Panel>
      );
    }
    render(
      <ErrorBoundary onError={(error) => errors.push(error)}>
        <Scenario />
      </ErrorBoundary>,
    );
    expect(errors).toEqual([]);
    expect(screen.getByRole("heading", { name: "Body card" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Footer card" })).toBeInTheDocument();
  });
});
