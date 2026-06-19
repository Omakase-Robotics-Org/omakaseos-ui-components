/**
 * @file Storybook stories for Heading.
 *
 * `level` controls both the rendered HTML element (h1..h4) and the
 * typographic scale. `truncate` opts into single-line ellipsis.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Heading } from "./Heading";

const meta = {
  title: "Form/Heading",
  component: Heading,
  tags: ["autodocs"],
  args: { level: 2, children: "Heading text" },
  argTypes: {
    level: { control: { type: "inline-radio" }, options: [1, 2, 3, 4] },
    truncate: { control: "boolean" },
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const H1: Story = { args: { level: 1 } };
export const H2: Story = { args: { level: 2 } };
export const H3: Story = { args: { level: 3 } };
export const H4: Story = { args: { level: 4 } };

export const LongUnbrokenWraps: Story = {
  args: {
    children:
      "Robot configuration for THIS_IS_A_VERY_LONG_UNBROKEN_IDENTIFIER_THAT_SHOULD_WRAP_INSIDE_THE_CARD",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280, border: "1px dashed var(--ds-border)", padding: 8 }}>
        <Story />
      </div>
    ),
  ],
};

export const TruncateMode: Story = {
  args: { truncate: true, children: "A long heading that ellipsizes to one line." },
  decorators: [
    (Story) => (
      <div style={{ width: 200 }}>
        <Story />
      </div>
    ),
  ],
};
