import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LiveCaption } from "./LiveCaption";

describe("LiveCaption", () => {
  it("renders speaker and text", () => {
    render(<LiveCaption speaker="Bot" role="assistant" text="Hello." />);
    expect(screen.getByText("Bot")).not.toBeNull();
    expect(screen.getByText("Hello.")).not.toBeNull();
  });

  it("propagates role via data-role", () => {
    const { container } = render(
      <LiveCaption speaker="Bot" role="assistant" text="Hi" />,
    );
    expect(container.querySelector('[data-role="assistant"]')).not.toBeNull();
  });

  it("renders aria-live=polite as a status region", () => {
    render(<LiveCaption speaker="Bot" role="assistant" text="Hi" />);
    const node = screen.getByRole("status");
    expect(node.getAttribute("aria-live")).toBe("polite");
  });

  it("draws the caret when streaming, hides it otherwise", () => {
    const { rerender, queryByTestId } = render(
      <LiveCaption speaker="Bot" role="assistant" text="part" streaming />,
    );
    expect(queryByTestId("live-caption-caret")).not.toBeNull();
    rerender(<LiveCaption speaker="Bot" role="assistant" text="done" />);
    expect(queryByTestId("live-caption-caret")).toBeNull();
  });

  it("propagates streaming via data-streaming", () => {
    const { container } = render(
      <LiveCaption speaker="Bot" role="assistant" text="part" streaming />,
    );
    expect(container.querySelector('[data-streaming="true"]')).not.toBeNull();
  });
});
