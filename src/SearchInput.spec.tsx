import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchInput } from "./SearchInput";

describe("SearchInput", () => {
  it("renders a textbox — NOT a searchbox — named by the required ariaLabel", () => {
    render(<SearchInput value="" onChange={() => {}} ariaLabel="Search robots" />);
    const input = screen.getByRole("textbox", { name: "Search robots" });
    expect(input).toHaveAttribute("type", "text");
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("delivers the raw string value through onChange, not the event", () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} ariaLabel="Search" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search" }), {
      target: { value: "g1-042" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("g1-042");
  });

  it("defaults to data-size=md and switches to lg", () => {
    const { container, rerender } = render(
      <SearchInput value="" onChange={() => {}} ariaLabel="Search" />,
    );
    expect(container.querySelector('[data-size="md"]')).not.toBeNull();
    rerender(<SearchInput value="" onChange={() => {}} ariaLabel="Search" size="lg" />);
    expect(container.querySelector('[data-size="lg"]')).not.toBeNull();
  });

  it("renders the placeholder when provided", () => {
    render(
      <SearchInput
        value=""
        onChange={() => {}}
        ariaLabel="Search"
        placeholder="Search FAQs…"
      />,
    );
    expect(screen.getByPlaceholderText("Search FAQs…")).toBeInTheDocument();
  });

  it("reflects the controlled value", () => {
    render(<SearchInput value="preset" onChange={() => {}} ariaLabel="Search" />);
    expect(screen.getByRole("textbox", { name: "Search" })).toHaveValue("preset");
  });
});
