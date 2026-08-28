import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("associates its label with the input", () => {
    render(<TextField label="Email" value="" onChange={() => {}} />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("delivers the input value rather than the change event", () => {
    const values: string[] = [];
    render(<TextField label="Name" value="" onChange={(value) => values.push(value)} />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Aurora" } });

    expect(values).toEqual(["Aurora"]);
  });

  it("renders help text when provided", () => {
    render(
      <TextField
        label="Email"
        value=""
        onChange={() => {}}
        help="Used only for sign-in."
      />,
    );

    expect(screen.getByText("Used only for sign-in.")).toBeInTheDocument();
  });

  it("renders the error and marks the input invalid", () => {
    render(
      <TextField label="Email" value="not-an-email" onChange={() => {}} error="Invalid email" />,
    );
    const input = screen.getByLabelText("Email");

    expect(screen.getByText("Invalid email")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("defaults to a text input and forwards inputSize", () => {
    render(<TextField label="Query" value="" onChange={() => {}} inputSize="lg" />);
    const input = screen.getByLabelText("Query");

    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("data-size", "lg");
  });
});
