/**
 * @file Storybook stories for EditHandle.
 *
 * Two contracts are on show, and they are deliberately different axes:
 *
 *  - `kind` is the SHAPE. A square anchor is a coordinate on a path; a place is
 *    the same square rotated into a diamond. Never a size difference.
 *  - `state` is the FILL. Every state below is the same 7px mark; only its fill
 *    and stroke move. The `Vocabulary` story puts the whole matrix in one frame,
 *    which is where a size creeping back into a state would be obvious.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { EditHandle } from "./EditHandle";
import {
  DirectManipulationStoryCanvas,
  renderDirectManipulationGlyphInStoryCanvas,
} from "./DirectManipulationStoryCanvas";

const meta = {
  title: "DirectManipulation/EditHandle",
  component: EditHandle,
  tags: ["autodocs"],
  argTypes: {
    kind: {
      control: { type: "inline-radio" },
      options: ["anchor", "place"],
    },
    state: {
      control: { type: "inline-radio" },
      options: ["idle", "hover", "selected", "primary", "dragging"],
    },
  },
} satisfies Meta<typeof EditHandle>;

export default meta;
type Story = StoryObj<typeof meta>;

const renderHandle = renderDirectManipulationGlyphInStoryCanvas(EditHandle);

const STATES = ["idle", "hover", "selected", "primary", "dragging"] as const;

export const Idle: Story = {
  args: { x: 90, y: 60, kind: "anchor", state: "idle" },
  render: renderHandle,
};

export const Hover: Story = {
  args: { x: 90, y: 60, kind: "anchor", state: "hover" },
  render: renderHandle,
};

/** Selected is a FILLED anchor, at the idle anchor's exact size. */
export const Selected: Story = {
  args: { x: 90, y: 60, kind: "anchor", state: "selected" },
  render: renderHandle,
};

/**
 * Selected AND the selection's primary: the thin outer ring says this is the
 * member that owns the heading knob and any single-target command. The ring is
 * an annotation at a fixed radius; the anchor inside it is unchanged.
 */
export const Primary: Story = {
  args: { x: 90, y: 60, kind: "place", state: "primary", heading: 0 },
  render: renderHandle,
};

export const Dragging: Story = {
  args: { x: 90, y: 60, kind: "place", state: "dragging", heading: -Math.PI / 4 },
  render: renderHandle,
};

/**
 * The whole vocabulary in one frame: places (diamonds, with their facing) on the
 * top row, anchors (squares) on the bottom, one column per state. Every mark
 * here is the same size; if one row or column ever looks larger, a state has
 * started carrying geometry again.
 */
export const Vocabulary: Story = {
  args: { x: 90, y: 60, kind: "place", state: "idle" },
  render: () => (
    <DirectManipulationStoryCanvas>
      {STATES.map((state, index) => (
        <EditHandle
          key={`place-${state}`}
          x={24 + index * 33}
          y={40}
          kind="place"
          state={state}
          heading={0}
        />
      ))}
      {STATES.map((state, index) => (
        <EditHandle
          key={`anchor-${state}`}
          x={24 + index * 33}
          y={84}
          kind="anchor"
          state={state}
        />
      ))}
    </DirectManipulationStoryCanvas>
  ),
};
