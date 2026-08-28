/**
 * @file Storybook stories for TextField.
 *
 * Labeled controlled text input composed from Field and Input, including the
 * help and invalid states callers use around native form controls.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { TextField } from "./TextField";

const meta = {
  title: "Form/TextField",
  component: TextField,
  tags: ["autodocs"],
  args: {
    label: "Email",
    value: "",
    onChange: () => {},
    placeholder: "you@example.com",
  },
  argTypes: {
    type: {
      control: { type: "select" },
      options: ["text", "email", "url", "password", "date", "datetime-local"],
    },
    inputSize: { control: { type: "inline-radio" }, options: [undefined, "sm", "md", "lg"] },
    autoFocus: { control: "boolean" },
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithHelp: Story = { args: { help: "Used only for sign-in." } };
export const Invalid: Story = {
  args: { value: "not-an-email", error: "Enter a valid email address." },
};
export const Password: Story = { args: { label: "Password", type: "password" } };
