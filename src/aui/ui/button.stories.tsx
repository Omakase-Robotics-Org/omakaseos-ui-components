/**
 * @file Storybook stories for the aui `Button` (shadcn primitive, `.aui-root`
 * / `--color-*` theme tokens — distinct from `src/Button.tsx`'s `--ds-*`
 * primitive; see `Form/Button` for that one).
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "./button";
import { AuiRootStage } from "../AuiStoryStage";

const VARIANTS = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const;
const SIZES = ["xs", "sm", "default", "lg", "icon"] as const;

const meta = {
  title: "Aui/Ui/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Click me", variant: "default", size: "default" },
  argTypes: {
    variant: { control: { type: "inline-radio" }, options: VARIANTS },
    size: { control: { type: "inline-radio" }, options: SIZES },
    disabled: { control: "boolean" },
  },
  decorators: [(Story) => <AuiRootStage><Story /></AuiRootStage>],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllVariantsAndSizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      {VARIANTS.map((variant) => (
        <div key={variant} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {SIZES.map((size) => (
            <Button key={size} variant={variant} size={size}>
              {size === "icon" ? "B" : `${variant} ${size}`}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};
