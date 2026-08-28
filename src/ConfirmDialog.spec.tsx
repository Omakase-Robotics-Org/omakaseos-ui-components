/**
 * @file ConfirmDialog — jsdom coverage. Composes `Dialog` (see
 * `Dialog.spec.tsx` for the open/close-protocol coverage that applies
 * here too via composition); this file covers ConfirmDialog's own
 * additions: label placement, `busy`'s aria-disabled + click-refusal on
 * both buttons, and the `confirmVariant` default.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

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
  busy?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmVariant?: "primary" | "danger";
}) {
  return (
    <ConfirmDialog
      open
      title="Delete robot"
      body="This cannot be undone."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      closeLabel="Close"
      busy={props.busy}
      confirmVariant={props.confirmVariant}
      onConfirm={props.onConfirm ?? (() => {})}
      onCancel={props.onCancel ?? (() => {})}
    />
  );
}

describe("ConfirmDialog", () => {
  it("renders the title, body, and both labels on their own buttons", () => {
    render(<Harness />);
    expect(screen.getByRole("heading", { name: "Delete robot" })).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("defaults confirmVariant to danger", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute("data-variant", "danger");
  });

  it("confirmVariant overrides the default", () => {
    render(<Harness confirmVariant="primary" />);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute("data-variant", "primary");
  });

  it("onConfirm fires when the confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("onCancel fires when the cancel button, the close button, or the cancel event fires", () => {
    const onCancel = vi.fn();
    render(<Harness onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("busy aria-disables both buttons", () => {
    render(<Harness busy />);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute("aria-disabled", "true");
  });

  it("busy: onConfirm and onCancel are NOT invoked by a click on their buttons", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<Harness busy onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("not busy: neither button is aria-disabled", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Cancel" })).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Delete" })).not.toHaveAttribute("aria-disabled", "true");
  });
});
