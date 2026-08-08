import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SignalBars } from "./SignalBars";

function activeCount(container: HTMLElement): number {
  return container.querySelectorAll('[data-active="true"]').length;
}

describe("SignalBars", () => {
  it("renders four bars total, regardless of signal", () => {
    const { container } = render(<SignalBars signal={0} />);
    expect(container.firstElementChild?.children.length).toBe(4);
  });

  it("lights zero bars below the first threshold", () => {
    const { container } = render(<SignalBars signal={0} />);
    expect(activeCount(container)).toBe(0);
  });

  it("lights one bar at 25", () => {
    const { container } = render(<SignalBars signal={25} />);
    expect(activeCount(container)).toBe(1);
  });

  it("lights two bars at 50", () => {
    const { container } = render(<SignalBars signal={50} />);
    expect(activeCount(container)).toBe(2);
  });

  it("lights three bars at 75", () => {
    const { container } = render(<SignalBars signal={75} />);
    expect(activeCount(container)).toBe(3);
  });

  it("lights all four bars at 100", () => {
    const { container } = render(<SignalBars signal={100} />);
    expect(activeCount(container)).toBe(4);
  });
});
