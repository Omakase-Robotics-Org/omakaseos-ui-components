/**
 * @file Storybook stories for Checkbox.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./Checkbox";

const meta = {
  title: "Form/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  args: { label: "I accept the terms" },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Checked: Story = { args: { defaultChecked: true } };
export const Indeterminate: Story = { args: { indeterminate: true } };
export const Disabled: Story = { args: { disabled: true, defaultChecked: true } };

export const LongLabelTruncates: Story = {
  args: {
    label: "I accept the terms (with a long label that will truncate inside narrow parents)",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 240, border: "1px dashed var(--ds-border)", padding: 8 }}>
        <Story />
      </div>
    ),
  ],
};
