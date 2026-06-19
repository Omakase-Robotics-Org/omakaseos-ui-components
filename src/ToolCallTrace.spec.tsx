import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolCallTrace } from "./ToolCallTrace";

describe("ToolCallTrace", () => {
  it("renders the tool name and the status badge text", () => {
    render(
      <ToolCallTrace
        name="search_inventory"
        args={{ q: "bolts" }}
        status="running"
      />,
    );
    expect(screen.getByText("search_inventory")).toBeInTheDocument();
    expect(screen.getByText("running")).toBeInTheDocument();
  });

  it("formats parsed args as pretty JSON when args is given", () => {
    render(
      <ToolCallTrace
        name="x"
        args={{ a: 1, b: "two" }}
        status="succeeded"
      />,
    );
    const pre = screen.getByTestId("tool-call-args");
    expect(pre.textContent).toContain('"a": 1');
    expect(pre.textContent).toContain('"b": "two"');
  });

  it("uses argsRaw verbatim when args is undefined (streaming branch)", () => {
    render(
      <ToolCallTrace
        name="x"
        argsRaw='{"q":"bolt'
        status="running"
      />,
    );
    expect(screen.getByTestId("tool-call-args").textContent).toBe('{"q":"bolt');
  });

  it("prefers args over argsRaw when both are given", () => {
    render(
      <ToolCallTrace
        name="x"
        args={{ q: "final" }}
        argsRaw='{"q":"partial'
        status="succeeded"
      />,
    );
    const text = screen.getByTestId("tool-call-args").textContent ?? "";
    expect(text).toContain("final");
    expect(text).not.toContain("partial");
  });

  it("propagates status via data-status", () => {
    const { container } = render(
      <ToolCallTrace name="x" status="failed" />,
    );
    expect(container.querySelector('[data-status="failed"]')).not.toBeNull();
  });

  it("renders a result block only when result is provided", () => {
    const { rerender, queryByTestId } = render(
      <ToolCallTrace name="x" status="succeeded" />,
    );
    expect(queryByTestId("tool-call-result")).toBeNull();
    rerender(
      <ToolCallTrace name="x" status="succeeded" result={<span>OK</span>} />,
    );
    expect(queryByTestId("tool-call-result")?.textContent).toBe("OK");
  });

  it("uses statusLabel override when given", () => {
    render(
      <ToolCallTrace name="x" status="running" statusLabel="executing…" />,
    );
    expect(screen.getByText("executing…")).toBeInTheDocument();
    expect(screen.queryByText("running")).toBeNull();
  });
});
