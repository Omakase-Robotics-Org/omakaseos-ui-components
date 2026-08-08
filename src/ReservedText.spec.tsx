import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReservedText } from "./ReservedText";

describe("ReservedText", () => {
  it("renders children when given", () => {
    render(<ReservedText>Guard rejected: outside safety envelope.</ReservedText>);
    expect(screen.getByText("Guard rejected: outside safety envelope.")).toBeInTheDocument();
  });

  it("renders an empty slot when given no children", () => {
    const { container } = render(<ReservedText />);
    expect(container.firstElementChild?.textContent).toBe("");
  });

  it("defaults to tone=muted", () => {
    const { container } = render(<ReservedText>x</ReservedText>);
    expect(container.firstElementChild).toHaveAttribute("data-tone", "muted");
  });

  it("carries tone=warning", () => {
    const { container } = render(<ReservedText tone="warning">x</ReservedText>);
    expect(container.firstElementChild).toHaveAttribute("data-tone", "warning");
  });

  it("sizes its reservation from the `lines` prop", () => {
    const { container: oneLine } = render(<ReservedText lines={1} />);
    const { container: twoLines } = render(<ReservedText lines={2} />);
    const oneStyle = (oneLine.firstElementChild as HTMLElement).style.height;
    const twoStyle = (twoLines.firstElementChild as HTMLElement).style.height;
    expect(oneStyle).toBe("calc(1 * var(--reserved-line-height))");
    expect(twoStyle).toBe("calc(2 * var(--reserved-line-height))");
  });
});
