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
 * "A nested Card is a section" is a CSS ancestor rule, and jsdom resolves no
 * stylesheet, so the visual half (surface gone, section rhythm in its place) is
 * proved in a real browser by `spec/nested-card-sections.e2e.spec.ts`. What is
 * provable here — and worth pinning, because it is what the browser rule stands
 * on — is the pairing: Panel renders exactly one scope marker, a nested Card
 * really is a descendant of it, and Card's stylesheet keys off that same
 * marker. Rename the attribute on either side and this fails instead of
 * silently resolving to nothing.
 */
describe("Card inside a Panel — a nested card is a section", () => {
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

  it("keys the rule off that marker, and drops every property that draws a surface", () => {
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
    // The four properties that make a Card a surface are dropped — outline,
    // corner, fill, lift — and the fifth replaces the frame's inset with the
    // section rhythm (0 across, so a section heading lands on the panel title's
    // own column). Everything CardHeader draws stays put: the title is the only
    // containment signal left, so it is not also stepped down.
    expect(declarations).toEqual([
      "border: none",
      "border-radius: 0",
      "background: transparent",
      "box-shadow: none",
      "padding: var(--ds-space-xl) 0",
    ]);
  });

  /**
   * The rhythm is stated as each section's OWN padding, not as a separator
   * between adjacent siblings (`.card + .card`). That is not a style
   * preference: on the consumer, sibling sections are not reliably adjacent
   * siblings in the DOM — `ConversationStatePanel` interleaves an
   * `ApiUnavailable` between two of its cards, and `NavigationPanel` lays two of
   * them side by side in a two-column grid. A sibling-combinator rule would go
   * silently vacuous in the first case and draw a line across the wrong edge in
   * the second, and neither failure is visible from this library. So the
   * selector is pinned here: the rule must not acquire one.
   */
  it("states the rhythm per section, not as a rule about adjacent siblings", () => {
    const css = readFileSync(resolve(__dirname, "Card.module.css"), "utf8");
    const selectors = css
      .replaceAll(/\/\*[\s\S]*?\*\//gu, "")
      .split("}")
      .map((block) => block.split("{")[0]?.trim() ?? "")
      .filter((selector) => selector.length > 0);
    expect(selectors.filter((selector) => /[+~]/u.test(selector))).toEqual([]);
  });
});
