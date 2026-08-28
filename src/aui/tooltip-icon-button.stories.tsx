/**
 * @file Storybook story for `TooltipIconButton`.
 *
 * Wraps its own `TooltipProvider` per instance (unlike the bare
 * `AttachmentUI` tooltip — see `AuiStoryStage.tsx`'s header), so it mounts
 * standalone under `.aui-root` with no assistant-ui runtime.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { PencilIcon } from "lucide-react";

import { TooltipIconButton } from "./tooltip-icon-button";
import { AuiRootStage } from "./AuiStoryStage";

const meta = {
  title: "Aui/TooltipIconButton",
  component: TooltipIconButton,
  tags: ["autodocs"],
  args: { tooltip: "Edit", side: "bottom" },
  argTypes: {
    side: { control: { type: "inline-radio" }, options: ["top", "bottom", "left", "right"] },
  },
  render: (args) => (
    <AuiRootStage height={80}>
      <TooltipIconButton {...args}>
        <PencilIcon />
      </TooltipIconButton>
    </AuiRootStage>
  ),
} satisfies Meta<typeof TooltipIconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
