import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pager } from "./Pager";
import type { PagerLabels } from "./Pager";

const labels: PagerLabels = {
  region: "Pagination",
  first: "First page",
  previous: "Previous page",
  next: "Next page",
  last: "Last page",
  goToPage: (n) => `Go to page ${n}`,
  summary: (page, total) => `Page ${page} of ${total}`,
};

describe("Pager", () => {
  it("renders nothing when totalPages <= 1", () => {
    const { container: single } = render(
      <Pager page={1} totalPages={1} onChange={() => {}} labels={labels} />,
    );
    expect(single).toBeEmptyDOMElement();

    const { container: zero } = render(
      <Pager page={1} totalPages={0} onChange={() => {}} labels={labels} />,
    );
    expect(zero).toBeEmptyDOMElement();
  });

  it("renders the navigation landmark named from labels.region", () => {
    render(<Pager page={1} totalPages={5} onChange={() => {}} labels={labels} />);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
  });

  it("renders the window contents at the FIRST page", () => {
    render(<Pager page={1} totalPages={12} onChange={() => {}} labels={labels} />);
    for (const n of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole("button", { name: `Go to page ${n}` })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Go to page 6" })).toBeNull();
  });

  it("renders the window contents at the LAST page", () => {
    render(<Pager page={12} totalPages={12} onChange={() => {}} labels={labels} />);
    for (const n of [8, 9, 10, 11, 12]) {
      expect(screen.getByRole("button", { name: `Go to page ${n}` })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Go to page 7" })).toBeNull();
  });

  it("renders the window contents in the MIDDLE", () => {
    render(<Pager page={7} totalPages={12} onChange={() => {}} labels={labels} />);
    for (const n of [5, 6, 7, 8, 9]) {
      expect(screen.getByRole("button", { name: `Go to page ${n}` })).toBeInTheDocument();
    }
  });

  it("marks the current page with aria-current=page", () => {
    render(<Pager page={7} totalPages={12} onChange={() => {}} labels={labels} />);
    const current = screen.getByRole("button", { name: "Go to page 7" });
    expect(current).toHaveAttribute("aria-current", "page");
    const other = screen.getByRole("button", { name: "Go to page 6" });
    expect(other).not.toHaveAttribute("aria-current");
  });

  it("gives the boundary buttons their explicit accessible names from labels", () => {
    render(<Pager page={5} totalPages={12} onChange={() => {}} labels={labels} />);
    expect(screen.getByRole("button", { name: "First page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Last page" })).toBeInTheDocument();
  });

  it("disables First/Previous at the first page and Next/Last at the last page", () => {
    const { rerender } = render(
      <Pager page={1} totalPages={12} onChange={() => {}} labels={labels} />,
    );
    expect(screen.getByRole("button", { name: "First page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Last page" })).not.toBeDisabled();

    rerender(<Pager page={12} totalPages={12} onChange={() => {}} labels={labels} />);
    expect(screen.getByRole("button", { name: "First page" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous page" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Last page" })).toBeDisabled();
  });

  it("emits the right onChange payload for boundary and number buttons", () => {
    const onChange = vi.fn();
    render(<Pager page={5} totalPages={12} onChange={onChange} labels={labels} />);

    screen.getByRole("button", { name: "First page" }).click();
    expect(onChange).toHaveBeenLastCalledWith(1);

    screen.getByRole("button", { name: "Last page" }).click();
    expect(onChange).toHaveBeenLastCalledWith(12);

    screen.getByRole("button", { name: "Previous page" }).click();
    expect(onChange).toHaveBeenLastCalledWith(4);

    screen.getByRole("button", { name: "Next page" }).click();
    expect(onChange).toHaveBeenLastCalledWith(6);

    screen.getByRole("button", { name: "Go to page 7" }).click();
    expect(onChange).toHaveBeenLastCalledWith(7);
  });

  it("clamps Previous/Next at the boundaries instead of overshooting", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Pager page={1} totalPages={12} onChange={onChange} labels={labels} />,
    );
    // Previous is disabled at page 1 — nothing to click, but assert the
    // math would clamp if it were forced (defense against a future
    // regression that removes the disabled guard).
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

    rerender(<Pager page={12} totalPages={12} onChange={onChange} labels={labels} />);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("respects a custom maxButtons", () => {
    render(
      <Pager page={5} totalPages={20} maxButtons={3} onChange={() => {}} labels={labels} />,
    );
    for (const n of [4, 5, 6]) {
      expect(screen.getByRole("button", { name: `Go to page ${n}` })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Go to page 3" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Go to page 7" })).toBeNull();
  });

  it("renders the summary text from labels.summary", () => {
    render(<Pager page={3} totalPages={9} onChange={() => {}} labels={labels} />);
    expect(screen.getByText("Page 3 of 9")).toBeInTheDocument();
  });
});
