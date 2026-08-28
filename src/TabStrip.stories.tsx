/**
 * @file Storybook stories for TabStrip.
 */
import { useState } from "react";
import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { TabStrip } from "./TabStrip";
import type { TabStripEditing, TabStripItem } from "./TabStrip";

type Id = "overview" | "config" | "logs";

const ITEMS: readonly TabStripItem<Id>[] = [
  { id: "overview", label: "Overview" },
  { id: "config", label: "Config" },
  { id: "logs", label: "Logs" },
];

// TabStrip is generic; Storybook's CSF3 typing needs a concretely-typed
// reference to infer `args`/`Story` correctly (an un-instantiated
// `typeof TabStrip` collapses `T` to its `string` constraint).
const TypedTabStrip = TabStrip<Id>;

const meta = {
  title: "Navigation/TabStrip",
  component: TypedTabStrip,
  tags: ["autodocs"],
  args: {
    items: ITEMS,
    value: "overview",
    onChange: () => {},
    idPrefix: "demo",
  },
} satisfies Meta<typeof TypedTabStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Controlled wrapper: the story owns `value` the way a real consumer would. */
function Controlled(props: ComponentProps<typeof TypedTabStrip>) {
  const [value, setValue] = useState(props.value);
  return <TabStrip {...props} value={value} onChange={setValue} />;
}

export const Default: Story = {
  render: (args) => <Controlled {...args} />,
};

export const WithAriaLabel: Story = {
  args: { ariaLabel: "Robot views" },
  render: (args) => <Controlled {...args} />,
};

export const WithTrailingAction: Story = {
  render: (args) => (
    <Controlled
      {...args}
      trailing={
        <button type="button" style={{ marginLeft: "auto" }}>
          + Add view
        </button>
      }
    />
  ),
};

export const WithItemAdornment: Story = {
  render: (args) => (
    <Controlled
      {...args}
      itemAdornment={(id) =>
        id === "logs" ? (
          <span style={{ marginLeft: 4, fontSize: 11, color: "var(--ds-tone-danger-fg)" }}>●</span>
        ) : null
      }
    />
  ),
};

/**
 * The rename editor occupying one tab's slot. Double-click a tab (or use the
 * control below) to see the no-shift mechanism: the slot starts at the old
 * label's width and follows the draft as it is typed.
 */
function RenameDemo(props: ComponentProps<typeof TabStrip<Id>>) {
  const [value, setValue] = useState(props.value);
  const [items, setItems] = useState(ITEMS);
  const [editingId, setEditingId] = useState<Id | null>(null);

  const editing: TabStripEditing<Id> | null =
    editingId === null
      ? null
      : {
          id: editingId,
          defaultValue: items.find((i) => i.id === editingId)?.label ?? "",
          placeholder: "Untitled view",
          ariaLabel: "Rename view",
          onCommit: (name) => {
            setItems((prev) =>
              prev.map((item) => (item.id === editingId ? { ...item, label: name || item.label } : item)),
            );
            setEditingId(null);
          },
          onCancel: () => setEditingId(null),
        };

  return (
    <TabStrip
      {...props}
      items={items}
      value={value}
      onChange={setValue}
      editing={editing}
      onItemDoubleClick={(id) => setEditingId(id)}
    />
  );
}

export const RenameEditor: Story = {
  render: (args) => <RenameDemo {...args} />,
};

export const InNarrowContainer: Story = {
  render: (args) => (
    <div style={{ width: 220, border: "1px dashed var(--ds-border)", padding: 8 }}>
      <Controlled {...args} />
    </div>
  ),
};
