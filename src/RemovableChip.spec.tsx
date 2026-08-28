import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RemovableChip } from "./RemovableChip";

describe("RemovableChip", () => {
  it("uses removeAriaLabel as the accessible name of the button element", () => {
    render(
      <RemovableChip
        label="Search: galaxea"
        onRemove={() => undefined}
        removeAriaLabel="Remove Search: galaxea"
      />,
    );
    const chip = screen.getByRole("listitem", { name: "Remove Search: galaxea" });
    expect(chip).toBeInstanceOf(HTMLButtonElement);
    expect(screen.queryByRole("listitem", { name: "Search: galaxea" })).toBeNull();
  });

  it("fires onRemove once when clicked", () => {
    const calls: string[] = [];
    render(
      <RemovableChip
        label="Org: Acme"
        onRemove={() => {
          calls.push("remove");
        }}
        removeAriaLabel="Remove Org: Acme"
      />,
    );
    fireEvent.click(screen.getByRole("listitem", { name: "Remove Org: Acme" }));
    expect(calls).toHaveLength(1);
  });

  it("hides the × glyph from assistive technology", () => {
    render(<RemovableChip label="x" onRemove={() => undefined} removeAriaLabel="Remove x" />);
    const chip = screen.getByRole("listitem", { name: "Remove x" });
    const glyph = chip.querySelector('[aria-hidden="true"]');
    expect(glyph).not.toBeNull();
    expect(glyph).toHaveTextContent("×");
  });

  it("keeps the listitem role on the single button press target", () => {
    render(<RemovableChip label="x" onRemove={() => undefined} removeAriaLabel="Remove x" />);
    const chip = screen.getByRole("listitem", { name: "Remove x" });
    expect(chip).toHaveAttribute("role", "listitem");
    expect(chip).toBeInstanceOf(HTMLButtonElement);
  });

  it("uses aria-disabled without the native disabled attribute and guards removal", () => {
    const calls: string[] = [];
    render(
      <RemovableChip
        label="x"
        onRemove={() => {
          calls.push("remove");
        }}
        removeAriaLabel="Remove x"
        disabled
      />,
    );
    const chip = screen.getByRole("listitem", { name: "Remove x" });
    expect(chip).toHaveAttribute("aria-disabled", "true");
    expect(chip).not.toHaveAttribute("disabled");
    fireEvent.click(chip);
    expect(calls).toHaveLength(0);
  });
});
