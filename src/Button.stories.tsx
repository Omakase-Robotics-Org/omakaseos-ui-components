/**
 * @file Storybook stories for Button.
 *
 * Variants: primary | secondary | neutral | subtle | ghost | accent | warning | danger.
 * Sizes: sm | md | lg. `truncate` defaults true so a long label ellipsizes
 * inside narrow toolbars.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta = {
  title: "Form/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Click me", variant: "primary", size: "md" },
  argTypes: {
    variant: {
      control: { type: "inline-radio" },
      options: ["primary", "secondary", "neutral", "subtle", "ghost", "accent", "warning", "danger"],
    },
    size: { control: { type: "inline-radio" }, options: ["sm", "md", "lg"] },
    disabled: { control: "boolean" },
    truncate: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Neutral: Story = { args: { variant: "neutral" } };
export const Subtle: Story = { args: { variant: "subtle" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Accent: Story = { args: { variant: "accent" } };
export const Warning: Story = { args: { variant: "warning" } };
export const Danger: Story = { args: { variant: "danger" } };
export const AriaDisabled: Story = {
  args: { "aria-disabled": true, children: "Unavailable" },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Button {...args} size="sm">Small</Button>
      <Button {...args} size="md">Medium</Button>
      <Button {...args} size="lg">Large</Button>
    </div>
  ),
};

export const LongLabelTruncates: Story = {
  args: {
    children: "A long action label that would otherwise blow out a narrow toolbar",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 220, border: "1px dashed var(--ds-border)", padding: 8 }}>
        <Story />
      </div>
    ),
  ],
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
      {(["primary", "secondary", "neutral", "subtle", "ghost", "accent", "warning", "danger"] as const).map((v) => (
        <Button key={v} variant={v}>{v}</Button>
      ))}
    </div>
  ),
};
