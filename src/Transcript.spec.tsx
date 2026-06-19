import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageBubble } from "./MessageBubble";
import { Transcript } from "./Transcript";

describe("Transcript", () => {
  it("renders an ordered list of children", () => {
    render(
      <Transcript ariaLabel="conversation">
        <MessageBubble role="user">Hi</MessageBubble>
        <MessageBubble role="assistant">Hello</MessageBubble>
      </Transcript>,
    );
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(list.getAttribute("aria-label")).toBe("conversation");
    expect(list.querySelectorAll("li").length).toBe(2);
  });

  it("preserves chronological order — first child becomes first li", () => {
    render(
      <Transcript>
        <MessageBubble role="user">first</MessageBubble>
        <MessageBubble role="assistant">second</MessageBubble>
      </Transcript>,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]?.textContent).toContain("first");
    expect(items[1]?.textContent).toContain("second");
  });

  it("accepts a single child without crashing", () => {
    render(
      <Transcript>
        <MessageBubble role="system">Started</MessageBubble>
      </Transcript>,
    );
    expect(screen.getAllByRole("listitem").length).toBe(1);
  });

  it("forwards data-testid to the ol", () => {
    render(
      <Transcript data-testid="conv-1">
        <MessageBubble role="user">Hi</MessageBubble>
      </Transcript>,
    );
    expect(screen.getByTestId("conv-1").tagName).toBe("OL");
  });
});
