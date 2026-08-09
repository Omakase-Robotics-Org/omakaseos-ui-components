/**
 * @file Storybook stories for Spinner.
 *
 * A stateless rotating ring: the three sizes, the tone vocabulary, and the
 * default `currentColor` head that inherits the surrounding ink. Renders
 * under whichever host theme the toolbar's Host switch selects.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Spinner } from "./Spinner";

const meta = {
  title: "Status/Spinner",
  component: Spinner,
  tags: ["autodocs"],
  args: { size: "md" },
  argTypes: {
    size: { control: { type: "inline-radio" }, options: ["sm", "md", "lg"] },
    tone: {
      control: { type: "inline-radio" },
      options: [undefined, "success", "warning", "danger", "info", "neutral"],
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The console's wizard-modal ring: 36px, success tone. */
export const WizardRing: Story = { args: { size: "lg", tone: "success" } };

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </div>
  ),
};

export const AllTones: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <Spinner tone="success" />
      <Spinner tone="warning" />
      <Spinner tone="danger" />
      <Spinner tone="info" />
      <Spinner tone="neutral" />
    </div>
  ),
};

/** No tone: the head takes the ink of whatever it is placed in. */
export const InheritsCurrentColor: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center", color: "var(--ds-tone-info-fg)" }}>
      <Spinner />
      <span style={{ fontSize: "var(--ds-font-size-body)" }}>inherits this line's color</span>
    </div>
  ),
};
