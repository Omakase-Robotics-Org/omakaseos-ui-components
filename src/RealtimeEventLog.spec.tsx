import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RealtimeEventLog } from "./RealtimeEventLog";
import type { RealtimeEventEntry } from "./RealtimeEventLog";

const ENTRY = (id: string, type: string, at?: string | null, summary?: string): RealtimeEventEntry => ({
  id,
  type,
  at: at ?? null,
  summary,
});

describe("RealtimeEventLog", () => {
  it("renders the entries in given order (oldest first, newest last)", () => {
    const entries: RealtimeEventEntry[] = [
      ENTRY("a", "session.created", "12:00:00"),
      ENTRY("b", "response.created", "12:00:01"),
      ENTRY("c", "response.output_text.delta", "12:00:02"),
    ];
    const { container } = render(<RealtimeEventLog entries={entries} />);
    const items = container.querySelectorAll('[data-event-type]');
    expect(items.length).toBe(3);
    expect(items[0]?.getAttribute("data-event-type")).toBe("session.created");
    expect(items[2]?.getAttribute("data-event-type")).toBe(
      "response.output_text.delta",
    );
  });

  it("trims to the most recent N when entries exceed max", () => {
    const entries: RealtimeEventEntry[] = Array.from({ length: 250 }, (_, i) =>
      ENTRY(String(i), `evt.${i}`),
    );
    const { container } = render(<RealtimeEventLog entries={entries} />);
    const items = container.querySelectorAll('[data-event-type]');
    expect(items.length).toBe(200);
    expect(items[0]?.getAttribute("data-event-type")).toBe("evt.50");
    expect(items[items.length - 1]?.getAttribute("data-event-type")).toBe(
      "evt.249",
    );
  });

  it("respects an explicit max", () => {
    const entries: RealtimeEventEntry[] = [
      ENTRY("a", "evt.1"),
      ENTRY("b", "evt.2"),
      ENTRY("c", "evt.3"),
    ];
    const { container } = render(<RealtimeEventLog entries={entries} max={2} />);
    const items = container.querySelectorAll('[data-event-type]');
    expect(items.length).toBe(2);
    expect(items[0]?.getAttribute("data-event-type")).toBe("evt.2");
  });

  it("renders the timestamp when present, hides when null/undefined", () => {
    const { rerender, container } = render(
      <RealtimeEventLog
        entries={[ENTRY("a", "t", "12:00:00")]}
      />,
    );
    expect(container.textContent).toContain("12:00:00");
    rerender(
      <RealtimeEventLog entries={[ENTRY("a", "t", null)]} />,
    );
    expect(container.textContent).not.toContain("12:00:00");
  });

  it("uses default aria-label and forwards data-testid", () => {
    render(<RealtimeEventLog entries={[]} />);
    expect(
      screen.getByTestId("realtime-event-log").getAttribute("aria-label"),
    ).toBe("realtime events");
  });

  it("accepts an aria-label override", () => {
    render(<RealtimeEventLog entries={[]} ariaLabel="event log" />);
    expect(
      screen.getByTestId("realtime-event-log").getAttribute("aria-label"),
    ).toBe("event log");
  });
});
