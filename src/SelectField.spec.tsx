import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SelectField } from "./SelectField";

const options = [
  { value: "ready", label: "Ready" },
  { value: "missing", label: "Missing files", disabled: true },
  { value: "offline", label: "Offline" },
] as const;

describe("SelectField", () => {
  it("associates its label with the select and preserves option order", () => {
    render(<SelectField label="Status" value="ready" options={options} onChange={() => {}} />);
    const select = screen.getByLabelText("Status");

    expect(select.tagName).toBe("SELECT");
    expect(Array.from(select.querySelectorAll("option")).map((option) => option.textContent)).toEqual([
      "Ready",
      "Missing files",
      "Offline",
    ]);
  });

  it("delivers the selected value rather than the change event", () => {
    const values: string[] = [];
    render(<SelectField label="Status" value="ready" options={options} onChange={(value) => values.push(value)} />);

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "offline" } });

    expect(values).toEqual(["offline"]);
  });

  it("honors field and per-option disabled states", () => {
    render(
      <SelectField
        label="Status"
        value="ready"
        options={options}
        onChange={() => {}}
        disabled
      />,
    );
    const select = screen.getByLabelText("Status");
    const renderedOptions = Array.from(select.querySelectorAll("option"));

    expect(select).toBeDisabled();
    expect(renderedOptions[1]).toBeDisabled();
  });

  it("renders help text when provided", () => {
    render(
      <SelectField
        label="Status"
        value="ready"
        options={options}
        onChange={() => {}}
        help="Choose the current state."
      />,
    );

    expect(screen.getByText("Choose the current state.")).toBeInTheDocument();
  });

  it("renders the error and marks the select invalid", () => {
    render(
      <SelectField
        label="Status"
        value="ready"
        options={options}
        onChange={() => {}}
        error="Choose a status"
      />,
    );
    const select = screen.getByLabelText("Status");

    expect(screen.getByText("Choose a status")).toBeInTheDocument();
    expect(select).toHaveAttribute("aria-invalid", "true");
  });
});
