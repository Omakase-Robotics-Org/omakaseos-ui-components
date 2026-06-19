import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders the label and exposes the tone via data-tone for CSS selectors", () => {
    render(<StatusBadge tone="success">Connected</StatusBadge>);
    const badge = screen.getByText("Connected");
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute("data-tone")).toBe("success");
  });

  it("omits the pulse dot when pulse is not requested", () => {
    const { container } = render(<StatusBadge tone="warning">38%</StatusBadge>);
    expect(container.querySelector('[data-pulse="true"]')).toBeNull();
  });

  it("renders a pulse dot when pulse is true", () => {
    const { container } = render(
      <StatusBadge tone="success" pulse>
        Live
      </StatusBadge>,
    );
    expect(container.querySelector('[data-pulse="true"]')).not.toBeNull();
  });

  it("propagates the size attribute only for sm", () => {
    const { rerender, container } = render(
      <StatusBadge tone="neutral" size="md">
        Idle
      </StatusBadge>,
    );
    expect(container.querySelector('[data-size]')).toBeNull();
    rerender(
      <StatusBadge tone="neutral" size="sm">
        Idle
      </StatusBadge>,
    );
    expect(container.querySelector('[data-size="sm"]')).not.toBeNull();
  });
});
