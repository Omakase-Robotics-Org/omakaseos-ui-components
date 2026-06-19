import { render, screen } from "@testing-library/react";
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
