import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Panel } from "./Panel";

describe("Panel", () => {
  it("titles itself with a real heading, so a page of panels has an outline", () => {
    render(<Panel title="Robot State">body</Panel>);
    expect(screen.getByRole("heading", { level: 2, name: "Robot State" })).toBeInTheDocument();
  });

  it("renders its body", () => {
    render(<Panel title="Robot State">measurements</Panel>);
    expect(screen.getByText("measurements")).toBeInTheDocument();
  });

  it("puts headerRight in the header, alongside the title", () => {
    render(
      <Panel title="Robot State" headerRight={<button type="button">Restart</button>}>
        body
      </Panel>,
    );
    const heading = screen.getByRole("heading", { level: 2 });
    const control = screen.getByRole("button", { name: "Restart" });
    expect(heading.parentElement).toBe(control.parentElement);
  });

  it("reports the grid-spanning request as an attribute, and omits it by default", () => {
    const { container, rerender } = render(<Panel title="A">body</Panel>);
    const section = container.querySelector("section");
    expect(section?.hasAttribute("data-full-width")).toBe(false);
    rerender(
      <Panel title="A" fullWidth>
        body
      </Panel>,
    );
    expect(container.querySelector("section")?.getAttribute("data-full-width")).toBe("true");
  });

  /**
   * The marker is no longer a style hook (v0.14 removed the ancestor rule that
   * read it, and the nesting contract is a React context — see
   * `PanelScope.spec.tsx`). It stays because it is how a panel's *content* is
   * addressed from outside this library: omksos_web's browser-level container
   * scan and the consuming apps' specs both select by it. Dropping it would
   * break them silently, so it is pinned here as a shipped attribute.
   */
  it("marks its body, so a panel's content can be addressed from outside", () => {
    const { container } = render(<Panel title="A">contents</Panel>);
    const body = container.querySelector("[data-panel-body]");
    expect(body).not.toBeNull();
    // The children are inside the marked element; the header (and its
    // headerRight slot, which is chrome of the section, not content within it)
    // is not.
    expect(body).toHaveTextContent("contents");
    expect(body?.contains(screen.getByRole("heading", { level: 2 }))).toBe(false);
  });

  it("keeps headerRight outside it — the header is the section's own chrome", () => {
    const { container } = render(
      <Panel title="A" headerRight={<button type="button">Restart</button>}>
        contents
      </Panel>,
    );
    const body = container.querySelector("[data-panel-body]");
    expect(body?.contains(screen.getByRole("button", { name: "Restart" }))).toBe(false);
  });

  it("passes id through to the section so the page can anchor to it", () => {
    const { container } = render(
      <Panel title="A" id="robot-state">
        body
      </Panel>,
    );
    expect(container.querySelector("section")?.id).toBe("robot-state");
  });
});
