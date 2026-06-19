import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Heading } from "./Heading";

describe("Heading", () => {
  it("renders the right element for each level", () => {
    const { rerender } = render(<Heading level={1}>A</Heading>);
    expect(screen.getByRole("heading", { level: 1, name: "A" })).toBeInTheDocument();
    rerender(<Heading level={2}>B</Heading>);
    expect(screen.getByRole("heading", { level: 2, name: "B" })).toBeInTheDocument();
    rerender(<Heading level={3}>C</Heading>);
    expect(screen.getByRole("heading", { level: 3, name: "C" })).toBeInTheDocument();
    rerender(<Heading level={4}>D</Heading>);
    expect(screen.getByRole("heading", { level: 4, name: "D" })).toBeInTheDocument();
  });

  it("propagates data-level for typographic styling", () => {
    const { container } = render(<Heading level={3}>Title</Heading>);
    expect(container.querySelector('[data-level="3"]')).not.toBeNull();
  });

  it("opt-in truncation flips data-truncate", () => {
    const { container, rerender } = render(<Heading level={2}>X</Heading>);
    expect(container.querySelector('[data-truncate="true"]')).toBeNull();
    rerender(
      <Heading level={2} truncate>
        X
      </Heading>,
    );
    expect(container.querySelector('[data-truncate="true"]')).not.toBeNull();
  });
});
