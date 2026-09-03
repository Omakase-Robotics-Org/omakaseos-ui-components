import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "./BrandLogo";
import styles from "./BrandLogo.module.css";

/** The three fills the source omakase-logo.svg carries, in document order. */
const EXPECTED_FILLS = ["#c4c4c4", "#000", "#fff"];

function svgOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector("svg");
  expect(svg).not.toBeNull();
  return svg as SVGSVGElement;
}

describe("BrandLogo", () => {
  it("renders as an accessible image with the default 'Omakase' name", () => {
    const { container } = render(<BrandLogo />);
    const svg = svgOf(container);
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label", "Omakase");
  });

  it("takes a host-supplied alt over the default", () => {
    const { container } = render(<BrandLogo alt="Omakase Robotics Dashboard" />);
    expect(svgOf(container)).toHaveAttribute("aria-label", "Omakase Robotics Dashboard");
  });

  it("carries the seal's own viewBox and sizing class, not an <img> src", () => {
    const { container } = render(<BrandLogo />);
    const svg = svgOf(container);
    expect(svg).toHaveAttribute("viewBox", "0 0 157.53051 157.53051");
    expect(svg).toHaveClass(styles.logo!);
    expect(container.querySelector("img")).toBeNull();
  });

  it("draws exactly the three seal layers (outline, body, mark) with the source's fills", () => {
    const { container } = render(<BrandLogo />);
    const paths = Array.from(svgOf(container).querySelectorAll("path"));
    expect(paths).toHaveLength(3);
    expect(paths.map((path) => path.getAttribute("fill"))).toEqual(EXPECTED_FILLS);
    // Every path draws distinct geometry — no layer is an accidental
    // duplicate of another.
    expect(new Set(paths.map((path) => path.getAttribute("d"))).size).toBe(3);
  });

  it("draws the mark's white 'O' layer as a path long enough to be the real glyph, not a placeholder", () => {
    const { container } = render(<BrandLogo />);
    const paths = Array.from(svgOf(container).querySelectorAll("path"));
    const markPath = paths[2]!;
    expect(markPath.getAttribute("fill")).toBe("#fff");
    // The source path data is >1900 characters; a stand-in shape (a circle
    // approximation, a placeholder square) would be a small fraction of that.
    expect(markPath.getAttribute("d")!.length).toBeGreaterThan(1500);
  });
});
