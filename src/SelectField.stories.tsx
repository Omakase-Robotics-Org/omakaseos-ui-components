/**
 * @file Storybook stories for SelectField.
 *
 * Labeled native select composed from Field and Select, including the
 * candidate-visible disabled-option state.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { SelectField } from "./SelectField";

const meta = {
  title: "Form/SelectField",
  component: SelectField,
  tags: ["autodocs"],
  args: {
    label: "Region",
    value: "jp",
    options: [
      { value: "jp", label: "Japan" },
      { value: "us", label: "United States" },
      { value: "de", label: "Germany" },
    ],
    onChange: () => {},
  },
  argTypes: {
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof SelectField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithHelp: Story = { args: { help: "Choose the robot's operating region." } };
export const Invalid: Story = { args: { error: "Choose a region." } };
export const Loading: Story = { args: { disabled: true } };
export const CandidateNeedsFiles: Story = {
  args: {
    value: "ready",
    options: [
      { value: "ready", label: "Ready" },
      { value: "missing", label: "Missing files", disabled: true },
      { value: "offline", label: "Offline" },
    ],
  },
};
