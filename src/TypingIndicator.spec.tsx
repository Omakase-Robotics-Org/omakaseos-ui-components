import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TypingIndicator } from "./TypingIndicator";

describe("TypingIndicator", () => {
  it("defaults to role=assistant when no role is given", () => {
    const { container } = render(<TypingIndicator />);
    expect(container.querySelector('[data-role="assistant"]')).not.toBeNull();
  });

  it("propagates the requested role via data-role", () => {
    const { container } = render(<TypingIndicator role="user" />);
    expect(container.querySelector('[data-role="user"]')).not.toBeNull();
  });

  it("uses the default aria-label 'typing' and exposes role=status", () => {
    render(<TypingIndicator />);
    const node = screen.getByRole("status");
    expect(node.getAttribute("aria-label")).toBe("typing");
    expect(node.getAttribute("aria-live")).toBe("polite");
  });

  it("accepts an explicit aria-label override", () => {
    render(<TypingIndicator ariaLabel="thinking…" />);
    expect(screen.getByRole("status").getAttribute("aria-label")).toBe(
      "thinking…",
    );
  });

  it("renders three dots", () => {
    const { container } = render(<TypingIndicator />);
    expect(
      container.querySelectorAll('[role="status"] > span').length,
    ).toBe(3);
  });
});
