/**
 * @file Storybook stories for Textarea.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "./Textarea";

const meta = {
  title: "Form/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  args: {
    defaultValue: "Multi-line note.\nLong unbroken: LOREMIPSUMDOLORSITAMETCONSECTETURADIPISCINGELITSEDDOEIUSMODTEMPOR",
    rows: 3,
  },
  argTypes: {
    invalid: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Invalid: Story = { args: { invalid: true } };
