import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RankChip } from "./RankChip";

describe("RankChip", () => {
  it("renders the notation the caller writes and exposes the rank via data-rank", () => {
    render(<RankChip rank="high">A</RankChip>);
    const chip = screen.getByText("A");
    expect(chip.getAttribute("data-rank")).toBe("high");
  });

  it("accepts label= as an alternative to children (StatusBadge's shape)", () => {
    render(<RankChip rank="medium" label="B" />);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("prefers children over label when both are provided", () => {
    render(
      <RankChip rank="low" label="from-label">
        from-children
      </RankChip>,
    );
    expect(screen.getByText("from-children")).toBeInTheDocument();
    expect(screen.queryByText("from-label")).toBeNull();
  });

  it("keeps the ordering (rank) separate from the notation (children)", () => {
    // Same rank, two notations: the weight is driven by data-rank only, so a
    // consumer renaming its notation does not restyle its chips.
    const { container } = render(
      <>
        <RankChip rank="high">A</RankChip>
        <RankChip rank="high">高</RankChip>
      </>,
    );
    const ranks = Array.from(container.querySelectorAll("[data-rank]")).map((el) =>
      el.getAttribute("data-rank"),
    );
    expect(ranks).toEqual(["high", "high"]);
  });

  it("has no accessible name of its own beyond the visible token", () => {
    render(<RankChip rank="medium">B</RankChip>);
    expect(screen.getByText("B").getAttribute("aria-label")).toBeNull();
  });

  it("takes an ariaLabel where the notation does not say enough out loud", () => {
    render(
      <RankChip rank="high" ariaLabel="priority A">
        A
      </RankChip>,
    );
    expect(screen.getByLabelText("priority A")).toBeInTheDocument();
  });

  it("defaults to md and propagates the requested size", () => {
    const { container, rerender } = render(<RankChip rank="low">C</RankChip>);
    expect(container.querySelector('[data-size="md"]')).not.toBeNull();
    rerender(<RankChip rank="low" size="sm">C</RankChip>);
    expect(container.querySelector('[data-size="sm"]')).not.toBeNull();
  });
});
