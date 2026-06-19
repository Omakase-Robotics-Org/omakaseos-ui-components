import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Slider } from "./Slider";

describe("Slider", () => {
  it("renders with role=slider (native input[type=range])", () => {
    render(<Slider aria-label="volume" min={0} max={100} defaultValue={50} />);
    const slider = screen.getByRole("slider", { name: "volume" });
    expect(slider).toBeInTheDocument();
    expect(slider.getAttribute("type")).toBe("range");
  });

  it("forwards min, max, value", () => {
    render(<Slider aria-label="x" min={10} max={20} defaultValue={15} />);
    const slider = screen.getByRole("slider") as HTMLInputElement;
    expect(slider.min).toBe("10");
    expect(slider.max).toBe("20");
    expect(slider.value).toBe("15");
  });

  it("forwards onChange", () => {
    const onChange = vi.fn();
    render(<Slider aria-label="x" min={0} max={100} defaultValue={0} onChange={onChange} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "42" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("renders an associated label when provided", () => {
    render(<Slider id="vol" label="Volume" min={0} max={100} defaultValue={0} />);
    expect(screen.getByLabelText("Volume")).toBeInTheDocument();
  });

  it("computes the --ds-slider-fill custom property from value/min/max", () => {
    const { container } = render(
      <Slider aria-label="x" min={0} max={100} defaultValue={75} />,
    );
    const slider = container.querySelector("input") as HTMLInputElement;
    // jsdom keeps inline style as a string; assert prefix to allow rounding.
    expect(slider.getAttribute("style") ?? "").toContain("--ds-slider-fill: 75");
  });
});
