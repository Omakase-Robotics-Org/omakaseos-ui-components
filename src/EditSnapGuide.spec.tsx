import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditSnapGuide } from "./EditSnapGuide";
import type { EditSnapGuideProps } from "./EditSnapGuide";
import styles from "./EditSnapGuide.module.css";

const KINDS: readonly EditSnapGuideProps["kind"][] = ["vertex", "edge", "align", "grid"];

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
    const marks = (kind: EditSnapGuideProps["kind"]) => {
      const { container } = render(
        <svg>
          <EditSnapGuide at={{ x: 30, y: 40 }} kind={kind} />
        </svg>,
      );
      const bars = [...container.querySelectorAll(`rect.${styles.mark}`)];
      return {
        bars: bars.length,
        angles: bars.map((bar) => bar.getAttribute("transform")),
        dots: container.querySelectorAll(`circle.${styles.dot}`).length,
      };
    };
    // A plus and a cross are the SAME bar rule at two pairs of angles: the mark
    // vocabulary has one length, and the kind is the rotation.
    expect(marks("vertex")).toEqual({ bars: 2, angles: ["rotate(0)", "rotate(90)"], dots: 0 });
    expect(marks("edge")).toEqual({ bars: 2, angles: ["rotate(45)", "rotate(-45)"], dots: 0 });
    expect(marks("grid")).toEqual({ bars: 0, angles: [], dots: 1 });
    // An alignment's whole statement is the shared axis: no mark of its own.
    expect(marks("align")).toEqual({ bars: 0, angles: [], dots: 0 });
  });

  it("never wears an anchor's shape: no snap mark is a filled square", () => {
    // `edge` used to be a small filled square, which is now exactly what an
    // anchor is - and the mark is drawn ON TOP of the position it caught, so the
    // collision was guaranteed to be seen.
    for (const kind of KINDS) {
      const { container } = render(
        <svg>
          <EditSnapGuide at={{ x: 30, y: 40 }} kind={kind} />
        </svg>,
      );
      const squares = [...container.querySelectorAll("rect")].filter(
        (rect) => !(rect.getAttribute("class") ?? "").includes(styles.mark!),
      );
      expect(squares, kind).toEqual([]);
    }
  });

  it("draws the mark at the snapped position with no size of its own", () => {
    const { container } = render(
      <svg>
        <EditSnapGuide at={{ x: 30, y: 40 }} kind="vertex" unitsPerPixel={2} />
      </svg>,
    );
    const body = container.querySelector(`g.${styles.body}`);
    expect(body).toHaveAttribute("transform", "translate(30 40) scale(2)");
    for (const bar of container.querySelectorAll(`rect.${styles.mark}`)) {
      for (const name of ["x", "y", "width", "height"]) {
        expect(bar.hasAttribute(name), name).toBe(false);
      }
    }
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
    // Drawn in host coordinates: its weight and dash are declared as screen
    // quantities instead of scaling with the surface.
    expect(guide).toHaveAttribute("vector-effect", "non-scaling-stroke");
    expect(guide?.hasAttribute("stroke-dasharray")).toBe(false);
  });
});
