/**
 * @file Storybook story for `Collapsible` / `CollapsibleTrigger` /
 * `CollapsibleContent` (a thin radix-ui wrapper; no assistant-ui runtime
 * dependency).
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";
import { Button } from "./button";
import { AuiRootStage } from "../AuiStoryStage";

function CollapsiblePreview() {
  const [open, setOpen] = useState(true);
  return (
    <AuiRootStage>
      <div style={{ display: "flex", gap: 16 }}>
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm">
              Closed collapsible
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p>Hidden content</p>
          </CollapsibleContent>
        </Collapsible>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm">
              {open ? "Collapse" : "Expand"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p>Visible content — controlled open state.</p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </AuiRootStage>
  );
}

const meta = {
  title: "Aui/Ui/Collapsible",
  component: CollapsiblePreview,
  tags: ["autodocs"],
} satisfies Meta<typeof CollapsiblePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
