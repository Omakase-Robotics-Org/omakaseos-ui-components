import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Select } from "./Select";

describe("Select", () => {
  it("renders the native select with its options", () => {
    render(
      <Select aria-label="lang">
        <option value="en">English</option>
        <option value="ja">日本語</option>
      </Select>,
    );
    const select = screen.getByRole("combobox", { name: "lang" });
    expect(select).toBeInTheDocument();
    expect(select.querySelectorAll("option").length).toBe(2);
  });

  it("propagates selectSize and invalid", () => {
    const { container } = render(
      <Select aria-label="x" selectSize="sm" invalid>
        <option value="a">a</option>
      </Select>,
    );
    expect(container.querySelector('[data-size="sm"]')).not.toBeNull();
    expect(container.querySelector('[data-invalid="true"]')).not.toBeNull();
    const select = container.querySelector("select");
    expect(select?.getAttribute("aria-invalid")).toBe("true");
  });
});
