/**
 * @file Storybook story for the `Dialog` family (`Dialog`, `DialogTrigger`,
 * `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`,
 * `DialogFooter`, `DialogOverlay`, `DialogPortal`, `DialogClose`) — a
 * radix-ui wrapper with no assistant-ui runtime dependency. Controlled
 * `open` (closed by default) so the fixed-position overlay does not tint
 * every other story's iframe — click the trigger to open it.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Button } from "./button";
import { AuiRootStage } from "../AuiStoryStage";

function DialogPreview() {
  const [open, setOpen] = useState(false);
  return (
    <AuiRootStage height={160}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Open dialog
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm action</DialogTitle>
            <DialogDescription>
              This dialog is controlled — click the trigger to open it, the close (X) or
              Cancel to dismiss.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuiRootStage>
  );
}

const meta = {
  title: "Aui/Ui/Dialog",
  component: DialogPreview,
  tags: ["autodocs"],
} satisfies Meta<typeof DialogPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
