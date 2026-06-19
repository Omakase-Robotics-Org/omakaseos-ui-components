import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Fact, FactList } from "./Fact";

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
});
