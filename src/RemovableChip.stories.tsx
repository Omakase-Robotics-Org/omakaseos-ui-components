/**
 * @file Storybook stories for RemovableChip.
 *
 * A chip is one dismiss action, not a label plus a second close control.
 * `LongLabel` keeps the story inside a constrained parent so the label has
 * to yield space to the × glyph.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { RemovableChip } from "./RemovableChip";

const LONG_LABEL =
  "Organization: THIS_IS_A_VERY_LONG_FILTER_LABEL_THAT_MUST_TRUNCATE_BEFORE_THE_REMOVE_GLYPH";

const meta = {
  title: "Form/RemovableChip",
  component: RemovableChip,
  tags: ["autodocs"],
  args: {
    label: "Org: Acme",
    onRemove: () => {},
    removeAriaLabel: "Remove Org: Acme",
  },
  argTypes: {
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof RemovableChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongLabel: Story = {
  args: {
    label: LONG_LABEL,
    removeAriaLabel: `Remove ${LONG_LABEL}`,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 220 }}>
        <Story />
      </div>
    ),
  ],
};

export const Disabled: Story = { args: { disabled: true } };
