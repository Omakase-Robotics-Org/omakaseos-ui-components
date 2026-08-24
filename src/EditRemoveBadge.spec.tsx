import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BADGE_OFFSET_PX,
  BADGE_RADIUS_PX,
} from "./direct-manipulation/constants";
import { EditRemoveBadge } from "./EditRemoveBadge";
import styles from "./EditRemoveBadge.module.css";

describe("EditRemoveBadge", () => {
  it("renders as an SVG fragment with a fixed hidden, non-focusable boundary", () => {
    const { container } = render(
      <svg>
        <EditRemoveBadge x={40} y={50} />
      </svg>,
    );
    const group = container.querySelector("svg > g");
    expect(group).not.toBeNull();
    expect(group).toHaveAttribute("aria-hidden", "true");
    expect(group).toHaveAttribute("focusable", "false");
  });

  it("applies the default offset and radius to the badge circle", () => {
    const x = 40;
    const y = 50;
    const { container } = render(
      <svg>
        <EditRemoveBadge x={x} y={y} />
      </svg>,
    );
    const badge = container.querySelector("circle");
    expect(badge).toHaveClass(styles.badge!);
    expect(badge).toHaveAttribute("cx", String(x + BADGE_OFFSET_PX.x));
    expect(badge).toHaveAttribute("cy", String(y + BADGE_OFFSET_PX.y));
    expect(badge).toHaveAttribute("r", String(BADGE_RADIUS_PX));
  });

  it("draws the remove mark as two foreground paths", () => {
    const { container } = render(
      <svg>
        <EditRemoveBadge x={40} y={50} radiusPx={10} />
      </svg>,
    );
    const paths = container.querySelectorAll("path");
    expect(paths).toHaveLength(2);
    expect(paths[0]).toHaveClass(styles.mark!);
    expect(paths[1]).toHaveClass(styles.mark!);
    expect(paths[0]).toHaveAttribute("d", expect.stringContaining("M 46.8 34.8"));
    expect(paths[1]).toHaveAttribute("d", expect.stringContaining("M 55.2 34.8"));
  });

  it("accepts a caller offset without changing the anchor contract", () => {
    const { container } = render(
      <svg>
        <EditRemoveBadge x={40} y={50} offsetPx={{ x: 4, y: 5 }} />
      </svg>,
    );
    const badge = container.querySelector("circle");
    expect(badge).toHaveAttribute("cx", "44");
    expect(badge).toHaveAttribute("cy", "55");
  });
});
