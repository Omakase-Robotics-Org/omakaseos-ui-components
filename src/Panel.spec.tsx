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

  it("passes id through to the section so the page can anchor to it", () => {
    const { container } = render(
      <Panel title="A" id="robot-state">
        body
      </Panel>,
    );
    expect(container.querySelector("section")?.id).toBe("robot-state");
  });
});
