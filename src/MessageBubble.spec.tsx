import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageBubble } from "./MessageBubble";

describe("MessageBubble", () => {
  it("renders the children and propagates role via data-role", () => {
    render(<MessageBubble role="assistant">Hello there.</MessageBubble>);
    expect(screen.getByText("Hello there.")).toBeInTheDocument();
    const row = screen.getByText("Hello there.").closest('[data-role]');
    expect(row?.getAttribute("data-role")).toBe("assistant");
  });

  it("auto-aligns assistant left and user right", () => {
    const { rerender, container } = render(
      <MessageBubble role="assistant">Hi</MessageBubble>,
    );
    expect(container.querySelector('[data-align="left"]')).not.toBeNull();
    rerender(<MessageBubble role="user">Hi</MessageBubble>);
    expect(container.querySelector('[data-align="right"]')).not.toBeNull();
  });

  it("renders system and tool turns full-width by default", () => {
    const { rerender, container } = render(
      <MessageBubble role="system">Session started</MessageBubble>,
    );
    expect(container.querySelector('[data-align="full"]')).not.toBeNull();
    rerender(<MessageBubble role="tool">running…</MessageBubble>);
    expect(container.querySelector('[data-align="full"]')).not.toBeNull();
  });

  it("explicit align overrides role default", () => {
    const { container } = render(
      <MessageBubble role="assistant" align="right">
        Hi
      </MessageBubble>,
    );
    expect(container.querySelector('[data-align="right"]')).not.toBeNull();
  });

  it("renders the streaming caret when streaming is true", () => {
    const { rerender, queryByTestId } = render(
      <MessageBubble role="assistant" streaming>
        partial
      </MessageBubble>,
    );
    expect(queryByTestId("streaming-caret")).not.toBeNull();
    rerender(<MessageBubble role="assistant">complete</MessageBubble>);
    expect(queryByTestId("streaming-caret")).toBeNull();
  });

  it("renders the timestamp when given, hides it when null/undefined", () => {
    const { rerender, queryByText } = render(
      <MessageBubble role="user" timestamp="12:00:01">
        Hi
      </MessageBubble>,
    );
    expect(queryByText("12:00:01")).not.toBeNull();
    rerender(
      <MessageBubble role="user" timestamp={null}>
        Hi
      </MessageBubble>,
    );
    expect(queryByText("12:00:01")).toBeNull();
  });

  it("uses roleLabel when provided, falls back to the role string", () => {
    const { rerender, container } = render(
      <MessageBubble role="user" roleLabel="Customer">
        Hi
      </MessageBubble>,
    );
    expect(container.textContent).toContain("Customer");
    expect(container.textContent).not.toContain("user");
    rerender(<MessageBubble role="user">Hi</MessageBubble>);
    expect(container.textContent).toContain("user");
  });

  it("propagates a tone via data-tone", () => {
    const { container } = render(
      <MessageBubble role="system" tone="warning">
        Network unstable
      </MessageBubble>,
    );
    expect(container.querySelector('[data-tone="warning"]')).not.toBeNull();
  });

  it("forwards arbitrary HTML props (data-testid) to the row", () => {
    render(
      <MessageBubble role="assistant" data-testid="bubble-1">
        Hi
      </MessageBubble>,
    );
    expect(screen.getByTestId("bubble-1")).not.toBeNull();
  });
});
