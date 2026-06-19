import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConversationStage, pickStageColumns } from "./ConversationStage";
import { ParticipantTile } from "./ParticipantTile";

describe("pickStageColumns", () => {
  it("1 → 1 col", () => {
    expect(pickStageColumns(1)).toBe(1);
    expect(pickStageColumns(0)).toBe(1);
  });
  it("2..4 → 2 col", () => {
    expect(pickStageColumns(2)).toBe(2);
    expect(pickStageColumns(3)).toBe(2);
    expect(pickStageColumns(4)).toBe(2);
  });
  it("5..9 → 3 col", () => {
    expect(pickStageColumns(5)).toBe(3);
    expect(pickStageColumns(7)).toBe(3);
    expect(pickStageColumns(9)).toBe(3);
  });
  it("≥10 → 4 col (capped)", () => {
    expect(pickStageColumns(10)).toBe(4);
    expect(pickStageColumns(99)).toBe(4);
  });
});

describe("ConversationStage", () => {
  it("renders the tiles inside the grid in order", () => {
    render(
      <ConversationStage
        tileCount={2}
        tiles={[
          <ParticipantTile key="op" name="Operator" role="user" />,
          <ParticipantTile key="bot" name="Bot" role="assistant" />,
        ]}
      />,
    );
    const grid = screen.getByTestId("stage-grid");
    expect(grid.children.length).toBe(2);
    expect(grid.children[0]?.textContent).toContain("Operator");
    expect(grid.children[1]?.textContent).toContain("Bot");
  });

  it("propagates the column count via data-columns and inline grid template", () => {
    const { rerender, container } = render(
      <ConversationStage
        tileCount={1}
        tiles={[<ParticipantTile key="a" name="A" role="user" />]}
      />,
    );
    const stage1 = container.querySelector('[data-columns="1"]');
    expect(stage1).not.toBeNull();
    expect(
      (stage1?.querySelector('[data-testid="stage-grid"]') as HTMLElement)?.style.gridTemplateColumns,
    ).toContain("repeat(1");

    rerender(
      <ConversationStage
        tileCount={5}
        tiles={Array.from({ length: 5 }, (_, i) => (
          <ParticipantTile key={String(i)} name={String(i)} role="user" />
        ))}
      />,
    );
    expect(container.querySelector('[data-columns="3"]')).not.toBeNull();
  });

  it("renders the caption only when given", () => {
    const { rerender, queryByTestId } = render(
      <ConversationStage tileCount={0} tiles={null} />,
    );
    expect(queryByTestId("stage-caption")).toBeNull();
    rerender(
      <ConversationStage tileCount={0} tiles={null} caption={<span>cap</span>} />,
    );
    expect(queryByTestId("stage-caption")).not.toBeNull();
  });

  it("renders the toolbar slot only when given", () => {
    const { container } = render(
      <ConversationStage
        tileCount={0}
        tiles={null}
        toolbar={<button>Mute</button>}
      />,
    );
    expect(container.querySelector("button")?.textContent).toBe("Mute");
  });

  it("uses the default ariaLabel and accepts an override", () => {
    const { rerender, container } = render(
      <ConversationStage tileCount={0} tiles={null} />,
    );
    expect(
      container.querySelector("section")?.getAttribute("aria-label"),
    ).toBe("live conversation");
    rerender(
      <ConversationStage
        tileCount={0}
        tiles={null}
        ariaLabel="robot-call-stage"
      />,
    );
    expect(
      container.querySelector("section")?.getAttribute("aria-label"),
    ).toBe("robot-call-stage");
  });
});
