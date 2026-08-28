/**
 * @file Storybook stories for Dialog.
 *
 * Each story owns `open` locally (a native `<dialog>` needs a real
 * showModal()/close() lifecycle, so a story renders a trigger button
 * rather than defaulting to `open: true`).
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Dialog } from "./Dialog";
import { Button } from "./Button";

const meta = {
  title: "Overlay/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  args: {
    open: false,
    title: "Dialog",
    closeLabel: "Close",
    onClose: () => {},
    children: null,
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function BasicDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: 48 }}>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog
        open={open}
        title="Rename robot"
        description="This name is shown across the fleet dashboard."
        closeLabel="Close"
        onClose={() => setOpen(false)}
      >
        <p style={{ margin: 0 }}>Body content goes here.</p>
      </Dialog>
    </div>
  );
}

function WithFooterDemo(props: { size?: "md" | "lg" }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: 48 }}>
      <Button onClick={() => setOpen(true)}>Open dialog ({props.size ?? "md"})</Button>
      <Dialog
        open={open}
        title="Delete robot"
        description="This cannot be undone."
        size={props.size}
        closeLabel="Close"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => setOpen(false)}>
              Delete
            </Button>
          </>
        }
      >
        <p style={{ margin: 0 }}>Preset "warehouse-loop" will be permanently removed.</p>
      </Dialog>
    </div>
  );
}

function WithFooterStartDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: 48 }}>
      <Button onClick={() => setOpen(true)}>Open dialog (footerStart)</Button>
      <Dialog
        open={open}
        title="Edit SSO connection"
        closeLabel="Close"
        onClose={() => setOpen(false)}
        footerStart={
          <Button variant="danger" onClick={() => setOpen(false)}>
            Remove SSO
          </Button>
        }
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Save
            </Button>
          </>
        }
      >
        <p style={{ margin: 0 }}>The destructive action sits on the left; Cancel/Save stay right.</p>
      </Dialog>
    </div>
  );
}

export const Default: Story = {
  render: () => <BasicDemo />,
};

export const WithFooter: Story = {
  render: () => <WithFooterDemo />,
};

export const Large: Story = {
  render: () => <WithFooterDemo size="lg" />,
};

export const WithFooterStart: Story = {
  render: () => <WithFooterStartDemo />,
};
