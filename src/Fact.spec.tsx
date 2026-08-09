import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Fact, FactGrid, FactList } from "./Fact";

describe("Fact + FactList", () => {
  it("defaults to row direction", () => {
    const { container } = render(<Fact label="Battery">38%</Fact>);
    expect(container.querySelector('[data-direction="row"]')).not.toBeNull();
  });

  it("respects column direction", () => {
    const { container } = render(
      <Fact label="Battery" direction="column">
        38%
      </Fact>,
    );
    expect(container.querySelector('[data-direction="column"]')).not.toBeNull();
  });

  it("renders label and value text", () => {
    render(<Fact label="Posture">Standing</Fact>);
    expect(screen.getByText("Posture")).toBeInTheDocument();
    expect(screen.getByText("Standing")).toBeInTheDocument();
  });

  it("FactList composes multiple Facts", () => {
    render(
      <FactList>
        <Fact label="A">a</Fact>
        <Fact label="B">b</Fact>
      </FactList>,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("reports the value's size, defaulting to md", () => {
    const { container, rerender } = render(<Fact label="Pose x">1.204 m</Fact>);
    expect(container.querySelector('[data-size="md"]')).not.toBeNull();
    rerender(
      <Fact label="Pose x" size="sm">
        1.204 m
      </Fact>,
    );
    expect(container.querySelector('[data-size="sm"]')).not.toBeNull();
  });

  it("FactGrid composes column Facts as its children", () => {
    const { container } = render(
      <FactGrid>
        <Fact label="Battery" direction="column">
          38%
        </Fact>
        <Fact label="Root" direction="column" size="sm">
          /var/lib/omakase
        </Fact>
      </FactGrid>,
    );
    const grid = container.firstElementChild;
    expect(grid?.children).toHaveLength(2);
    // Every child is a Fact, and the tile look is the grid's business — so
    // the facts carry only what they were asked for.
    for (const child of Array.from(grid?.children ?? [])) {
      expect(child.getAttribute("data-direction")).toBe("column");
    }
    expect(grid?.children[1]?.getAttribute("data-size")).toBe("sm");
  });
});
