/**
 * @file Storybook stories for EmptyNote.
 *
 * EmptyNote is the flow-absent empty-state copy; callers omit it when there
 * is no note to show. It does not reserve layout height like ReservedText.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { EmptyNote } from "./EmptyNote";

const meta = {
  title: "Status/EmptyNote",
  component: EmptyNote,
  tags: ["autodocs"],
  args: { label: "No robots found." },
} satisfies Meta<typeof EmptyNote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
