/**
 * @file Storybook stories for Input.
 *
 * Native <input> wrapper with size variants and an `invalid` prop.
 * `width: 100% + min-width: 0` makes Input safe inside flex parents.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./Input";

const meta = {
  title: "Form/Input",
  component: Input,
  tags: ["autodocs"],
  args: { placeholder: "Type here…", type: "text" },
  argTypes: {
    inputSize: { control: { type: "inline-radio" }, options: [undefined, "sm", "md", "lg"] },
    invalid: { control: "boolean" },
    disabled: { control: "boolean" },
    type: {
      control: { type: "select" },
      options: ["text", "email", "password", "search", "tel", "url", "number"],
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { inputSize: "sm" } };
export const Large: Story = { args: { inputSize: "lg" } };
export const Invalid: Story = { args: { invalid: true, defaultValue: "not-an-email" } };
export const Disabled: Story = { args: { disabled: true, defaultValue: "frozen" } };

export const InNarrowParent: Story = {
  args: { defaultValue: "a-very-long-search-query-that-should-not-overflow-its-parent-flex-cell" },
  decorators: [
    (Story) => (
      <div style={{ width: 240, border: "1px dashed var(--ds-border)", padding: 8 }}>
        <Story />
      </div>
    ),
  ],
};
