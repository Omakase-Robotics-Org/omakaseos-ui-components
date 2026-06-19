/**
 * @file Storybook stories for Slider.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Slider } from "./Slider";

const meta = {
  title: "Form/Slider",
  component: Slider,
  tags: ["autodocs"],
  args: { label: "Volume", min: 0, max: 100 },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [v, setV] = useState(60);
    return <Slider {...args} value={v} onChange={(e) => setV(Number(e.target.value))} />;
  },
};

export const QuarterValue: Story = {
  render: (args) => {
    const [v, setV] = useState(25);
    return <Slider {...args} value={v} onChange={(e) => setV(Number(e.target.value))} />;
  },
};
