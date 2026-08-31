import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditRubberBand } from "./EditRubberBand";
import styles from "./EditRubberBand.module.css";

describe("EditRubberBand", () => {
  it("renders as an SVG fragment with a fixed hidden, non-focusable boundary", () => {
    const { container } = render(
      <svg>
        <EditRubberBand from={{ x: 0, y: 0 }} to={{ x: 10, y: 10 }} state="free" />
      </svg>,
    );
    const group = container.querySelector("svg > g");
    expect(group).not.toBeNull();
    expect(group).toHaveAttribute("aria-hidden", "true");
    expect(group).toHaveAttribute("focusable", "false");
  });

  it("draws the pending leg between the two supplied points", () => {
    const { container } = render(
      <svg>
        <EditRubberBand from={{ x: 5, y: 6 }} to={{ x: 25, y: 36 }} state="free" />
      </svg>,
    );
    const band = container.querySelector(`line.${styles.band}`);
    expect(band).toHaveAttribute("x1", "5");
    expect(band).toHaveAttribute("y1", "6");
    expect(band).toHaveAttribute("x2", "25");
    expect(band).toHaveAttribute("y2", "36");
  });

  it("draws both states with the identical geometry: the dash is the difference", () => {
    // A constrained leg used to also thicken. Weight is one value for both
    // states now, so the modifier reads as a dash change and nothing resizes.
    const geometryOf = (state: "free" | "constrained") => {
      const { container } = render(
        <svg>
          <EditRubberBand from={{ x: 5, y: 6 }} to={{ x: 25, y: 36 }} state={state} />
        </svg>,
      );
      const band = container.querySelector(`line.${styles.band}`);
      return ["x1", "y1", "x2", "y2", "stroke-width", "stroke-dasharray"].map((name) =>
        band?.getAttribute(name),
      );
    };
    expect(geometryOf("constrained")).toEqual(geometryOf("free"));
  });

  it("states the constraint on the group, not by color alone", () => {
    const free = render(
      <svg>
        <EditRubberBand from={{ x: 0, y: 0 }} to={{ x: 10, y: 10 }} state="free" />
      </svg>,
    );
    expect(free.container.querySelector("svg > g")).toHaveAttribute("data-state", "free");

    const constrained = render(
      <svg>
        <EditRubberBand from={{ x: 0, y: 0 }} to={{ x: 10, y: 10 }} state="constrained" />
      </svg>,
    );
    const group = constrained.container.querySelector("svg > g");
    expect(group).toHaveAttribute("data-state", "constrained");
    expect(group).toHaveClass(styles.constrained!);
  });

  it("previews the closing leg only when a first corner is supplied", () => {
    const open = render(
      <svg>
        <EditRubberBand from={{ x: 0, y: 0 }} to={{ x: 10, y: 10 }} state="free" />
      </svg>,
    );
    expect(open.container.querySelectorAll(`line.${styles.closing}`)).toHaveLength(0);

    const closing = render(
      <svg>
        <EditRubberBand
          from={{ x: 0, y: 0 }}
          to={{ x: 10, y: 10 }}
          state="free"
          closeTo={{ x: 20, y: 0 }}
        />
      </svg>,
    );
    const leg = closing.container.querySelector(`line.${styles.closing}`);
    expect(leg).toHaveAttribute("x1", "10");
    expect(leg).toHaveAttribute("x2", "20");
    expect(leg?.hasAttribute("stroke-dasharray")).toBe(false);
    expect(leg).toHaveAttribute("vector-effect", "non-scaling-stroke");
  });
});
