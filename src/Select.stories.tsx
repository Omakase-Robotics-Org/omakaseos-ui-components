/**
 * @file Storybook stories for Select.
 *
 * Native <select> with a CSS-mask chevron and ellipsis closed-state styling.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Select } from "./Select";

const meta = {
  title: "Form/Select",
  component: Select,
  tags: ["autodocs"],
  args: { defaultValue: "jp", children: null },
  argTypes: {
    selectSize: { control: { type: "inline-radio" }, options: [undefined, "sm", "md", "lg"] },
    invalid: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Select {...args}>
      <option value="jp">日本</option>
      <option value="us">United States</option>
      <option value="long">A really long option label that ellipsizes when the box is narrow</option>
    </Select>
  ),
};

export const NarrowEllipsis: Story = {
  args: { defaultValue: "long" },
  decorators: [
    (Story) => (
      <div style={{ width: 220 }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <Select {...args}>
      <option value="long">A really long option label that ellipsizes when the box is narrow</option>
      <option value="short">Short</option>
    </Select>
  ),
};
