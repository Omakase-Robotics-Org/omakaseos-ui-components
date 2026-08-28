import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("renders a non-empty URL as an image with the name as alt text", () => {
    const { container } = render(
      <Avatar url="https://example.test/operator.png" name="Operator" size="md" />,
    );
    const image = screen.getByRole("img", { name: "Operator" });
    const tile = container.firstElementChild;

    expect(image).toHaveAttribute("src", "https://example.test/operator.png");
    expect(image).toHaveAttribute("alt", "Operator");
    expect(tile?.getAttribute("role")).toBeNull();
    expect(tile?.getAttribute("data-fallback")).toBeNull();
  });

  it("uses the fallback branch for an empty URL", () => {
    const { container } = render(<Avatar url="" name="Missing image" size="sm" />);
    const tile = screen.getByRole("img", { name: "Missing image" });

    expect(tile).toHaveAttribute("data-fallback", "glyph");
    expect(tile).toHaveAttribute("data-size", "sm");
    expect(container.querySelector("img")).toBeNull();
  });

  it("names the fallback tile from name and renders the default silhouette", () => {
    render(<Avatar url={null} name="Robot identity" size="lg" />);
    const tile = screen.getByRole("img", { name: "Robot identity" });
    const silhouette = tile.querySelector("svg");

    expect(tile).toHaveAttribute("data-fallback", "glyph");
    expect(tile).not.toHaveAttribute("data-kind");
    expect(silhouette).not.toBeNull();
    expect(silhouette).toHaveAttribute("aria-hidden", "true");
    expect(silhouette).toHaveAttribute("focusable", "false");
    expect(silhouette?.querySelector("path")).not.toBeNull();
  });

  it("renders a custom fallback instead of the default silhouette", () => {
    render(
      <Avatar
        url={null}
        name="Custom identity"
        size="md"
        fallback={<span data-testid="custom-fallback">OP</span>}
      />,
    );
    const tile = screen.getByRole("img", { name: "Custom identity" });

    expect(screen.getByTestId("custom-fallback")).toHaveTextContent("OP");
    expect(tile.querySelector("svg")).toBeNull();
  });

  it("propagates each requested tile size", () => {
    const sizes = ["xs", "sm", "md", "lg"] as const;
    const { container } = render(
      <>
        {sizes.map((size) => (
          <Avatar key={size} url={null} name={size} size={size} />
        ))}
      </>,
    );

    expect(
      Array.from(container.querySelectorAll("[data-size]")).map((tile) =>
        tile.getAttribute("data-size"),
      ),
    ).toEqual(sizes);
  });
});
