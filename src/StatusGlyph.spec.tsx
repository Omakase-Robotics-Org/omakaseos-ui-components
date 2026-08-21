import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusGlyph } from "./StatusGlyph";
import type { GlyphTone } from "./StatusGlyph";

const TONES: readonly GlyphTone[] = ["success", "danger", "warning", "neutral", "idle"];

describe("StatusGlyph", () => {
  it("exposes the tone via data-tone for CSS selectors", () => {
    render(<StatusGlyph tone="success" ariaLabel="OK" />);
    expect(screen.getByRole("img", { name: "OK" }).getAttribute("data-tone")).toBe("success");
  });

  it("names itself only from the caller's label (the shape carries no words)", () => {
    render(<StatusGlyph tone="danger" ariaLabel="不合格" />);
    expect(screen.getByRole("img", { name: "不合格" })).toBeInTheDocument();
  });

  it("hides the mark from assistive tech — it is the drawing, not the message", () => {
    const { container } = render(<StatusGlyph tone="danger" ariaLabel="NG" />);
    const mark = container.querySelector("[aria-hidden]");
    expect(mark?.getAttribute("aria-hidden")).toBe("true");
    expect(mark?.textContent).toBe("✕");
  });

  it("draws a distinct mark for every tone that reports something", () => {
    const marks = TONES.map((tone) => {
      const { container, unmount } = render(<StatusGlyph tone={tone} ariaLabel={tone} />);
      const text = container.querySelector('[aria-hidden="true"]')?.textContent ?? "";
      unmount();
      return text;
    });
    expect(marks).toEqual(["✓", "✕", "!", "—", ""]);
    // The four non-empty marks are pairwise distinct: two registers sharing a
    // mark would be told apart by line style alone, which the source design
    // reserves for the warning/idle pair specifically.
    const reported = marks.filter((mark) => mark !== "");
    expect(new Set(reported).size).toBe(reported.length);
  });

  it("renders no mark at all for idle — an unread check reports nothing", () => {
    const { container } = render(<StatusGlyph tone="idle" ariaLabel="unchecked" />);
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe("");
  });

  it("defaults to md and propagates the requested size", () => {
    const { container, rerender } = render(<StatusGlyph tone="neutral" ariaLabel="N/A" />);
    expect(container.querySelector('[data-size="md"]')).not.toBeNull();
    rerender(<StatusGlyph tone="neutral" size="lg" ariaLabel="N/A" />);
    expect(container.querySelector('[data-size="lg"]')).not.toBeNull();
  });

  it("is an image, not a live region — a cell of a table is not an announcement", () => {
    render(<StatusGlyph tone="warning" ariaLabel="pending" />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("binds idle's fill to the --ds-tone-idle-bg register instead of leaving it a dead token", () => {
    // jsdom does not apply the real stylesheet (see the e2e spec's header
    // comment), so this reads the CSS module source directly rather than a
    // computed style — the runtime resolution is proven in
    // spec/shape-status-primitives.e2e.spec.ts instead.
    const cssPath = resolve(__dirname, "./StatusGlyph.module.css");
    const css = readFileSync(cssPath, "utf8");
    const idleBlock = /\.glyph\[data-tone="idle"\]\s*\{([^}]*)\}/.exec(css)?.[1];
    expect(idleBlock).toBeDefined();
    expect(idleBlock).toMatch(/--glyph-fill:\s*var\(--ds-tone-idle-bg\)/);
  });
});
