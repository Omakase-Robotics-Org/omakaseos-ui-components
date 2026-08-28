import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Table,
  TableCell,
  TableHeaderCell,
  TableNotice,
  TableRow,
  TableSurface,
} from "./Table";

describe("TableSurface", () => {
  it("renders its children inside a plain scroll container", () => {
    render(<TableSurface>content</TableSurface>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("reports fill and padded as attributes, and omits them by default", () => {
    const { container, rerender } = render(<TableSurface>x</TableSurface>);
    const surface = container.firstElementChild;
    expect(surface?.hasAttribute("data-fill")).toBe(false);
    expect(surface?.hasAttribute("data-padded")).toBe(false);

    rerender(
      <TableSurface fill padded>
        x
      </TableSurface>,
    );
    expect(container.firstElementChild?.getAttribute("data-fill")).toBe("true");
    expect(container.firstElementChild?.getAttribute("data-padded")).toBe("true");
  });
});

describe("Table", () => {
  it("defaults to comfortable density, and reports compact when asked", () => {
    const { container, rerender } = render(
      <Table>
        <tbody />
      </Table>,
    );
    expect(container.querySelector("table")?.getAttribute("data-density")).toBe("comfortable");

    rerender(
      <Table density="compact">
        <tbody />
      </Table>,
    );
    expect(container.querySelector("table")?.getAttribute("data-density")).toBe("compact");
  });
});

describe("TableHeaderCell", () => {
  it("renders non-sortable content in a <span>, never a disabled <button>", () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHeaderCell>Name</TableHeaderCell>
          </tr>
        </thead>
      </table>,
    );
    const th = screen.getByRole("columnheader");
    expect(th.querySelector("button")).toBeNull();
    expect(th.querySelector("span")).toHaveTextContent("Name");
    expect(th).not.toHaveAttribute("aria-sort");
    expect(th).not.toHaveAttribute("data-sortable");
  });

  it("renders a sortable column as a button and reports aria-sort from the sort direction", () => {
    const onSort = vi.fn();
    const { rerender } = render(
      <table>
        <thead>
          <tr>
            <TableHeaderCell sort={{ direction: null, onSort }}>Name</TableHeaderCell>
          </tr>
        </thead>
      </table>,
    );
    const button = screen.getByRole("button", { name: "Name" });
    expect(button.closest("th")).toHaveAttribute("aria-sort", "none");
    expect(button.closest("th")).toHaveAttribute("data-sortable", "true");

    fireEvent.click(button);
    expect(onSort).toHaveBeenCalledTimes(1);

    rerender(
      <table>
        <thead>
          <tr>
            <TableHeaderCell sort={{ direction: "asc", onSort }}>Name</TableHeaderCell>
          </tr>
        </thead>
      </table>,
    );
    expect(screen.getByRole("button", { name: "Name" }).closest("th")).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    rerender(
      <table>
        <thead>
          <tr>
            <TableHeaderCell sort={{ direction: "desc", onSort }}>Name</TableHeaderCell>
          </tr>
        </thead>
      </table>,
    );
    expect(screen.getByRole("button", { name: "Name" }).closest("th")).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });

  it("reports end-alignment on both the th and its label box", () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHeaderCell align="end">Count</TableHeaderCell>
          </tr>
        </thead>
      </table>,
    );
    const th = screen.getByRole("columnheader");
    expect(th).toHaveAttribute("data-align", "end");
    expect(th.querySelector("span")).toHaveAttribute("data-align", "end");
  });
});

describe("TableRow", () => {
  // A virtualizer (@tanstack/react-virtual) attaches `measureElement` as
  // the row ref. A component that swallowed the ref would silently break
  // row measurement — this pins that it does not.
  it("forwards its ref to the rendered <tr>", () => {
    const ref = createRef<HTMLTableRowElement>();
    render(
      <table>
        <tbody>
          <TableRow ref={ref}>
            <TableCell>content</TableCell>
          </TableRow>
        </tbody>
      </table>,
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("TR");
    expect(ref.current).toBe(screen.getByRole("row"));
  });

  it("reports clickable as an attribute, and omits it by default", () => {
    const { container, rerender } = render(
      <table>
        <tbody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </tbody>
      </table>,
    );
    expect(container.querySelector("tr")?.hasAttribute("data-clickable")).toBe(false);

    rerender(
      <table>
        <tbody>
          <TableRow clickable>
            <TableCell>x</TableCell>
          </TableRow>
        </tbody>
      </table>,
    );
    expect(container.querySelector("tr")?.getAttribute("data-clickable")).toBe("true");
  });

  it("fires onClick when the row is clicked", () => {
    const onClick = vi.fn();
    render(
      <table>
        <tbody>
          <TableRow onClick={onClick}>
            <TableCell>x</TableCell>
          </TableRow>
        </tbody>
      </table>,
    );
    fireEvent.click(screen.getByRole("row"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("TableCell", () => {
  it("renders its children in a <td>, reporting end-alignment as an attribute", () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableCell align="end">42</TableCell>
          </tr>
        </tbody>
      </table>,
    );
    const cell = screen.getByRole("cell");
    expect(cell).toHaveTextContent("42");
    expect(cell).toHaveAttribute("data-align", "end");
  });
});

describe("TableNotice", () => {
  it("renders its content as a status live region", () => {
    render(<TableNotice>Showing 50 of 4,201 rows</TableNotice>);
    expect(screen.getByRole("status")).toHaveTextContent("Showing 50 of 4,201 rows");
  });
});
