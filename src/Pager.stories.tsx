/**
 * @file Storybook stories for Pager.
 *
 * `labels` is required and un-defaulted (see the file header on Pager.tsx)
 * so every story supplies a full English label bag itself — there is no
 * library-side default to fall back on.
 */
import { useState } from "react";
import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Pager } from "./Pager";
import type { PagerLabels } from "./Pager";

const labels: PagerLabels = {
  region: "Pagination",
  first: "First page",
  previous: "Previous page",
  next: "Next page",
  last: "Last page",
  goToPage: (n) => `Go to page ${n}`,
  summary: (page, total) => `Page ${page} of ${total}`,
};

const meta = {
  title: "Navigation/Pager",
  component: Pager,
  tags: ["autodocs"],
  args: {
    page: 5,
    totalPages: 12,
    onChange: () => {},
    labels,
  },
  argTypes: {
    maxButtons: { control: { type: "number", min: 1, max: 9, step: 2 } },
  },
} satisfies Meta<typeof Pager>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Controlled wrapper: the story owns `page` the way a real consumer would. */
function Controlled(props: ComponentProps<typeof Pager>) {
  const [page, setPage] = useState(props.page);
  return <Pager {...props} page={page} onChange={setPage} />;
}

export const Middle: Story = {
  render: (args) => <Controlled {...args} />,
};

export const FirstPage: Story = {
  args: { page: 1 },
  render: (args) => <Controlled {...args} />,
};

export const LastPage: Story = {
  args: { page: 12 },
  render: (args) => <Controlled {...args} />,
};

export const NarrowMaxButtons: Story = {
  args: { maxButtons: 3, totalPages: 30, page: 15 },
  render: (args) => <Controlled {...args} />,
};

export const HiddenAtOnePage: Story = {
  args: { totalPages: 1, page: 1 },
  render: (args) => <Controlled {...args} />,
};

export const InNarrowContainer: Story = {
  render: (args) => (
    <div style={{ width: 220, border: "1px dashed var(--ds-border)", padding: 8 }}>
      <Controlled {...args} />
    </div>
  ),
};
