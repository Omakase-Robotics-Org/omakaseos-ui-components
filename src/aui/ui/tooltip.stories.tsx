/**
 * @file Storybook story for `Tooltip` / `TooltipTrigger` / `TooltipContent`
 * / `TooltipProvider` (radix-ui wrapper; no assistant-ui runtime
 * dependency). Forced open (`open` prop) so the popover renders without a
 * hover interaction — matches `demo/aui-main.tsx`'s `PrimitivesScene`.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import { Button } from "./button";
import { AuiRootStage } from "../AuiStoryStage";

function TooltipPreview() {
  return (
    <AuiRootStage height={120}>
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm">
              Hover target
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Forced-open tooltip content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </AuiRootStage>
  );
}

const meta = {
  title: "Aui/Ui/Tooltip",
  component: TooltipPreview,
  tags: ["autodocs"],
} satisfies Meta<typeof TooltipPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ForcedOpen: Story = {};
