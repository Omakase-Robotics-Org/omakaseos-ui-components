/**
 * @file Storybook stories for Popover.
 *
 * Controlled + anchored: the story owns `open` and the anchor ref the way a
 * real consumer (a cell's option picker, a header's rename panel) would.
 * The anchor is a plain `<button>` — Popover's own doc says the anchor is
 * "usually the cell/header surface", not necessarily this library's own
 * `Button` — so the demo does not add an unrelated ref-forwarding
 * requirement to `Button` just to have a clickable anchor.
 */
import { useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Popover } from "./Popover";
import { Field } from "./Field";
import { Input } from "./Input";

const meta = {
  title: "Overlay/Popover",
  component: Popover,
  tags: ["autodocs"],
  // Popover has no sensible default props (anchorRef needs a real DOM node)
  // — every story below fully overrides rendering via `render`, so these
  // args exist only to satisfy CSF3's typing, never actually rendered as-is.
  args: {
    open: false,
    anchorRef: { current: null },
    onRequestClose: () => {},
    ariaLabel: "Popover",
    children: null,
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A free-content editing surface: a labeled input, autofocused on open. */
function ContentDemo(props: { align?: "start" | "end" }) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: 48 }}>
      <button type="button" ref={anchorRef} onClick={() => setOpen((value) => !value)}>
        Rename column
      </button>
      <Popover
        open={open}
        anchorRef={anchorRef}
        onRequestClose={() => setOpen(false)}
        ariaLabel="Rename column"
        align={props.align}
      >
        <Field label="Column name">{(id) => <Input id={id} data-autofocus defaultValue="battery_pct" />}</Field>
      </Popover>
    </div>
  );
}

export const Default: Story = {
  render: () => <ContentDemo />,
};

export const AlignEnd: Story = {
  render: () => <ContentDemo align="end" />,
};
