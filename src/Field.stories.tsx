/**
 * @file Storybook stories for Field.
 *
 * Render-prop wrapper that supplies a unique id, label, optional help
 * text, and an error message slot. The render fn receives the id so the
 * input element can pair with the label correctly.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Field } from "./Field";
import { Input } from "./Input";
import { Select } from "./Select";

const meta = {
  title: "Form/Field",
  component: Field,
  tags: ["autodocs"],
  args: { label: "Field", children: () => null },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InputField: Story = {
  render: () => (
    <Field label="Email" help="We'll only use this for sign-in.">
      {(id) => <Input id={id} type="email" placeholder="you@example.com" />}
    </Field>
  ),
};

export const InvalidWithError: Story = {
  render: () => (
    <Field label="Email" error="Must be a valid email address.">
      {(id) => <Input id={id} type="email" defaultValue="not-an-email" invalid />}
    </Field>
  ),
};

export const SelectField: Story = {
  render: () => (
    <Field label="Region">
      {(id) => (
        <Select id={id} defaultValue="jp">
          <option value="jp">日本</option>
          <option value="us">United States</option>
        </Select>
      )}
    </Field>
  ),
};
