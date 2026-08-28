/**
 * @file Storybook stories for Tabs.
 */
import { useState } from "react";
import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Tabs } from "./Tabs";
import type { TabItem } from "./Tabs";

type Id = "overview" | "config" | "logs";

const ITEMS: readonly TabItem<Id>[] = [
  { id: "overview", label: "Overview", content: <p>Overview panel content.</p> },
  { id: "config", label: "Config", content: <p>Config panel content.</p> },
  { id: "logs", label: "Logs", content: <p>Logs panel content.</p> },
];

// Tabs is generic; Storybook's CSF3 typing needs a concretely-typed
// reference to infer `args`/`Story` correctly (an un-instantiated
// `typeof Tabs` collapses `T` to its `string` constraint).
const TypedTabs = Tabs<Id>;

const meta = {
  title: "Navigation/Tabs",
  component: TypedTabs,
  tags: ["autodocs"],
  args: {
    items: ITEMS,
    value: "overview",
    onChange: () => {},
    idPrefix: "demo",
  },
} satisfies Meta<typeof TypedTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Controlled wrapper: the story owns `value` the way a real consumer would. */
function Controlled(props: ComponentProps<typeof TypedTabs>) {
  const [value, setValue] = useState(props.value);
  return <Tabs {...props} value={value} onChange={setValue} />;
}

export const Default: Story = {
  render: (args) => <Controlled {...args} />,
};

export const OnlyTheActivePanelMounts: Story = {
  render: (args) => (
    <Controlled
      {...args}
      items={ITEMS.map((item) => ({
        ...item,
        content: (
          <p>
            {item.label} panel — mounted only while active (check the DOM: the other
            two panels are absent, not merely hidden).
          </p>
        ),
      }))}
    />
  ),
};
