/**
 * @file Storybook stories for Menu.
 *
 * The trigger is a render prop (`MenuTriggerProps`) so the consumer's own
 * button carries `aria-haspopup` / `aria-expanded` — Menu never renders the
 * trigger itself.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Menu } from "./Menu";
import type { MenuItem, MenuTriggerProps } from "./Menu";

const ITEMS: readonly MenuItem[] = [
  { key: "rename", label: "Rename", onSelect: () => {} },
  { key: "duplicate", label: "Duplicate", onSelect: () => {} },
  { key: "archive", label: "Archive", onSelect: () => {}, disabled: true },
  { key: "delete", label: "Delete", onSelect: () => {}, danger: true },
];

function trigger(props: MenuTriggerProps) {
  return (
    <button
      type="button"
      ref={props.ref}
      onClick={props.onClick}
      aria-haspopup={props["aria-haspopup"]}
      aria-expanded={props["aria-expanded"]}
    >
      Actions ▾
    </button>
  );
}

const meta = {
  title: "Overlay/Menu",
  component: Menu,
  tags: ["autodocs"],
  args: {
    items: ITEMS,
    trigger,
    ariaLabel: "Robot actions",
  },
  render: (args) => (
    <div style={{ padding: 48 }}>
      <Menu {...args} />
    </div>
  ),
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AlignStart: Story = {
  args: { align: "start" },
};
