/**
 * @file Storybook stories for ConfirmDialog.
 *
 * Presentational-only: no async lifecycle lives here (see the component's
 * own header). `Busy` fakes an in-flight confirm with a local timeout so
 * the story is self-contained.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ConfirmDialog } from "./ConfirmDialog";
import { Button } from "./Button";

const meta = {
  title: "Overlay/ConfirmDialog",
  component: ConfirmDialog,
  tags: ["autodocs"],
  args: {
    open: false,
    title: "Delete robot",
    body: "This cannot be undone.",
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
    closeLabel: "Close",
    onConfirm: () => {},
    onCancel: () => {},
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: 48 }}>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete robot
      </Button>
      <ConfirmDialog
        open={open}
        title="Delete robot"
        body='"warehouse-loop-3" will be permanently removed from the fleet.'
        confirmLabel="Delete"
        cancelLabel="Cancel"
        closeLabel="Close"
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

function BusyDemo() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ padding: 48 }}>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete robot
      </Button>
      <ConfirmDialog
        open={open}
        title="Delete robot"
        body='"warehouse-loop-3" will be permanently removed from the fleet.'
        confirmLabel="Delete"
        cancelLabel="Cancel"
        closeLabel="Close"
        busy={busy}
        onConfirm={() => {
          setBusy(true);
          window.setTimeout(() => {
            setBusy(false);
            setOpen(false);
          }, 1500);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <Demo />,
};

export const Busy: Story = {
  render: () => <BusyDemo />,
};
