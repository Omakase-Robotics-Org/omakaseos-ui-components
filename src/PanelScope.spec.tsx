/**
 * @file The container-nesting contract (v0.14), proved where it is enforced.
 *
 * A `Panel` is a surface; so is a `Card`. One inside the other is a frame
 * inside a frame, and the reader has to count boxes to know what contains what.
 * v0.12 answered that by relaxing the nested recipe and v0.13 by removing the
 * surface from it; both were rejected on the ground that repainting a violation
 * until it looks legal leaves the structure in place and makes the call site
 * lie (omksos_web `reports/monitor-scope-coherence/`, ruling B).
 *
 * v0.14 refuses it instead, and offers `Section` — a heading, its content, and
 * the rhythm around it, drawing no surface — as the grouping a panel body does
 * take. The refusal is a throw during render, the same shape as the
 * `useX must be used inside XProvider` throws a consumer already knows, so a
 * violation is a loud failure at the point of composition rather than a layout
 * that looks slightly wrong. jsdom is enough to see all of it, because the
 * contract is about the React tree and not about pixels.
 */
import { render, screen } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Card } from "./Card";
import { Panel } from "./Panel";
import { PanelScope } from "./PanelScope";
import { Section } from "./Section";

/**
 * The testing-library way to observe a render-time throw: let a boundary catch
 * it, because that is also how a consuming app would meet it. `toThrow()` on
 * `render()` happens to work in React 19 as well, but it says nothing about the
 * error being catchable, which is the difference between a broken panel and a
 * blank page.
 */
class ErrorBoundary extends Component<
  { children: ReactNode; onError: (error: Error) => void },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  override render() {
    return this.state.failed ? <p>boundary caught the error</p> : this.props.children;
  }
}

/** Renders `node` under a boundary and returns the error it threw, if any. */
function renderCatching(node: ReactNode): Error | null {
  const errors: Error[] = [];
  render(<ErrorBoundary onError={(error) => errors.push(error)}>{node}</ErrorBoundary>);
  return errors[0] ?? null;
}

describe("a Panel body refuses a container", () => {
  beforeEach(() => {
    // React reports a caught render error on console.error; the throws below
    // are the subject of these tests, not noise to be read in the output.
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when a Card is composed into a panel, naming Section as the way", () => {
    const error = renderCatching(
      <Panel title="Conversation state">
        <Card title="Prompt">say hello</Card>
      </Panel>,
    );
    expect(error?.message).toBe(
      "Card must not nest inside a Panel — use Section for grouping within a panel",
    );
    expect(screen.getByText("boundary caught the error")).toBeInTheDocument();
  });

  it("throws for a Card at any depth — it is composition, not adjacency", () => {
    // A wrapper element is exactly what made the v0.13 CSS rule go quiet. Here
    // the scope is the React tree, so a <div> in the way changes nothing.
    const error = renderCatching(
      <Panel title="Navigation">
        <div>
          <div>
            <Card title="Pose">x: 1.204 m</Card>
          </div>
        </div>
      </Panel>,
    );
    expect(error?.message).toContain("Card must not nest inside a Panel");
  });

  it("throws when a Panel is composed into another Panel", () => {
    const error = renderCatching(
      <Panel title="Navigation">
        <Panel title="Map selection">a list of maps</Panel>
      </Panel>,
    );
    expect(error?.message).toBe(
      "Panel must not nest inside another Panel — use Section for grouping within a panel, or a sibling Panel in the page grid",
    );
  });
});

describe("what a Panel body does take", () => {
  it("renders a Section inside a panel", () => {
    render(
      <Panel title="Conversation state">
        <Section title="Prompt">say hello</Section>
      </Panel>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Prompt" })).toBeInTheDocument();
  });

  it("renders a Card outside any panel", () => {
    render(<Card title="Prompt">say hello</Card>);
    expect(screen.getByRole("heading", { level: 2, name: "Prompt" })).toBeInTheDocument();
  });

  it("renders a Section on its own — it is a group, not a panel part", () => {
    render(<Section title="Prompt">say hello</Section>);
    expect(screen.getByRole("heading", { level: 2, name: "Prompt" })).toBeInTheDocument();
  });

  it("renders a Card in headerRight — the header is the panel's own chrome", () => {
    // headerRight is created by the caller and rendered in the panel's header,
    // outside the scope: chrome belonging to the panel rather than content
    // within it, in the contract exactly as in the DOM.
    const { container } = render(
      <Panel title="Conversation state" headerRight={<Card title="Prompt">say hello</Card>}>
        body
      </Panel>,
    );
    const card = screen.getByRole("heading", { level: 2, name: "Prompt" }).closest("section");
    expect(card).not.toBeNull();
    expect(container.querySelector("[data-panel-body]")?.contains(card as Node)).toBe(false);
  });
});

/**
 * The contract is the context, and only the context. Two experiments say so —
 * one removing the context while keeping everything else, one supplying it
 * alone — because a check that passes for the wrong reason is a check that will
 * quietly stop holding.
 */
describe("the scope is what is read, not the DOM", () => {
  it("does not throw for the marker alone — `data-panel-body` is not the contract", () => {
    // The attribute Panel puts on its body still exists (the browser-level
    // container scan and consumer specs address a panel's content by it). If
    // the throws above were keyed off THAT, this would fail — and every case in
    // the first block would be passing for a reason nobody stated.
    render(
      <div data-panel-body="">
        <Card title="Prompt">say hello</Card>
      </div>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Prompt" })).toBeInTheDocument();
  });

  it("throws inside the scope alone, with no Panel and no marker in sight", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = renderCatching(
      <PanelScope>
        <Card title="Prompt">say hello</Card>
      </PanelScope>,
    );
    expect(error?.message).toContain("Card must not nest inside a Panel");
    vi.restoreAllMocks();
  });
});

/**
 * Portals are where "composed into" and "sits inside" come apart, in both
 * directions. Neither behaviour is incidental — they are what choosing context
 * over a DOM ancestor means, and a call site can meet either.
 */
describe("portals: the contract follows composition", () => {
  it("throws for a Card rendered inside a panel but portalled out of it", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    function OverlayLayer({ children }: { children: ReactNode }) {
      return createPortal(children, document.body);
    }
    const error = renderCatching(
      <Panel title="Navigation">
        <OverlayLayer>
          <Card title="Record a map">wizard</Card>
        </OverlayLayer>
      </Panel>,
    );
    // React context passes through a portal, so this is refused even though the
    // card's DOM is nowhere near the panel. It was composed as part of the
    // panel's content; an overlay belongs to a layer the host owns.
    expect(error?.message).toContain("Card must not nest inside a Panel");
    vi.restoreAllMocks();
  });

  it("allows a Card rendered outside a panel and portalled into its body", () => {
    const { container } = render(<Panel title="Navigation">panel content</Panel>);
    const body = container.querySelector("[data-panel-body]");
    expect(body).not.toBeNull();

    // A second root: this card is not part of the panel's React tree at all.
    render(<>{createPortal(<Card title="Prompt">say hello</Card>, body as Element)}</>);

    const card = screen.getByRole("heading", { level: 2, name: "Prompt" }).closest("section");
    expect(body?.contains(card as Node)).toBe(true);
  });
});
