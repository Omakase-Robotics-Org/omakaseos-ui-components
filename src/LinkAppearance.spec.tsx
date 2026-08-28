import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LinkAppearance } from "./LinkAppearance";

describe("LinkAppearance", () => {
  it("renders a plain <a> when asChild is omitted", () => {
    render(<LinkAppearance tone="accent">Robot G1-042</LinkAppearance>);
    const link = screen.getByText("Robot G1-042");
    expect(link.tagName).toBe("A");
  });

  it("asChild clones the child: the child keeps its own className AND gains the appearance class", () => {
    const { container } = render(
      <div data-testid="host">
        <LinkAppearance asChild tone="accent">
          <a href="/robots/g1-042" className="existing-class">
            G1-042
          </a>
        </LinkAppearance>
      </div>,
    );
    const link = screen.getByText("G1-042");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/robots/g1-042");
    expect(link.className.split(" ")).toEqual(
      expect.arrayContaining(["existing-class"]),
    );
    // The className grew — it did not get replaced.
    expect(link.className).not.toBe("existing-class");

    // No wrapper element: the host's only child is the cloned <a> itself.
    const host = container.querySelector('[data-testid="host"]')!;
    expect(host.children).toHaveLength(1);
    expect(host.firstElementChild).toBe(link);
  });

  it("asChild with no existing className still gains the appearance class", () => {
    render(
      <LinkAppearance asChild tone="muted">
        <a href="/robots">Back to robots</a>
      </LinkAppearance>,
    );
    const link = screen.getByText("Back to robots");
    expect(link.className.length).toBeGreaterThan(0);
  });

  it("asChild throws when given two children (no silent take-the-first)", () => {
    // React logs the thrown error to console.error during render; the
    // assertion is only on the throw, so we don't assert on console output.
    expect(() =>
      render(
        <LinkAppearance asChild tone="accent">
          <span>one</span>
          <span>two</span>
        </LinkAppearance>,
      ),
    ).toThrow();
  });

  it("renders both tones with their own class", () => {
    const { container: accentContainer } = render(
      <LinkAppearance tone="accent">Accent</LinkAppearance>,
    );
    const { container: mutedContainer } = render(
      <LinkAppearance tone="muted">Muted</LinkAppearance>,
    );
    const accentLink = accentContainer.querySelector("a")!;
    const mutedLink = mutedContainer.querySelector("a")!;
    expect(accentLink.className).not.toBe(mutedLink.className);
  });
});
