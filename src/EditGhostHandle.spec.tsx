import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditGhostHandle } from "./EditGhostHandle";
import type { EditGhostHandleProps } from "./EditGhostHandle";
import styles from "./EditGhostHandle.module.css";

const STATES: readonly EditGhostHandleProps["state"][] = ["idle", "hover", "target"];

describe("EditGhostHandle", () => {
  it("renders in an SVG with a fixed hidden, non-focusable boundary", () => {
    const { container } = render(
      <svg>
        <EditGhostHandle x={42} y={18} state="idle" />
      </svg>,
    );
    const group = container.querySelector("svg > g");
    expect(group).not.toBeNull();
    expect(group).toHaveAttribute("aria-hidden", "true");
    expect(group).toHaveAttribute("focusable", "false");
    expect(group).toHaveClass(styles.group!);
  });

  it("draws the prospective anchor as a square placed at the requested centre", () => {
    // The same shape as EditHandle's anchor, because it is the same thing one
    // step earlier. Its size is the shared token, not a prop: there is no
    // radiusPx to pass any more.
    const { container } = render(
      <svg>
        <EditGhostHandle x={42} y={18} state="idle" />
      </svg>,
    );
    const ghost = container.querySelector("[data-edit-glyph]");
    expect(ghost?.tagName).toBe("rect");
    expect(ghost).toHaveClass(styles.ghost!);
    expect(ghost).toHaveAttribute("data-edit-glyph", "ghost");
    expect(container.querySelector("svg > g > g")).toHaveAttribute(
      "transform",
      "translate(42 18) scale(1)",
    );
    for (const name of ["x", "y", "width", "height", "stroke-dasharray"]) {
      expect(ghost?.hasAttribute(name), name).toBe(false);
    }
  });

  it("carries the host's counter-scale into the placement", () => {
    const { container } = render(
      <svg>
        <EditGhostHandle x={42} y={18} state="idle" unitsPerPixel={0.5} />
      </svg>,
    );
    expect(container.querySelector("svg > g > g")).toHaveAttribute(
      "transform",
      "translate(42 18) scale(0.5)",
    );
  });

  it("draws every state at the identical geometry, changing only the register", () => {
    // idle -> hover -> target used to be 1x -> 1.15x -> 1.35x. A ghost that
    // swells when the pointer nears it is the interference this vocabulary
    // removes; the difference is now the dash and the fill.
    const drawn = STATES.map((state) => {
      const { container } = render(
        <svg>
          <EditGhostHandle x={42} y={18} state={state} />
        </svg>,
      );
      const ghost = container.querySelector("[data-edit-glyph]");
      return {
        state,
        placement: container.querySelector("svg > g > g")?.getAttribute("transform"),
        markup: ghost?.outerHTML,
        register: container.querySelector("svg > g")?.getAttribute("class"),
      };
    });
    const first = drawn[0]!;
    for (const entry of drawn) {
      expect(entry.placement, entry.state).toBe(first.placement);
      expect(entry.markup, entry.state).toBe(first.markup);
    }
    expect(new Set(drawn.map((entry) => entry.register)).size).toBe(STATES.length);
  });
});
