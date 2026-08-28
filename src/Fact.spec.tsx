import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import styles from "./Fact.module.css";
import { Fact, FactColumns, FactGrid, FactList } from "./Fact";

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

  it("keeps the existing span/span semantics outside FactColumns", () => {
    const { container } = render(<Fact label="Connection">Connected</Fact>);
    const fact = container.firstElementChild;

    expect(fact?.querySelector("dt")).toBeNull();
    expect(fact?.querySelector("dd")).toBeNull();
    expect(Array.from(fact?.children ?? []).map((child) => child.tagName)).toEqual([
      "SPAN",
      "SPAN",
    ]);
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

  it("FactColumns renders native dl/dt/dd relationships", () => {
    const { container } = render(
      <FactColumns>
        <Fact label="Name">G1-042</Fact>
        <Fact label="Model">Unitree G1</Fact>
      </FactColumns>,
    );
    const columns = container.querySelector("dl");

    expect(columns).not.toBeNull();
    expect(columns).toHaveClass(styles.columns!);
    expect(columns?.children).toHaveLength(2);
    expect(columns?.children[0]?.children[0]?.tagName).toBe("DT");
    expect(columns?.children[0]?.children[1]?.tagName).toBe("DD");
    expect(columns?.children[0]?.querySelector("dt")).toHaveTextContent("Name");
    expect(columns?.children[0]?.querySelector("dd")).toHaveTextContent("G1-042");
  });

  it("applies muted and missing value tones and positions a hint after the value", () => {
    const { container } = render(
      <FactColumns>
        <Fact label="Default">Reported</Fact>
        <Fact label="Channel" tone="muted">
          OTA
        </Fact>
        <Fact label="Version" tone="missing" hint={<span>not reported</span>}>
          —
        </Fact>
      </FactColumns>,
    );
    const facts = Array.from(container.querySelectorAll("dl > div"));
    const defaultValue = facts[0]?.querySelector("dd");
    const mutedValue = facts[1]?.querySelector("dd");
    const missingValue = facts[2]?.querySelector("dd");

    expect(defaultValue).not.toHaveClass(styles.valueMuted!);
    expect(defaultValue).not.toHaveClass(styles.valueMissing!);
    expect(mutedValue).toHaveClass(styles.valueMuted!);
    expect(missingValue).toHaveClass(styles.valueMissing!);
    expect(facts[1]).toHaveAttribute("data-tone", "muted");
    expect(facts[2]).toHaveAttribute("data-tone", "missing");
    expect(missingValue?.children[1]).toHaveClass(styles.hint!);
    expect(missingValue?.children[1]).toHaveTextContent("not reported");
  });

  it("FactColumns scope wins inside a FactGrid", () => {
    const { container } = render(
      <FactGrid>
        <FactColumns>
          <Fact label="Scoped">value</Fact>
        </FactColumns>
      </FactGrid>,
    );
    const fact = container.querySelector("dl")?.firstElementChild;

    expect(fact?.parentElement?.tagName).toBe("DL");
    expect(Array.from(fact?.children ?? []).map((child) => child.tagName)).toEqual(["DT", "DD"]);
  });
});
