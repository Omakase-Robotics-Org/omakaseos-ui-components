/**
 * @file Storybook stories for TextAreaField.
 *
 * Labeled controlled multi-line input composed from Field and Textarea.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { TextAreaField } from "./TextAreaField";

const meta = {
  title: "Form/TextAreaField",
  component: TextAreaField,
  tags: ["autodocs"],
  args: {
    label: "Notes",
    value: "Multi-line note.",
    onChange: () => {},
    placeholder: "Add a note…",
    rows: 3,
  },
} satisfies Meta<typeof TextAreaField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithHelp: Story = { args: { help: "Add context for the next operator." } };
export const Invalid: Story = { args: { error: "Notes are required" } };
export const MoreRows: Story = { args: { rows: 6 } };
