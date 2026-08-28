/**
 * @file Storybook story for AsyncMultiCombobox.
 *
 * Same fake-network pattern as `AsyncCombobox.stories.tsx`: `searchFn` is
 * wired to an in-memory candidate list with an artificial delay standing
 * in for the round trip, honouring the `AbortSignal` the same way a real
 * fetch client would.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { AsyncMultiCombobox } from "./AsyncMultiCombobox";
import type { AsyncComboboxOption, AsyncComboboxSearchFn } from "./AsyncCombobox";

const CANDIDATES: readonly AsyncComboboxOption[] = [
  { value: "tag-aurora", label: "Aurora" },
  { value: "tag-beacon", label: "Beacon" },
  { value: "tag-cascade", label: "Cascade" },
  { value: "tag-drift", label: "Drift" },
  { value: "tag-ember", label: "Ember" },
  { value: "tag-night-shift", label: "Night Shift" },
];

const CATALOG: Readonly<Record<string, string>> = Object.fromEntries(
  CANDIDATES.map((option) => [option.value, option.label]),
);

const FAKE_NETWORK_DELAY_MS = 250;

function fakeSearchFn(delayMs: number): AsyncComboboxSearchFn {
  return (query, signal) =>
    new Promise((resolve, reject) => {
      const matches = CANDIDATES.filter((option) =>
        option.label.toLowerCase().includes(query.toLowerCase()),
      );
      const timer = setTimeout(() => resolve(matches), delayMs);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("aborted", "AbortError"));
      });
    });
}

const meta = {
  title: "Form/AsyncMultiCombobox",
  component: AsyncMultiCombobox,
  tags: ["autodocs"],
  args: {
    id: "story-tags",
    selected: [],
    onChange: () => {},
    searchFn: fakeSearchFn(FAKE_NETWORK_DELAY_MS),
    resolveLabel: (key: string) => CATALOG[key],
    placeholder: "Search tags…",
    loadingLabel: "Searching…",
    noResultsLabel: "No matches",
    listboxLabel: "Tags",
    removeLabel: (label: string) => `Remove ${label}`,
  },
  argTypes: {
    invalid: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof AsyncMultiCombobox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Controlled wrapper: the story owns the selection the way a real consumer would. */
function ControlledMultiCombobox(props: React.ComponentProps<typeof AsyncMultiCombobox>) {
  const [selected, setSelected] = useState<string[]>([...props.selected]);
  return <AsyncMultiCombobox {...props} selected={selected} onChange={setSelected} />;
}

export const Default: Story = {
  render: (args) => <ControlledMultiCombobox {...args} />,
};

export const Preselected: Story = {
  render: (args) => <ControlledMultiCombobox {...args} />,
  args: { selected: ["tag-aurora", "tag-ember"] },
};

export const ManySelected: Story = {
  render: (args) => <ControlledMultiCombobox {...args} />,
  args: { selected: CANDIDATES.map((option) => option.value) },
};

export const Disabled: Story = {
  render: (args) => <ControlledMultiCombobox {...args} />,
  args: { selected: ["tag-aurora"], disabled: true },
};

export const Invalid: Story = {
  render: (args) => <ControlledMultiCombobox {...args} />,
  args: { invalid: true },
};
