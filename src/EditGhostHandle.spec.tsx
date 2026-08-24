import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GHOST_RADIUS_PX } from "./direct-manipulation/constants";
import { EditGhostHandle } from "./EditGhostHandle";
import styles from "./EditGhostHandle.module.css";

describe("EditGhostHandle", () => {
  it("renders in an SVG with a fixed hidden, non-focusable boundary", () => {
    const { container } = render(
      <svg>
        <EditGhostHandle x={42} y={18} />
      </svg>,
    );
    const group = container.querySelector("svg > g");
    expect(group).not.toBeNull();
    expect(group).toHaveAttribute("aria-hidden", "true");
    expect(group).toHaveAttribute("focusable", "false");
    expect(group).toHaveClass(styles.group!);
  });

  it("draws the default hollow dashed ring at the requested center", () => {
    const { container } = render(
      <svg>
        <EditGhostHandle x={42} y={18} />
      </svg>,
    );
    const ring = container.querySelector("circle");
    expect(ring).toHaveClass(styles.ring!);
    expect(ring).toHaveAttribute("cx", "42");
    expect(ring).toHaveAttribute("cy", "18");
    expect(ring).toHaveAttribute("r", String(GHOST_RADIUS_PX));
    expect(ring).toHaveAttribute("stroke-dasharray", "4 3");
  });

  it("accepts an instance radius without changing its center", () => {
    const { container } = render(
      <svg>
        <EditGhostHandle x={42} y={18} radiusPx={11} />
      </svg>,
    );
    const ring = container.querySelector("circle");
    expect(ring).toHaveAttribute("r", "11");
    expect(ring).toHaveAttribute("cx", "42");
    expect(ring).toHaveAttribute("cy", "18");
  });
});
