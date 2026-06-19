import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toolbar } from "./Toolbar";

describe("Toolbar", () => {
  it("exposes role=toolbar with the given aria-label", () => {
    render(
      <Toolbar ariaLabel="filters">
        <button>Apply</button>
      </Toolbar>,
    );
    const tb = screen.getByRole("toolbar", { name: "filters" });
    expect(tb).toBeInTheDocument();
  });

  it("propagates align via data-align", () => {
    const { container } = render(
      <Toolbar align="between">
        <span>a</span>
      </Toolbar>,
    );
    expect(container.querySelector('[data-align="between"]')).not.toBeNull();
  });

  it("renders all children unchanged (does not wrap them)", () => {
    render(
      <Toolbar>
        <button>One</button>
        <button>Two</button>
        <button>Three</button>
      </Toolbar>,
    );
    expect(screen.getByRole("button", { name: "One" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Two" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Three" })).toBeInTheDocument();
  });
});
