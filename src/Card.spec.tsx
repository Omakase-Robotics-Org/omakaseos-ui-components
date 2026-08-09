import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Card, CardHeader } from "./Card";

describe("Card + CardHeader", () => {
  it("wraps children in a section", () => {
    const { container } = render(<Card>body</Card>);
    expect(container.querySelector("section")).not.toBeNull();
  });

  it("renders title and hint and right slot", () => {
    render(
      <Card>
        <CardHeader title="Robot State" hint="last update: 2s ago" right={<span>R</span>} />
      </Card>,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Robot State");
    expect(screen.getByText("last update: 2s ago")).toBeInTheDocument();
    expect(screen.getByText("R")).toBeInTheDocument();
  });

  it("accepts a title shorthand (omks-robo/web shape)", () => {
    render(<Card title="Robot State">body</Card>);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Robot State");
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("omits hint and right when not given", () => {
    render(
      <Card>
        <CardHeader title="Plain" />
      </Card>,
    );
    expect(screen.queryByText("last update: 2s ago")).toBeNull();
  });
});

/**
 * The nesting contract itself (a Card inside a Panel throws, and what is legal
 * instead) is proved in `PanelScope.spec.tsx`, where all three containers are
 * in one place. What belongs here is the other half of that decision: the
 * stylesheet must not grow a second, silent answer.
 *
 * v0.12 stepped the recipe down inside a panel body and v0.13 removed the
 * surface there, both through `:global([data-panel-body]) .card`. Both were
 * rejected — a component that changes shape according to an ancestor makes its
 * call site lie, and repainting a nested container until it reads as legal
 * keeps the structure the rule existed to prevent (omksos_web
 * `reports/monitor-scope-coherence/`, ruling B). Reintroducing such a rule
 * would restore the rejected behaviour without touching a single line of
 * TypeScript, and nothing else in this repo would notice. So it is pinned:
 * a Card looks the same everywhere it is allowed.
 */
describe("Card's stylesheet answers to nothing but the card", () => {
  function selectorsOf(module: string): string[] {
    const css = readFileSync(resolve(__dirname, module), "utf8");
    return css
      .replaceAll(/\/\*[\s\S]*?\*\//gu, "")
      .split("}")
      .map((block) => block.split("{")[0]?.trim() ?? "")
      .filter((selector) => selector.length > 0);
  }

  it("parses the module's selectors (guard sanity)", () => {
    // Without this, a parser that returned [] would make the pin below vacuous.
    expect(selectorsOf("Card.module.css")).toContain(".card");
  });

  it("keys nothing off where the card sits", () => {
    // Any ancestor/sibling combinator, and any mention of Panel's scope marker,
    // would be a context-dependent restyling — v0.12 / v0.13's mechanism.
    for (const selector of selectorsOf("Card.module.css")) {
      expect(selector).not.toMatch(/[\s>+~]/u);
      expect(selector).not.toContain("data-panel-body");
    }
  });
});
