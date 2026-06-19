import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("renders a textbox by default", () => {
    render(<Input placeholder="email" />);
    expect(screen.getByPlaceholderText("email")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "text");
  });

  it("forwards type", () => {
    render(<Input type="email" />);
    expect(document.querySelector('input[type="email"]')).not.toBeNull();
  });

  it("propagates inputSize via data-size", () => {
    const { container } = render(<Input inputSize="lg" />);
    expect(container.querySelector('[data-size="lg"]')).not.toBeNull();
  });

  it("flips data-invalid and aria-invalid when invalid is true", () => {
    const { container, rerender } = render(<Input />);
    expect(container.querySelector('[data-invalid="true"]')).toBeNull();
    rerender(<Input invalid />);
    const el = container.querySelector('input');
    expect(el?.getAttribute("data-invalid")).toBe("true");
    expect(el?.getAttribute("aria-invalid")).toBe("true");
  });
});
