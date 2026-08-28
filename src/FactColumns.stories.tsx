/**
 * @file Storybook stories for FactColumns.
 *
 * The story uses the existing Status prefix because `.storybook/preview.ts`
 * orders Status/Form/Chat-log/Live-stage and has no Layout entry.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Fact, FactColumns } from "./Fact";

const meta = {
  title: "Status/FactColumns",
  component: FactColumns,
  tags: ["autodocs"],
  args: { children: null },
} satisfies Meta<typeof FactColumns>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PageFacts: Story = {
  render: () => (
    <FactColumns>
      <Fact label="Name">G1-042</Fact>
      <Fact label="Model">Unitree G1</Fact>
      <Fact label="Vendor" tone="muted">
        Unitree
      </Fact>
      <Fact label="License" hint="verified">
        Valid
      </Fact>
      <Fact label="Firmware" tone="missing" hint="awaiting first report">
        Not reported yet
      </Fact>
    </FactColumns>
  ),
};
