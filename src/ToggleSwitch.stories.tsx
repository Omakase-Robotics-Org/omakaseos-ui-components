/**
 * @file Storybook stories for ToggleSwitch.
 *
 * Controlled checkbox styled as a track + thumb, checked state reading as
 * the console's success/running tone. `ariaLabel` is required — the
 * control renders no visible label of its own.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ToggleSwitch } from "./ToggleSwitch";

const meta = {
  title: "Form/ToggleSwitch",
  component: ToggleSwitch,
  tags: ["autodocs"],
  args: { ariaLabel: "Gesture mode", checked: false },
} satisfies Meta<typeof ToggleSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = { args: { checked: false, onChange: () => {} } };
export const On: Story = { args: { checked: true, onChange: () => {} } };
export const Disabled: Story = { args: { checked: true, disabled: true, onChange: () => {} } };

export const Interactive: Story = {
  args: { onChange: () => {} },
  render: (args) => {
    function Controlled() {
      const [checked, setChecked] = useState(args.checked);
      return <ToggleSwitch {...args} checked={checked} onChange={setChecked} />;
    }
    return <Controlled />;
  },
};
