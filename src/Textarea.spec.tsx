import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("renders a multi-line textbox with a default rows of 3", () => {
    render(<Textarea aria-label="notes" />);
    const ta = screen.getByRole("textbox", { name: "notes" });
    expect(ta).toBeInTheDocument();
    expect(ta.tagName).toBe("TEXTAREA");
    expect(ta.getAttribute("rows")).toBe("3");
  });

  it("respects an explicit rows value", () => {
    render(<Textarea aria-label="notes" rows={6} />);
    expect(screen.getByRole("textbox").getAttribute("rows")).toBe("6");
  });

  it("propagates invalid", () => {
    const { container } = render(<Textarea aria-label="x" invalid />);
    const ta = container.querySelector("textarea");
    expect(ta?.getAttribute("data-invalid")).toBe("true");
    expect(ta?.getAttribute("aria-invalid")).toBe("true");
  });
});
