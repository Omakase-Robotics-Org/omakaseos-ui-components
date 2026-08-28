/**
 * @file Storybook story for `Avatar` / `AvatarFallback` / `AvatarImage` (the
 * three exports `src/aui/index.ts` re-exports from `./ui/avatar` — a
 * radix-ui wrapper with no assistant-ui runtime dependency).
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { AuiRootStage } from "../AuiStoryStage";

/** Smallest possible valid PNG (1x1), no network. */
const TINY_PNG_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function AvatarPreview() {
  return (
    <AuiRootStage>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <Avatar size="sm">
          <AvatarImage src={TINY_PNG_DATA_URI} alt="" />
        </Avatar>
        <Avatar size="default">
          <AvatarImage src={TINY_PNG_DATA_URI} alt="" />
        </Avatar>
        <Avatar size="lg">
          <AvatarImage src={TINY_PNG_DATA_URI} alt="" />
        </Avatar>
        <Avatar>
          <AvatarFallback>OP</AvatarFallback>
        </Avatar>
      </div>
    </AuiRootStage>
  );
}

const meta = {
  title: "Aui/Ui/Avatar",
  component: AvatarPreview,
  tags: ["autodocs"],
} satisfies Meta<typeof AvatarPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SizesAndFallback: Story = {};
