import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Card, CardHeader } from "./Card";
import { Panel } from "./Panel";

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
 * "Elevation is not nested" is a CSS ancestor rule, and jsdom resolves no
 * stylesheet, so the visual half (shadow gone, border stepped down) is proved
 * in a real browser by `spec/elevation-nesting.e2e.spec.ts`. What is provable
 * here — and worth pinning, because it is what the browser rule stands on — is
 * the pairing: Panel renders exactly one scope marker, a nested Card really is
 * a descendant of it, and Card's stylesheet keys off that same marker. Rename
 * the attribute on either side and this fails instead of silently resolving to
 * nothing.
 */
describe("Card inside a Panel — elevation is not nested", () => {
  /** The data-* markers Panel actually puts on the element holding its children. */
  function panelBodyMarkers(): string[] {
    const { unmount } = render(<Panel title="Robot state">scope probe</Panel>);
    const body = screen.getByText("scope probe");
    const markers = Array.from(body.attributes)
      .map((attribute) => attribute.name)
      .filter((name) => name.startsWith("data-"));
    unmount();
    return markers;
  }

  it("puts the nested card inside the panel's scope, with no change to the call shape", () => {
    const { container } = render(
      <Panel title="Robot state">
        <Card title="Pose">x: 1.204 m</Card>
      </Panel>,
    );
    const scope = container.querySelector("[data-panel-body]");
    const card = screen.getByText("x: 1.204 m").closest("section");
    expect(scope).not.toBeNull();
    expect(card).not.toBeNull();
    expect(scope?.contains(card as Node)).toBe(true);
  });

  it("declares the scope with exactly one marker attribute", () => {
    expect(panelBodyMarkers()).toEqual(["data-panel-body"]);
  });

  it("keys the demotion off that marker, and demotes only the two elevation properties", () => {
    const [marker] = panelBodyMarkers();
    const css = readFileSync(resolve(__dirname, "Card.module.css"), "utf8");
    const rule = new RegExp(
      `:global\\(\\[${marker}\\]\\)\\s+\\.card\\s*\\{([^}]*)\\}`,
      "u",
    ).exec(css);
    expect(rule).not.toBeNull();

    const declarations = (rule?.[1] ?? "")
      .split(";")
      .map((declaration) => declaration.trim())
      .filter((declaration) => declaration.length > 0);
    // Shadow dropped, border one rung down — and nothing else. The radius and
    // the header's type scale stay put, so the nested card keeps the same shape
    // and the same title as a bare one.
    expect(declarations).toEqual([
      "border-color: var(--ds-border-subtle)",
      "box-shadow: none",
    ]);
  });
});
