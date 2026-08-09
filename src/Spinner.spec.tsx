import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("is a status region with a default accessible name", () => {
    render(<Spinner />);
    expect(screen.getByRole("status", { name: "loading" })).toBeInTheDocument();
  });

  it("takes a caller-supplied accessible name", () => {
    render(<Spinner ariaLabel="マップを記録中" />);
    expect(screen.getByRole("status", { name: "マップを記録中" })).toBeInTheDocument();
  });

  it("exposes the size via data-size, defaulting to md", () => {
    const { rerender } = render(<Spinner />);
    expect(screen.getByRole("status").getAttribute("data-size")).toBe("md");
    for (const size of ["sm", "md", "lg"] as const) {
      rerender(<Spinner size={size} />);
      expect(screen.getByRole("status").getAttribute("data-size")).toBe(size);
    }
  });

  it("exposes the tone via data-tone, and omits it when no tone is given", () => {
    const { rerender } = render(<Spinner />);
    expect(screen.getByRole("status").hasAttribute("data-tone")).toBe(false);
    rerender(<Spinner tone="success" />);
    expect(screen.getByRole("status").getAttribute("data-tone")).toBe("success");
  });

  it("hides the drawn ring from assistive tech (the label carries the meaning)", () => {
    render(<Spinner />);
    const region = screen.getByRole("status");
    const ring = region.firstElementChild;
    expect(ring).not.toBeNull();
    expect(ring?.getAttribute("aria-hidden")).toBe("true");
  });
});
