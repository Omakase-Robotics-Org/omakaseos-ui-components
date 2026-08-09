import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Section, SectionHeader } from "./Section";
import { Panel } from "./Panel";

describe("Section + SectionHeader", () => {
  it("wraps children in a section element", () => {
    const { container } = render(<Section>body</Section>);
    expect(container.querySelector("section")).not.toBeNull();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("accepts the title shorthand", () => {
    render(<Section title="Language override">auto</Section>);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Language override");
    expect(screen.getByText("auto")).toBeInTheDocument();
  });

  it("accepts the two-piece shape, with hint and right slot", () => {
    render(
      <Section>
        <SectionHeader title="Turn" hint="last update: 2s ago" right={<span>R</span>} />
        body
      </Section>,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Turn");
    expect(screen.getByText("last update: 2s ago")).toBeInTheDocument();
    expect(screen.getByText("R")).toBeInTheDocument();
  });

  it("omits the heading entirely when no title is given", () => {
    const { container } = render(<Section>just content</Section>);
    expect(container.querySelector("header")).toBeNull();
  });

  it("renders the same, in a panel body or outside one", () => {
    // A Section is not panel-specific: nothing in it reads its surroundings.
    // This is the property the rejected v0.13 ancestor rule could not have —
    // there, one call rendered as two different things depending on position.
    const standalone = render(<Section title="Prompt">say hello</Section>);
    const standaloneHtml = standalone.container.innerHTML;
    standalone.unmount();

    const nested = render(
      <Panel title="Conversation state">
        <Section title="Prompt">say hello</Section>
      </Panel>,
    );
    const inPanel = nested.container.querySelector("[data-panel-body]")?.innerHTML;
    expect(inPanel).toBe(standaloneHtml);
  });
});

/**
 * The rhythm that holds one section apart from the next is each section's own
 * padding, not a separator between adjacent ones (`.section + .section`, a
 * hairline or a margin). That is not a style preference: in the consumer,
 * sibling sections are not reliably adjacent siblings in the DOM —
 * `ConversationStatePanel` interleaves an `ApiUnavailable` between two of them,
 * and `NavigationPanel` lays two side by side in a two-column grid. A
 * sibling-combinator rule would go silently vacuous in the first case and draw
 * a line across the wrong edge in the second, and neither failure is visible
 * from this library. The e2e measures the consequence (a wrapped and an
 * unwrapped section keep the same gap); this pins the cause.
 */
describe("Section's rhythm is its own, not a rule about neighbours", () => {
  const selectors = readFileSync(resolve(__dirname, "Section.module.css"), "utf8")
    .replaceAll(/\/\*[\s\S]*?\*\//gu, "")
    .split("}")
    .map((block) => block.split("{")[0]?.trim() ?? "")
    .filter((selector) => selector.length > 0);

  it("parses the module's selectors (guard sanity)", () => {
    expect(selectors).toContain(".section");
  });

  it("uses no sibling combinator, and reads no ancestor", () => {
    expect(selectors.filter((selector) => /[+~]/u.test(selector))).toEqual([]);
    expect(selectors.filter((selector) => selector.includes("data-panel-body"))).toEqual([]);
  });
});
