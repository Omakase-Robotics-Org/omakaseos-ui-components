/**
 * @file Storybook stories for SearchInput.
 *
 * Box-owns-the-chrome search field — the story wires a controlled value
 * so the focus ring / typing can be exercised interactively, the way a
 * consumer's list-page header would.
 */
import { useState } from "react";
import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { SearchInput } from "./SearchInput";

const meta = {
  title: "Form/SearchInput",
  component: SearchInput,
  tags: ["autodocs"],
  args: {
    value: "",
    onChange: () => {},
    ariaLabel: "Search FAQs",
    placeholder: "Search FAQs…",
  },
  argTypes: {
    size: { control: { type: "inline-radio" }, options: [undefined, "md", "lg"] },
  },
} satisfies Meta<typeof SearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Controlled wrapper: the story owns the value the way a real consumer would. */
function Controlled(props: ComponentProps<typeof SearchInput>) {
  const [value, setValue] = useState(props.value);
  return <SearchInput {...props} value={value} onChange={setValue} />;
}

export const Default: Story = {
  render: (args) => <Controlled {...args} />,
};

export const Large: Story = {
  args: { size: "lg" },
  render: (args) => <Controlled {...args} />,
};

export const WithValue: Story = {
  args: { value: "G1-042" },
  render: (args) => <Controlled {...args} />,
};

export const InNarrowParent: Story = {
  render: (args) => (
    <div style={{ width: 240, border: "1px dashed var(--ds-border)", padding: 8 }}>
      <Controlled {...args} />
    </div>
  ),
};
