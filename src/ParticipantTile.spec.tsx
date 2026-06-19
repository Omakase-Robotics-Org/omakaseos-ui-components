import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ParticipantTile } from "./ParticipantTile";

describe("ParticipantTile", () => {
  it("renders the name and role via data-role", () => {
    const { container } = render(
      <ParticipantTile name="Operator" role="user" />,
    );
    expect(screen.getByText("Operator")).toBeInTheDocument();
    expect(container.querySelector('[data-role="user"]')).not.toBeNull();
  });

  it("propagates the speaking state via data-speaking", () => {
    const { rerender, container } = render(
      <ParticipantTile name="Bot" role="assistant" />,
    );
    expect(container.querySelector('[data-speaking="true"]')).toBeNull();
    rerender(<ParticipantTile name="Bot" role="assistant" speaking />);
    expect(container.querySelector('[data-speaking="true"]')).not.toBeNull();
  });

  it("disconnected tiles get data-connected=false", () => {
    const { container } = render(
      <ParticipantTile name="Bot" role="assistant" connected={false} />,
    );
    expect(container.querySelector('[data-connected="false"]')).not.toBeNull();
  });

  it("connected defaults to true", () => {
    const { container } = render(
      <ParticipantTile name="Bot" role="assistant" />,
    );
    expect(container.querySelector('[data-connected="true"]')).not.toBeNull();
  });

  it("renders the avatar slot when provided", () => {
    render(
      <ParticipantTile
        name="Bot"
        role="assistant"
        avatar={<span data-testid="custom-avatar">A</span>}
      />,
    );
    expect(screen.getByTestId("custom-avatar")).not.toBeNull();
  });

  it("renders the hint when provided", () => {
    render(
      <ParticipantTile
        name="Bot"
        role="assistant"
        hint={<span>muted</span>}
      />,
    );
    expect(screen.getByText("muted")).not.toBeNull();
  });

  it("forwards data-testid to the wrapper", () => {
    render(
      <ParticipantTile name="Bot" role="assistant" data-testid="t-1" />,
    );
    expect(screen.getByTestId("t-1")).not.toBeNull();
  });
});
