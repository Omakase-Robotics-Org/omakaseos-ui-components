import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BADGE_ANCHOR_OFFSET_SCALE,
  BADGE_OFFSET_PX,
  BADGE_PICK_RADIUS_PX,
} from "./direct-manipulation/constants";
import { EditRemoveBadge } from "./EditRemoveBadge";
import type { EditRemoveBadgeProps } from "./EditRemoveBadge";
import styles from "./EditRemoveBadge.module.css";

const STATES: readonly EditRemoveBadgeProps["state"][] = ["idle", "hover"];

describe("EditRemoveBadge", () => {
  it("renders as an SVG fragment with a fixed hidden, non-focusable boundary", () => {
    const { container } = render(
      <svg>
        <EditRemoveBadge x={40} y={50} state="idle" />
      </svg>,
    );
    const group = container.querySelector("svg > g");
    expect(group).not.toBeNull();
    expect(group).toHaveAttribute("aria-hidden", "true");
    expect(group).toHaveAttribute("focusable", "false");
  });

  it("states its default offset as the grammar's anchor rule, not a rounded literal", () => {
    // WHERE the badge sits is a position shared with the hit test, so it stays a
    // number (unlike its drawn size, which is a token). It is the grammar's own
    // rule resolved onto the diagonal, so the two cannot drift.
    const diagonal = (BADGE_ANCHOR_OFFSET_SCALE * BADGE_PICK_RADIUS_PX) / Math.SQRT2;
    expect(BADGE_OFFSET_PX.x).toBeCloseTo(diagonal);
    expect(BADGE_OFFSET_PX.y).toBeCloseTo(-diagonal);

    const { container } = render(
      <svg>
        <EditRemoveBadge x={40} y={50} state="idle" />
      </svg>,
    );
    expect(container.querySelector("svg > g > g")).toHaveAttribute(
      "transform",
      `translate(${String(40 + BADGE_OFFSET_PX.x)} ${String(50 + BADGE_OFFSET_PX.y)}) scale(1)`,
    );
  });

  it("draws the badge as a circle whose radius is a token, not a prop", () => {
    const { container } = render(
      <svg>
        <EditRemoveBadge x={40} y={50} state="idle" />
      </svg>,
    );
    const badge = container.querySelector("[data-edit-glyph]");
    expect(badge?.tagName).toBe("circle");
    expect(badge).toHaveClass(styles.badge!);
    expect(badge).toHaveAttribute("data-edit-glyph", "badge");
    expect(badge?.hasAttribute("r")).toBe(false);
  });

  it("draws the remove mark as one bar rule rotated twice", () => {
    // Two paths whose `d` was arithmetic on the instance radius became two
    // instances of one CSS rule at +/-45 degrees: same length, same weight, no
    // per-instance geometry to get wrong.
    const { container } = render(
      <svg>
        <EditRemoveBadge x={40} y={50} state="idle" />
      </svg>,
    );
    expect(container.querySelectorAll("path")).toHaveLength(0);
    const marks = container.querySelectorAll(`rect.${styles.mark}`);
    expect(marks).toHaveLength(2);
    expect(marks[0]).toHaveAttribute("transform", "rotate(45)");
    expect(marks[1]).toHaveAttribute("transform", "rotate(-45)");
    for (const mark of marks) {
      for (const name of ["x", "y", "width", "height"]) {
        expect(mark.hasAttribute(name), name).toBe(false);
      }
    }
  });

  it("accepts a caller offset without changing the anchor contract", () => {
    const { container } = render(
      <svg>
        <EditRemoveBadge x={40} y={50} offsetPx={{ x: 4, y: 5 }} state="idle" />
      </svg>,
    );
    expect(container.querySelector("svg > g > g")).toHaveAttribute(
      "transform",
      "translate(44 55) scale(1)",
    );
  });

  it("draws both states at the identical geometry, inverting the danger register", () => {
    const drawn = STATES.map((state) => {
      const { container } = render(
        <svg>
          <EditRemoveBadge x={40} y={50} state={state} />
        </svg>,
      );
      return {
        state,
        body: container.querySelector("svg > g > g")?.outerHTML,
        register: container.querySelector("svg > g")?.getAttribute("class"),
      };
    });
    expect(drawn[1]?.body).toBe(drawn[0]?.body);
    expect(new Set(drawn.map((entry) => entry.register)).size).toBe(STATES.length);
  });
});
