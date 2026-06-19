import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "./Switch";

describe("Switch", () => {
  it("renders with role=switch (not checkbox)", () => {
    render(<Switch aria-label="autosave" />);
    expect(screen.getByRole("switch", { name: "autosave" })).toBeInTheDocument();
  });

  it("renders a label that toggles via htmlFor", () => {
    render(<Switch id="sw1" label="Autosave" />);
    expect(screen.getByLabelText("Autosave")).toBeInTheDocument();
  });

  it("forwards onChange", () => {
    const onChange = vi.fn();
    render(<Switch aria-label="x" onChange={onChange} />);
    screen.getByRole("switch").click();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("respects defaultChecked", () => {
    render(<Switch aria-label="x" defaultChecked />);
    expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(true);
  });
});
