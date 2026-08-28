import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditSnapGuide } from "./EditSnapGuide";
import styles from "./EditSnapGuide.module.css";

describe("EditSnapGuide", () => {
  it("renders as an SVG fragment with a fixed hidden, non-focusable boundary", () => {
    const { container } = render(
      <svg>
        <EditSnapGuide at={{ x: 30, y: 40 }} kind="grid" />
      </svg>,
    );
    const group = container.querySelector("svg > g");
    expect(group).not.toBeNull();
    expect(group).toHaveAttribute("aria-hidden", "true");
    expect(group).toHaveAttribute("focusable", "false");
    expect(group).toHaveAttribute("data-state", "grid");
  });

  it("gives each snap kind its own mark, so the four are distinguishable", () => {
    const marks = (kind: "vertex" | "edge" | "align" | "grid") => {
      const { container } = render(
        <svg>
          <EditSnapGuide at={{ x: 30, y: 40 }} kind={kind} />
        </svg>,
      );
      return {
        crossLines: container.querySelectorAll(`line.${styles.mark}`).length,
        tiles: container.querySelectorAll("rect").length,
        dots: container.querySelectorAll("circle").length,
      };
    };
    expect(marks("vertex")).toEqual({ crossLines: 2, tiles: 0, dots: 0 });
    expect(marks("edge")).toEqual({ crossLines: 0, tiles: 1, dots: 0 });
    expect(marks("grid")).toEqual({ crossLines: 0, tiles: 0, dots: 1 });
    // An alignment's whole statement is the shared axis: no mark of its own.
    expect(marks("align")).toEqual({ crossLines: 0, tiles: 0, dots: 0 });
  });

  it("draws the guide line only when both of its ends are supplied", () => {
    const withoutEnds = render(
      <svg>
        <EditSnapGuide at={{ x: 30, y: 40 }} kind="vertex" />
      </svg>,
    );
    expect(withoutEnds.container.querySelectorAll(`line.${styles.guide}`)).toHaveLength(0);

    const withEnds = render(
      <svg>
        <EditSnapGuide
          at={{ x: 30, y: 40 }}
          kind="vertex"
          from={{ x: 10, y: 10 }}
          to={{ x: 30, y: 40 }}
        />
      </svg>,
    );
    const guide = withEnds.container.querySelector(`line.${styles.guide}`);
    expect(guide).toHaveAttribute("x1", "10");
    expect(guide).toHaveAttribute("y2", "40");
  });

  it("centers the mark on the snapped position", () => {
    const { container } = render(
      <svg>
        <EditSnapGuide at={{ x: 30, y: 40 }} kind="edge" sizePx={4} />
      </svg>,
    );
    const tile = container.querySelector("rect");
    expect(tile).toHaveAttribute("x", "26");
    expect(tile).toHaveAttribute("y", "36");
    expect(tile).toHaveAttribute("width", "8");
    expect(tile).toHaveAttribute("height", "8");
  });
});
