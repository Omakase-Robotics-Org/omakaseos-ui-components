import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditMarquee } from "./EditMarquee";
import styles from "./EditMarquee.module.css";

describe("EditMarquee", () => {
  it("renders as an SVG fragment with a fixed hidden, non-focusable boundary", () => {
    const { container } = render(
      <svg>
        <EditMarquee from={{ x: 10, y: 20 }} to={{ x: 40, y: 60 }} />
      </svg>,
    );
    const group = container.querySelector("svg > g");
    expect(group).not.toBeNull();
    expect(group).toHaveAttribute("aria-hidden", "true");
    expect(group).toHaveAttribute("focusable", "false");
    expect(group).toHaveClass(styles.group!);
  });

  it("spans the two corners as a dashed rectangle", () => {
    const { container } = render(
      <svg>
        <EditMarquee from={{ x: 10, y: 20 }} to={{ x: 40, y: 60 }} />
      </svg>,
    );
    const rect = container.querySelector("rect");
    expect(rect).toHaveClass(styles.rect!);
    expect(rect).toHaveAttribute("x", "10");
    expect(rect).toHaveAttribute("y", "20");
    expect(rect).toHaveAttribute("width", "30");
    expect(rect).toHaveAttribute("height", "40");
    // The rectangle's extent is host geometry; its weight and dash are
    // --ds-edit-* tokens in the module, declared as screen quantities. Neither
    // is an attribute any more, so no call site can restate them.
    expect(rect?.hasAttribute("stroke-dasharray")).toBe(false);
    expect(rect).toHaveAttribute("vector-effect", "non-scaling-stroke");
  });

  it("normalises reversed corners, so a drag up-left is the same rectangle", () => {
    // A pointer dragged towards the origin would otherwise produce a negative
    // width, which SVG renders as nothing at all: the gesture would appear to
    // do nothing in exactly one of its four directions.
    const { container } = render(
      <svg>
        <EditMarquee from={{ x: 40, y: 60 }} to={{ x: 10, y: 20 }} />
      </svg>,
    );
    const rect = container.querySelector("rect");
    expect(rect).toHaveAttribute("x", "10");
    expect(rect).toHaveAttribute("y", "20");
    expect(rect).toHaveAttribute("width", "30");
    expect(rect).toHaveAttribute("height", "40");
  });
});
