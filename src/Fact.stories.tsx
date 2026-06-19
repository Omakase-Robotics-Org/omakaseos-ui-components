/**
 * @file Storybook stories for Fact + FactList.
 *
 * Fact is a labeled value display unit; FactList stacks them vertically.
 * Direction "row" is the default (label left, value right); "column"
 * stacks the label above the value.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Fact, FactList } from "./Fact";
import { StatusBadge } from "./StatusBadge";

const meta = {
  title: "Status/Fact",
  component: Fact,
  tags: ["autodocs"],
  args: { label: "Label", children: "Value" },
} satisfies Meta<typeof Fact>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleRow: Story = {
  args: { label: "Battery", children: "38%" },
};

export const SingleColumn: Story = {
  args: { label: "Battery", direction: "column", children: "38%" },
};

export const ListExample: Story = {
  render: () => (
    <FactList>
      <Fact label="Name">
        <StatusBadge tone="info" size="sm">
          G1-042
        </StatusBadge>
      </Fact>
      <Fact label="Connection">
        <StatusBadge tone="success">Connected</StatusBadge>
      </Fact>
      <Fact label="Battery">
        <StatusBadge tone="warning">38%</StatusBadge>
      </Fact>
      <Fact label="Posture">Standing</Fact>
      <Fact label="Notes" direction="column">
        Robot was redeployed at 12:00. Awaiting first interaction.
      </Fact>
    </FactList>
  ),
};
