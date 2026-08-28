import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextAreaField } from "./TextAreaField";

describe("TextAreaField", () => {
  it("associates its label with the textarea", () => {
    render(<TextAreaField label="Notes" value="" onChange={() => {}} />);
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });

  it("delivers the textarea value rather than the change event", () => {
    const values: string[] = [];
    render(<TextAreaField label="Notes" value="" onChange={(value) => values.push(value)} />);

    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "A note" } });

    expect(values).toEqual(["A note"]);
  });

  it("defaults to three rows and honors an override", () => {
    const { rerender } = render(<TextAreaField label="Notes" value="" onChange={() => {}} />);
    expect(screen.getByLabelText("Notes")).toHaveAttribute("rows", "3");

    rerender(<TextAreaField label="Notes" value="" onChange={() => {}} rows={6} />);
    expect(screen.getByLabelText("Notes")).toHaveAttribute("rows", "6");
  });

  it("renders help text when provided", () => {
    render(
      <TextAreaField
        label="Notes"
        value=""
        onChange={() => {}}
        help="Add context for the next operator."
      />,
    );

    expect(screen.getByText("Add context for the next operator.")).toBeInTheDocument();
  });

  it("renders the error and marks the textarea invalid", () => {
    render(
      <TextAreaField label="Notes" value="" onChange={() => {}} error="Notes are required" />,
    );
    const textarea = screen.getByLabelText("Notes");

    expect(screen.getByText("Notes are required")).toBeInTheDocument();
    expect(textarea).toHaveAttribute("aria-invalid", "true");
  });
});
