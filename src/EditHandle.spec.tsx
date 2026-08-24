import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  HANDLE_RADIUS_PX,
  HANDLE_SELECTED_SCALE,
} from "./direct-manipulation/constants";
import { EditHandle } from "./EditHandle";
import styles from "./EditHandle.module.css";

function outerGroup(container: HTMLElement): Element {
  const group = container.querySelector("svg > g");
  expect(group).not.toBeNull();
  return group as Element;
}

describe("EditHandle", () => {
  it("renders as an SVG fragment with a fixed hidden, non-focusable boundary", () => {
    const { container } = render(
      <svg>
        <EditHandle x={20} y={30} state="idle" />
      </svg>,
    );
    const group = outerGroup(container);
    expect(group).toHaveAttribute("aria-hidden", "true");
    expect(group).toHaveAttribute("focusable", "false");
    expect(container.querySelector("circle")).not.toBeNull();
  });

  it("uses the grammar default radius and keeps the ring centered", () => {
    const { container } = render(
      <svg>
        <EditHandle x={20} y={30} state="idle" />
      </svg>,
    );
    const ring = container.querySelector("circle");
    expect(ring).toHaveAttribute("cx", "20");
    expect(ring).toHaveAttribute("cy", "30");
    expect(ring).toHaveAttribute("r", String(HANDLE_RADIUS_PX));
  });

  it("exposes every state as a CSS class and scales selected/dragging geometry", () => {
    const { container, rerender } = render(
      <svg>
        <EditHandle x={20} y={30} radiusPx={10} state="idle" />
      </svg>,
    );
    const group = () => outerGroup(container);
    const ring = () => container.querySelector("circle");

    expect(group()).toHaveClass(styles.idle!);
    expect(ring()).toHaveAttribute("r", "10");

    rerender(
      <svg>
        <EditHandle x={20} y={30} radiusPx={10} state="hover" />
      </svg>,
    );
    expect(group()).toHaveClass(styles.hover!);
    expect(Number(ring()?.getAttribute("r"))).toBeGreaterThan(10);

    rerender(
      <svg>
        <EditHandle x={20} y={30} radiusPx={10} state="selected" />
      </svg>,
    );
    expect(group()).toHaveClass(styles.selected!);
    expect(Number(ring()?.getAttribute("r"))).toBeCloseTo(10 * HANDLE_SELECTED_SCALE);

    rerender(
      <svg>
        <EditHandle x={20} y={30} radiusPx={10} state="dragging" />
      </svg>,
    );
    expect(group()).toHaveClass(styles.dragging!);
    expect(Number(ring()?.getAttribute("r"))).toBeCloseTo(10 * HANDLE_SELECTED_SCALE);
  });

  it("draws an optional direction tick from the scaled ring edge", () => {
    const { container } = render(
      <svg>
        <EditHandle x={20} y={30} radiusPx={10} state="selected" heading={0} />
      </svg>,
    );
    const tick = container.querySelector("line");
    expect(tick).not.toBeNull();
    expect(Number(tick?.getAttribute("x1"))).toBeCloseTo(20 + 10 * HANDLE_SELECTED_SCALE);
    expect(Number(tick?.getAttribute("y1"))).toBeCloseTo(30);
    expect(Number(tick?.getAttribute("x2"))).toBeGreaterThan(Number(tick?.getAttribute("x1")));
  });
});
