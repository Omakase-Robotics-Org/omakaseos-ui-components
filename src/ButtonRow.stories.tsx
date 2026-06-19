/**
 * @file Storybook stories for ButtonRow.
 *
 * Margin-free flex group for action buttons. Outer spacing is the parent's
 * responsibility — useful inside Cards, Toolbars, and detail panels where
 * the call site already controls vertical rhythm.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";
import { ButtonRow } from "./ButtonRow";

const meta = {
  title: "Status/ButtonRow",
  component: ButtonRow,
  tags: ["autodocs"],
  args: { children: null },
} satisfies Meta<typeof ButtonRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mixed: Story = {
  render: () => (
    <ButtonRow>
      <Button variant="primary">Save</Button>
      <Button>Cancel</Button>
      <Button variant="ghost">Reset</Button>
      <Button variant="danger">Delete</Button>
    </ButtonRow>
  ),
};
