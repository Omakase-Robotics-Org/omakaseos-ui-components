import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SegmentedMeter } from "./SegmentedMeter";
import type { MeterSegment } from "./SegmentedMeter";

const SHEET: readonly MeterSegment[] = [
  { id: "ok", value: 30, weight: "full" },
  { id: "ng", value: 8, weight: "strong" },
  { id: "pending", value: 4, weight: "medium" },
  { id: "na", value: 2, weight: "faint" },
];

/** Widths as declared on each rendered segment, keyed by segment id. */
function widths(container: HTMLElement): Record<string, string> {
  return Object.fromEntries(
    Array.from(container.querySelectorAll<HTMLElement>("[data-segment]")).map((el) => [
      el.getAttribute("data-segment") ?? "",
      el.style.width,
    ]),
  );
}

describe("SegmentedMeter", () => {
  it("names the division from the caller's words", () => {
    render(<SegmentedMeter segments={SHEET} ariaLabel="44 checks: 30 passed" />);
    expect(screen.getByRole("img", { name: "44 checks: 30 passed" })).toBeInTheDocument();
  });

  it("treats the segments as the whole when no total is given", () => {
    const { container } = render(
      <SegmentedMeter
        segments={[
          { id: "a", value: 1, weight: "full" },
          { id: "b", value: 3, weight: "faint" },
        ]}
        ariaLabel="quarters"
      />,
    );
    expect(widths(container)).toEqual({ a: "25%", b: "75%" });
  });

  it("leaves the unaccounted part of a larger total as empty track", () => {
    const { container } = render(
      <SegmentedMeter
        segments={[{ id: "ok", value: 25, weight: "full" }]}
        total={100}
        ariaLabel="a quarter done"
      />,
    );
    expect(widths(container)).toEqual({ ok: "25%" });
  });

  it("widens the whole rather than overflowing when total is smaller than the segments", () => {
    // The division given (2:2) is what gets drawn; a clamped or clipped bar
    // would render as exactly full and report a division it was not given.
    const { container } = render(
      <SegmentedMeter
        segments={[
          { id: "a", value: 2, weight: "full" },
          { id: "b", value: 2, weight: "faint" },
        ]}
        total={1}
        ariaLabel="over-full"
      />,
    );
    expect(widths(container)).toEqual({ a: "50%", b: "50%" });
  });

  it("renders no element for a segment holding nothing", () => {
    const { container } = render(
      <SegmentedMeter
        segments={[
          { id: "ok", value: 10, weight: "full" },
          { id: "ng", value: 0, weight: "strong" },
        ]}
        ariaLabel="no failures"
      />,
    );
    expect(container.querySelector('[data-segment="ng"]')).toBeNull();
    expect(widths(container)).toEqual({ ok: "100%" });
  });

  it("renders bare track when nothing has been counted yet (no division by zero)", () => {
    const { container } = render(
      <SegmentedMeter
        segments={[{ id: "ok", value: 0, weight: "full" }]}
        ariaLabel="nothing counted"
      />,
    );
    expect(container.querySelectorAll("[data-segment]")).toHaveLength(0);
    expect(screen.getByRole("img", { name: "nothing counted" })).toBeInTheDocument();
  });

  it("exposes each segment's weight so the ordering is assertable", () => {
    const { container } = render(<SegmentedMeter segments={SHEET} ariaLabel="sheet" />);
    const order = Array.from(container.querySelectorAll("[data-segment]")).map((el) =>
      el.getAttribute("data-weight"),
    );
    expect(order).toEqual(["full", "strong", "medium", "faint"]);
  });

  it("keeps segment order as given — the array is the reading order", () => {
    const { container } = render(
      <SegmentedMeter
        segments={[
          { id: "second", value: 1, weight: "faint" },
          { id: "first", value: 1, weight: "full" },
        ]}
        ariaLabel="as given"
      />,
    );
    const ids = Array.from(container.querySelectorAll("[data-segment]")).map((el) =>
      el.getAttribute("data-segment"),
    );
    expect(ids).toEqual(["second", "first"]);
  });

  it("defaults to md and propagates the requested size", () => {
    const { container, rerender } = render(
      <SegmentedMeter segments={SHEET} ariaLabel="sheet" />,
    );
    expect(container.querySelector('[data-size="md"]')).not.toBeNull();
    rerender(<SegmentedMeter segments={SHEET} size="sm" ariaLabel="sheet" />);
    expect(container.querySelector('[data-size="sm"]')).not.toBeNull();
  });

  it("ignores a negative value when summing the whole", () => {
    // A negative count is caller data the meter cannot draw; it must not make
    // the denominator smaller than what the drawable segments hold.
    const { container } = render(
      <SegmentedMeter
        segments={[
          { id: "ok", value: 3, weight: "full" },
          { id: "bogus", value: -3, weight: "faint" },
        ]}
        ariaLabel="negative guarded"
      />,
    );
    expect(widths(container)).toEqual({ ok: "100%" });
  });
});
