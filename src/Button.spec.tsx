import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders the label as accessible button text", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("defaults to type=button and secondary variant", () => {
    const { container } = render(<Button>X</Button>);
    const btn = container.querySelector("button");
    expect(btn?.getAttribute("type")).toBe("button");
    expect(btn?.getAttribute("data-variant")).toBe("secondary");
    expect(btn?.getAttribute("data-size")).toBe("md");
  });

  it("propagates variant and size via data-* attributes", () => {
    const { container } = render(
      <Button variant="primary" size="lg">
        Go
      </Button>,
    );
    const btn = container.querySelector("button");
    expect(btn?.getAttribute("data-variant")).toBe("primary");
    expect(btn?.getAttribute("data-size")).toBe("lg");
  });

  it("truncates by default and opts out via truncate={false}", () => {
    const { container, rerender } = render(<Button>label</Button>);
    expect(container.querySelector('[data-truncate="true"]')).not.toBeNull();
    rerender(<Button truncate={false}>label</Button>);
    expect(container.querySelector('[data-truncate="true"]')).toBeNull();
  });

  it("forwards onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Run</Button>);
    screen.getByRole("button").click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respects type=submit when explicitly set", () => {
    const { container } = render(<Button type="submit">Send</Button>);
    expect(container.querySelector("button")?.getAttribute("type")).toBe("submit");
  });
});
