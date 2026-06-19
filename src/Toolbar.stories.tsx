/**
 * @file Storybook stories for Toolbar.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";
import { Input } from "./Input";
import { Toolbar } from "./Toolbar";

const meta = {
  title: "Form/Toolbar",
  component: Toolbar,
  tags: ["autodocs"],
  args: { ariaLabel: "filters", align: "start", children: null },
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FilterRow: Story = {
  render: (args) => (
    <Toolbar {...args}>
      <div data-grow="true">
        <Input aria-label="search" placeholder="search…" />
      </div>
      <Button variant="primary">Apply</Button>
      <Button>Clear</Button>
    </Toolbar>
  ),
};

export const LongInputDoesNotPushButtons: Story = {
  render: (args) => (
    <Toolbar {...args}>
      <div data-grow="true">
        <Input
          aria-label="search"
          defaultValue="a-very-long-search-query-that-would-otherwise-overflow-the-toolbar-and-push-the-buttons-out-of-view"
        />
      </div>
      <Button variant="primary">Apply</Button>
      <Button>Clear</Button>
    </Toolbar>
  ),
};
