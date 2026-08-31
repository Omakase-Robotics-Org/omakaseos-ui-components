import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditHeadingKnob } from "./EditHeadingKnob";
import type { EditHeadingKnobProps } from "./EditHeadingKnob";
import styles from "./EditHeadingKnob.module.css";

const STATES: readonly EditHeadingKnobProps["state"][] = ["idle", "hover", "dragging"];

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
    const knobX = x + Math.cos(angle) * armPx;
    const knobY = y + Math.sin(angle) * armPx;
    expect(Number(line?.getAttribute("x2"))).toBeCloseTo(knobX);
    expect(Number(line?.getAttribute("y2"))).toBeCloseTo(knobY);
    // The arm is drawn in host coordinates, so its weight is declared as a
    // screen quantity rather than scaled with the surface.
    expect(line).toHaveAttribute("vector-effect", "non-scaling-stroke");
    const body = container.querySelector("svg > g > g");
    expect(body).toHaveAttribute(
      "transform",
      `translate(${String(knobX)} ${String(knobY)}) scale(1)`,
    );
  });

  it("draws the knob as a circle with no radius of its own", () => {
    // The circle is vocabulary: a square is a POSITION in the document, a
    // circle is a handle on a property of one. Its radius is a --ds-edit-*
    // token, so no state and no host can vary it.
    const { container } = render(
      <svg>
        <EditHeadingKnob x={10} y={20} angle={0} armPx={30} state="idle" />
      </svg>,
    );
    const knob = container.querySelector("[data-edit-glyph]");
    expect(knob?.tagName).toBe("circle");
    expect(knob).toHaveAttribute("data-edit-glyph", "knob");
    expect(knob).toHaveClass(styles.knob!);
    expect(knob?.hasAttribute("r")).toBe(false);
    expect(knob?.hasAttribute("cx")).toBe(false);
  });

  it("draws every state at the identical geometry, changing only the register", () => {
    // `dragging` used to multiply the knob by the shared 1.7x selection scale.
    const drawn = STATES.map((state) => {
      const { container } = render(
        <svg>
          <EditHeadingKnob x={10} y={20} angle={0} armPx={30} state={state} />
        </svg>,
      );
      return {
        state,
        placement: container.querySelector("svg > g > g")?.getAttribute("transform"),
        knob: container.querySelector("[data-edit-glyph]")?.outerHTML,
        arm: container.querySelector("line")?.getAttribute("x2"),
        register: container.querySelector("svg > g")?.getAttribute("class"),
      };
    });
    const first = drawn[0]!;
    for (const entry of drawn) {
      expect(entry.placement, entry.state).toBe(first.placement);
      expect(entry.knob, entry.state).toBe(first.knob);
      expect(entry.arm, entry.state).toBe(first.arm);
      expect((entry.register ?? "").split(" ")).toContain(styles[entry.state]!);
    }
    expect(new Set(drawn.map((entry) => entry.register)).size).toBe(STATES.length);
  });
});
