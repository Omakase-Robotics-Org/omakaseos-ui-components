import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Toast, type ToastTone } from "./Toast";

/**
 * The contract restated independently of the component: only the register
 * that means "it did not happen" interrupts. If the component's own map
 * drifts, this table disagrees with it.
 */
const EXPECTED_ROLE: Record<ToastTone, "alert" | "status"> = {
  success: "status",
  warning: "status",
  danger: "alert",
  info: "status",
  neutral: "status",
};

describe("Toast", () => {
  it("derives the ARIA role from the tone, and tags the tone for CSS/selectors", () => {
    for (const [tone, role] of Object.entries(EXPECTED_ROLE) as ReadonlyArray<
      [ToastTone, "alert" | "status"]
    >) {
      const { unmount } = render(<Toast tone={tone}>message</Toast>);
      const card = screen.getByRole(role);
      expect(card.getAttribute("data-tone")).toBe(tone);
      unmount();
    }
  });

  it("does not let the interrupting register fall back to a polite one", () => {
    render(<Toast tone="danger">message</Toast>);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders its children as the message", () => {
    render(<Toast tone="info">Map switched to floor 2</Toast>);
    expect(screen.getByRole("status")).toHaveTextContent("Map switched to floor 2");
  });

  it("is open by default and reports the host's open state via data-open", () => {
    const { rerender } = render(<Toast tone="info">message</Toast>);
    expect(screen.getByRole("status").getAttribute("data-open")).toBe("true");
    rerender(
      <Toast tone="info" open={false}>
        message
      </Toast>,
    );
    expect(screen.getByRole("status").getAttribute("data-open")).toBe("false");
  });

  it("holds no timer of its own: a mounted toast stays open forever", () => {
    vi.useFakeTimers();
    try {
      render(<Toast tone="success">message</Toast>);
      vi.advanceTimersByTime(60_000);
      expect(screen.getByRole("status").getAttribute("data-open")).toBe("true");
    } finally {
      vi.useRealTimers();
    }
  });
});
