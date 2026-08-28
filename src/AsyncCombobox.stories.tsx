/**
 * @file Storybook story for AsyncCombobox.
 *
 * The component's only fetcher is `searchFn`, so the story wires it to an
 * in-memory candidate list instead of a network call: a small artificial
 * delay (`FAKE_NETWORK_DELAY_MS`) stands in for the round trip, and the
 * returned promise still honours the `AbortSignal` the same way a real
 * fetch client would — so the debounce / race-safety behaviour documented
 * on the component reads true in Storybook too. No network, no login, no
 * server — just the `searchFn(query, signal) => Promise<Option[]>` contract
 * the library actually asks a consumer to implement.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { AsyncCombobox } from "./AsyncCombobox";
import type { AsyncComboboxOption, AsyncComboboxSearchFn } from "./AsyncCombobox";

const CANDIDATES: readonly AsyncComboboxOption[] = [
  { value: "tag-aurora", label: "Aurora" },
  { value: "tag-beacon", label: "Beacon" },
  { value: "tag-cascade", label: "Cascade" },
  { value: "tag-drift", label: "Drift" },
  { value: "tag-ember", label: "Ember" },
  { value: "tag-night-shift", label: "Night Shift" },
];

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
  title: "Form/AsyncCombobox",
  component: AsyncCombobox,
  tags: ["autodocs"],
  args: {
    value: "",
    selectedLabel: "",
    onChange: () => {},
    searchFn: fakeSearchFn(FAKE_NETWORK_DELAY_MS),
    placeholder: "Search tags…",
    anyOptionLabel: "Any tag",
    loadingLabel: "Searching…",
    noResultsLabel: "No matches",
  },
  argTypes: {
    comboboxSize: { control: { type: "inline-radio" }, options: [undefined, "sm", "md", "lg"] },
    invalid: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof AsyncCombobox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Controlled wrapper: the story owns the selection the way a real consumer would. */
function ControlledCombobox(props: React.ComponentProps<typeof AsyncCombobox>) {
  const [selection, setSelection] = useState({ value: props.value, label: props.selectedLabel });
  return (
    <AsyncCombobox
      {...props}
      value={selection.value}
      selectedLabel={selection.label}
      onChange={setSelection}
    />
  );
}

export const Default: Story = {
  render: (args) => <ControlledCombobox {...args} />,
};

export const Preselected: Story = {
  args: { value: "tag-ember", selectedLabel: "Ember" },
};

export const Disabled: Story = {
  args: { disabled: true },
};
