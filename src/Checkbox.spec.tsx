import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("renders a native checkbox role", () => {
    render(<Checkbox aria-label="enable" />);
    expect(screen.getByRole("checkbox", { name: "enable" })).toBeInTheDocument();
  });

  it("renders a label that toggles via htmlFor", () => {
    render(<Checkbox id="cb1" label="Enable feature" />);
    expect(screen.getByLabelText("Enable feature")).toBeInTheDocument();
  });

  it("forwards onChange", () => {
    const onChange = vi.fn();
    render(<Checkbox aria-label="x" onChange={onChange} />);
    screen.getByRole("checkbox").click();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("sets indeterminate via the imperative property (not an attribute)", () => {
    const { rerender } = render(<Checkbox aria-label="x" indeterminate />);
    const cb = screen.getByRole("checkbox") as HTMLInputElement;
    expect(cb.indeterminate).toBe(true);
    rerender(<Checkbox aria-label="x" indeterminate={false} />);
    expect(cb.indeterminate).toBe(false);
  });

  it("respects defaultChecked", () => {
    render(<Checkbox aria-label="x" defaultChecked />);
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
  });
});
