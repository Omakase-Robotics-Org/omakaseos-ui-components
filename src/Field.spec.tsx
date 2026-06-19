import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./Field";

describe("Field", () => {
  it("wires htmlFor between the label and the rendered control via the render-prop id", () => {
    render(
      <Field label="Email">
        {(id) => <input id={id} type="email" />}
      </Field>,
    );
    const input = screen.getByLabelText("Email");
    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("type")).toBe("email");
  });

  it("respects an explicit id over the generated one", () => {
    render(
      <Field label="Custom" id="custom-id">
        {(id) => <input id={id} />}
      </Field>,
    );
    const input = screen.getByLabelText("Custom");
    expect(input.id).toBe("custom-id");
  });

  it("renders help when error is not set", () => {
    render(
      <Field label="Email" help="We never share it.">
        {(id) => <input id={id} />}
      </Field>,
    );
    expect(screen.getByText("We never share it.")).toBeInTheDocument();
  });

  it("renders error in place of help when both are given", () => {
    render(
      <Field label="Email" help="hint" error="required">
        {(id) => <input id={id} />}
      </Field>,
    );
    expect(screen.getByText("required")).toBeInTheDocument();
    expect(screen.queryByText("hint")).toBeNull();
  });

  it("renders neither when error and help are absent", () => {
    const { container } = render(
      <Field label="Bare">
        {(id) => <input id={id} />}
      </Field>,
    );
    expect(container.querySelectorAll("p").length).toBe(0);
  });
});
