import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToggleSwitch } from "./ToggleSwitch";

describe("ToggleSwitch", () => {
  it("reflects the checked prop and is named by ariaLabel", () => {
    render(<ToggleSwitch checked ariaLabel="Test switch" onChange={() => {}} />);
    const input = screen.getByRole("switch", { name: "Test switch" }) as HTMLInputElement;
    expect(input.checked).toBe(true);
  });

  it("emits the new checked value when toggled", () => {
    const calls: boolean[] = [];
    render(<ToggleSwitch checked={false} ariaLabel="Test switch" onChange={(c) => calls.push(c)} />);
    fireEvent.click(screen.getByRole("switch", { name: "Test switch" }));
    expect(calls).toEqual([true]);
  });

  it("forwards disabled to the input", () => {
    render(<ToggleSwitch checked disabled ariaLabel="Test switch" onChange={() => {}} />);
    const input = screen.getByRole("switch", { name: "Test switch" }) as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
