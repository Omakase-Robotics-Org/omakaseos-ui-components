import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  HANDLE_SELECTED_SCALE,
  KNOB_RADIUS_PX,
} from "./direct-manipulation/constants";
import { EditHeadingKnob } from "./EditHeadingKnob";
import styles from "./EditHeadingKnob.module.css";

describe("EditHeadingKnob", () => {
  it("renders as an SVG fragment with a fixed hidden, non-focusable boundary", () => {
    const { container } = render(
      <svg>
        <EditHeadingKnob x={10} y={20} angle={0} armPx={30} state="idle" />
      </svg>,
    );
    const group = container.querySelector("svg > g");
    expect(group).not.toBeNull();
    expect(group).toHaveAttribute("aria-hidden", "true");
    expect(group).toHaveAttribute("focusable", "false");
  });

  it("places the knob at the arm endpoint using cosine and sine", () => {
    const x = 10;
    const y = 20;
    const angle = Math.PI / 3;
    const armPx = 30;
    const { container } = render(
      <svg>
        <EditHeadingKnob x={x} y={y} angle={angle} armPx={armPx} state="idle" />
      </svg>,
    );
    const line = container.querySelector("line");
    const knob = container.querySelector("circle");
    expect(Number(line?.getAttribute("x2"))).toBeCloseTo(x + Math.cos(angle) * armPx);
    expect(Number(line?.getAttribute("y2"))).toBeCloseTo(y + Math.sin(angle) * armPx);
    expect(Number(knob?.getAttribute("cx"))).toBeCloseTo(x + Math.cos(angle) * armPx);
    expect(Number(knob?.getAttribute("cy"))).toBeCloseTo(y + Math.sin(angle) * armPx);
    expect(knob).toHaveAttribute("r", String(KNOB_RADIUS_PX));
  });

  it("exposes state classes and enlarges the knob while dragging", () => {
    const { container, rerender } = render(
      <svg>
        <EditHeadingKnob x={10} y={20} angle={0} armPx={30} state="idle" />
      </svg>,
    );
    const group = () => container.querySelector("svg > g");
    const knob = () => container.querySelector("circle");
    expect(group()).toHaveClass(styles.idle!);
    expect(knob()).toHaveAttribute("r", String(KNOB_RADIUS_PX));

    rerender(
      <svg>
        <EditHeadingKnob x={10} y={20} angle={0} armPx={30} state="hover" />
      </svg>,
    );
    expect(group()).toHaveClass(styles.hover!);
    expect(Number(knob()?.getAttribute("r"))).toBeGreaterThan(KNOB_RADIUS_PX);

    rerender(
      <svg>
        <EditHeadingKnob x={10} y={20} angle={0} armPx={30} state="dragging" />
      </svg>,
    );
    expect(group()).toHaveClass(styles.dragging!);
    expect(Number(knob()?.getAttribute("r"))).toBeCloseTo(KNOB_RADIUS_PX * HANDLE_SELECTED_SCALE);
  });
});
