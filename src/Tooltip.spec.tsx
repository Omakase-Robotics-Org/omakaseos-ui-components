/**
 * @file Tooltip — jsdom coverage of the behavior a layout engine cannot
 * change: cloning (not wrapping), ARIA wiring, the shared delay clock, and
 * the dismissal rules. Positioning math itself (flip, cross-axis clamp,
 * the arrow following the resolved side) is NOT pinned here — jsdom
 * reports every rect as all-zero (the same limit `Popover.spec.tsx`'s own
 * header notes) — see `spec/overlay-tooltip.e2e.spec.ts` for that half and
 * `floating/anchored-position.spec.ts` for the core math itself.
 */
import { act, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tooltip, TooltipProvider } from "./Tooltip";

/** Escapes the `children: ReactElement` type so a runtime-only violation
 * (more than one child) can be exercised without fighting the compiler —
 * `Children.only`'s throw is a defense-in-depth runtime check, same as
 * `LinkAppearance.tsx`'s `asChild` path. */
const PermissiveTooltip = Tooltip as unknown as (props: {
  label: string;
  children: ReactNode;
}) => ReactElement;

function Harness(props: {
  side?: "top" | "right" | "bottom" | "left";
  enabled?: boolean;
  delayDuration?: number;
  skipDelayDuration?: number;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
}) {
  return (
    <TooltipProvider delayDuration={props.delayDuration ?? 100} skipDelayDuration={props.skipDelayDuration}>
      <Tooltip label="Battery 82%" side={props.side} enabled={props.enabled}>
        <button
          type="button"
          className={props.className}
          onPointerEnter={props.onPointerEnter}
          onPointerLeave={props.onPointerLeave}
          onFocus={props.onFocus}
          onBlur={props.onBlur}
        >
          trigger
        </button>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Advances the fake clock AND flushes the React updates a fired timer
 * enqueues (the timer callback's `setOpen`, and — for the panel's own
 * callback-ref measure — the follow-up `setPosition` it schedules during
 * that same mount) before the next assertion reads the DOM. */
async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Tooltip", () => {
  it("clones the trigger — no wrapper element between it and its parent", () => {
    const { container } = render(<Harness className="my-trigger" />);
    const trigger = screen.getByRole("button", { name: "trigger" });
    expect(trigger.parentElement).toBe(container);
    expect(trigger.className).toBe("my-trigger");
  });

  it("chains the child's own handlers instead of overwriting them", () => {
    const onPointerEnter = vi.fn();
    const onPointerLeave = vi.fn();
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    render(<Harness onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave} onFocus={onFocus} onBlur={onBlur} />);
    const trigger = screen.getByRole("button", { name: "trigger" });

    fireEvent.pointerEnter(trigger);
    expect(onPointerEnter).toHaveBeenCalledTimes(1);
    fireEvent.pointerLeave(trigger);
    expect(onPointerLeave).toHaveBeenCalledTimes(1);
    fireEvent.focus(trigger);
    expect(onFocus).toHaveBeenCalledTimes(1);
    fireEvent.blur(trigger);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("enabled=false renders the child alone — no tooltip role, no provider required", () => {
    render(
      <Tooltip label="Battery 82%" enabled={false}>
        <button type="button">trigger</button>
      </Tooltip>,
    );
    expect(screen.getByRole("button", { name: "trigger" })).toBeInTheDocument();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("throws when children is not exactly one element", () => {
    function TwoChildren() {
      return (
        <TooltipProvider>
          <PermissiveTooltip label="x">
            <button type="button">a</button>
            <button type="button">b</button>
          </PermissiveTooltip>
        </TooltipProvider>
      );
    }
    expect(() => render(<TwoChildren />)).toThrow();
  });

  it("throws when rendered without a TooltipProvider ancestor (unless disabled)", () => {
    function NoProvider() {
      return (
        <Tooltip label="x">
          <button type="button">trigger</button>
        </Tooltip>
      );
    }
    expect(() => render(<NoProvider />)).toThrow(/TooltipProvider/);
  });

  it("portals role=tooltip content to document.body, not the call-site subtree", () => {
    const { container } = render(<Harness />);
    const trigger = screen.getByRole("button", { name: "trigger" });
    fireEvent.focus(trigger);
    const tooltip = screen.getByRole("tooltip");
    expect(container.contains(tooltip)).toBe(false);
    expect(document.body.contains(tooltip)).toBe(true);
    expect(tooltip).toHaveTextContent("Battery 82%");
  });

  it("aria-describedby points at the live tooltip while open and is absent when closed", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "trigger" });
    expect(trigger).not.toHaveAttribute("aria-describedby");

    fireEvent.focus(trigger);
    const tooltip = screen.getByRole("tooltip");
    expect(trigger.getAttribute("aria-describedby")).toBe(tooltip.id);

    fireEvent.blur(trigger);
    expect(trigger).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("focus opens with no delay; blur closes immediately", () => {
    render(<Harness delayDuration={100} />);
    const trigger = screen.getByRole("button", { name: "trigger" });
    fireEvent.focus(trigger);
    // No timer advance at all — focus never waits on delayDuration.
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.blur(trigger);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("pointer hover waits delayDuration before opening", async () => {
    render(<Harness delayDuration={100} />);
    const trigger = screen.getByRole("button", { name: "trigger" });
    fireEvent.pointerEnter(trigger);
    expect(screen.queryByRole("tooltip")).toBeNull();
    await advance(99);
    expect(screen.queryByRole("tooltip")).toBeNull();
    await advance(1);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("a fresh hover-open stamps data-state=delayed-open (the default fade applies)", async () => {
    render(<Harness delayDuration={0} />);
    const trigger = screen.getByRole("button", { name: "trigger" });
    fireEvent.pointerEnter(trigger);
    await advance(0);
    expect(screen.getByRole("tooltip")).toHaveAttribute("data-state", "delayed-open");
  });

  it("pointerleave before the delay elapses cancels the pending open — it never opens", async () => {
    render(<Harness delayDuration={100} />);
    const trigger = screen.getByRole("button", { name: "trigger" });
    fireEvent.pointerEnter(trigger);
    await advance(50);
    fireEvent.pointerLeave(trigger);
    await advance(100);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("pointerleave closes an already-open tooltip immediately", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "trigger" });
    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerLeave(trigger);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("Escape closes an open tooltip", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "trigger" });
    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shared clock: a sibling tooltip opened within skipDelayDuration of a close opens INSTANTLY and is tagged instant-open", async () => {
    function Siblings() {
      const aRef = useRef<HTMLButtonElement>(null);
      const bRef = useRef<HTMLButtonElement>(null);
      return (
        <TooltipProvider delayDuration={200} skipDelayDuration={300}>
          <Tooltip label="First">
            <button type="button" ref={aRef}>
              first
            </button>
          </Tooltip>
          <Tooltip label="Second">
            <button type="button" ref={bRef}>
              second
            </button>
          </Tooltip>
        </TooltipProvider>
      );
    }
    render(<Siblings />);
    const first = screen.getByRole("button", { name: "first" });
    const second = screen.getByRole("button", { name: "second" });

    // First tooltip: no recent close, so it waits the full delayDuration.
    fireEvent.pointerEnter(first);
    await advance(200);
    expect(within(document.body).getByText("First")).toBeInTheDocument();
    expect(screen.getByRole("tooltip")).toHaveAttribute("data-state", "delayed-open");

    // Leaving the first stamps the shared clock's last-close instant.
    fireEvent.pointerLeave(first);
    expect(screen.queryByRole("tooltip")).toBeNull();

    // Second tooltip, well within skipDelayDuration: opens with NO wait.
    fireEvent.pointerEnter(second);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByRole("tooltip")).toHaveAttribute("data-state", "instant-open");
    expect(within(document.body).getByText("Second")).toBeInTheDocument();
  });

  it("shared clock: a hover long after the last close still waits the full delay (no stale instant-open)", async () => {
    function Siblings() {
      return (
        <TooltipProvider delayDuration={200} skipDelayDuration={50}>
          <Tooltip label="First">
            <button type="button">first</button>
          </Tooltip>
          <Tooltip label="Second">
            <button type="button">second</button>
          </Tooltip>
        </TooltipProvider>
      );
    }
    render(<Siblings />);
    const first = screen.getByRole("button", { name: "first" });
    const second = screen.getByRole("button", { name: "second" });

    fireEvent.pointerEnter(first);
    await advance(200);
    fireEvent.pointerLeave(first);

    // Well past skipDelayDuration (50ms) before the second is hovered.
    await advance(200);
    fireEvent.pointerEnter(second);
    expect(screen.queryByRole("tooltip")).toBeNull();
    await advance(200);
    expect(screen.getByRole("tooltip")).toHaveAttribute("data-state", "delayed-open");
  });
});
