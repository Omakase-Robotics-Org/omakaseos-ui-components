/**
 * @file Storybook stories for Switch.
 *
 * Native checkbox styled as a track + thumb, with role="switch" so the
 * a11y tree announces it correctly.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Switch } from "./Switch";

const meta = {
  title: "Form/Switch",
  component: Switch,
  tags: ["autodocs"],
  args: { label: "Autosave" },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};
export const On: Story = { args: { defaultChecked: true } };
export const Disabled: Story = { args: { disabled: true } };
