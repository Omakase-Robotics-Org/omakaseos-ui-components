/**
 * @file The pointer-state contract for useDirectEditSurface.
 *
 * The probe div is deliberately only the surface props returned by the hook.
 * These jsdom cases pin the gesture boundary, rAF coalescing, modality seam,
 * and the negative guarantee that the hook reports intents without mutating a
 * document itself.
 */

import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DRAG_SLOP_PX,
  type DirectEditSurface,
  type DirectEditSurfaceOptions,
  type EditScene,
  type EditIntent,
  type PointerModality,
  useDirectEditSurface,
} from "./index";

const CAPABILITIES = { areas: { supported: true } } as const;
const TOLERANCE = {
  handleM: 0.5,
  ghostM: 0.4,
  knobM: 0.4,
  badgeM: 0.4,
  headingArmM: 1,
} as const;
const HANDLE_SCENE: EditScene = {
  handles: [{ id: "h0", x: 0, y: 0, yaw: 0 }],
  paths: [],
  areas: [],
};
const PATH_SCENE: EditScene = {
  handles: [
    { id: "h0", x: 0, y: 0 },
    { id: "h1", x: 10, y: 0 },
  ],
  paths: [{ id: "route", handleIds: ["h0", "h1"] }],
  areas: [],
};

const frameState = { next: 0 };
const pendingFrames = new Map<number, FrameRequestCallback>();

function flushRaf(): void {
  const frames = [...pendingFrames.entries()];
  pendingFrames.clear();
  frames.forEach(([, callback]) => callback(0));
}

function renderProbe(options: DirectEditSurfaceOptions) {
  const observed: {
    surface: DirectEditSurface | null;
    renders: number;
  } = { surface: null, renders: 0 };
  function Probe({ value }: { readonly value: DirectEditSurfaceOptions }) {
    const surface = useDirectEditSurface(value);
    observed.surface = surface;
    observed.renders += 1;
    return <div data-testid="surface" {...surface.surfaceProps} />;
  }
  const rendered = render(<Probe value={options} />);
  return { ...rendered, observed };
}

function surfaceOf(observed: { surface: DirectEditSurface | null }): DirectEditSurface {
  if (observed.surface === null) {
    throw new Error("surface was not rendered");
  }
  return observed.surface;
}

function optionsFor(
  overrides: Partial<DirectEditSurfaceOptions> = {},
): DirectEditSurfaceOptions {
  return {
    mode: "direct",
    scene: HANDLE_SCENE,
    selection: null,
    capabilities: CAPABILITIES,
    tolerance: TOLERANCE,
    drawing: null,
    toWorld: (clientX, clientY) => ({ x: clientX, y: clientY }),
    onIntent: vi.fn<(intent: EditIntent) => void>(),
    ...overrides,
  };
}

function pointerDown(surface: HTMLElement, overrides: Record<string, unknown> = {}): void {
  fireEvent.pointerDown(surface, {
    pointerId: 1,
    pointerType: "mouse",
    clientX: 0,
    clientY: 0,
    button: 0,
    buttons: 1,
    ...overrides,
  });
}

function pointerMove(surface: HTMLElement, clientX: number, clientY = 0): void {
  fireEvent.pointerMove(surface, {
    pointerId: 1,
    pointerType: "mouse",
    clientX,
    clientY,
    buttons: 1,
  });
}

function pointerUp(surface: HTMLElement, clientX: number, clientY = 0): void {
  fireEvent.pointerUp(surface, {
    pointerId: 1,
    pointerType: "mouse",
    clientX,
    clientY,
    button: 0,
    buttons: 0,
  });
}

function pointerCancel(surface: HTMLElement): void {
  fireEvent.pointerCancel(surface, {
    pointerId: 1,
    pointerType: "mouse",
    clientX: 7,
    clientY: 0,
    buttons: 0,
  });
}

beforeEach(() => {
  frameState.next = 0;
  pendingFrames.clear();
  vi.stubGlobal(
    "requestAnimationFrame",
    (callback: FrameRequestCallback) => {
      frameState.next += 1;
      pendingFrames.set(frameState.next, callback);
      return frameState.next;
    },
  );
  vi.stubGlobal("cancelAnimationFrame", (frame: number) => {
    pendingFrames.delete(frame);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useDirectEditSurface", () => {
  it("locks the camera synchronously before returning from a grip press and captures the pointer", () => {
    const order: string[] = [];
    const onCameraLock = vi.fn((locked: boolean) => {
      order.push(`lock:${locked}`);
    });
    const onIntent = vi.fn();
    const { getByTestId } = renderProbe(
      optionsFor({ onCameraLock, onIntent }),
    );
    const surface = getByTestId("surface") as HTMLElement;
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    Object.defineProperty(surface, "setPointerCapture", {
      configurable: true,
      value: setPointerCapture,
    });
    Object.defineProperty(surface, "releasePointerCapture", {
      configurable: true,
      value: releasePointerCapture,
    });

    order.push("before-handler");
    pointerDown(surface);
    order.push("after-handler");

    expect(order).toEqual(["before-handler", "lock:true", "after-handler"]);
    expect(setPointerCapture).toHaveBeenCalledWith(1);

    pointerUp(surface, 0);
    expect(releasePointerCapture).toHaveBeenCalledWith(1);
    expect(onCameraLock).toHaveBeenLastCalledWith(false);
  });

  it("keeps a floor miss as an inert press and reports no intent on a null-world click", () => {
    const onIntent = vi.fn();
    const onCameraLock = vi.fn();
    const { getByTestId } = renderProbe(
      optionsFor({
        onIntent,
        onCameraLock,
        toWorld: () => null,
      }),
    );
    const surface = getByTestId("surface") as HTMLElement;

    pointerDown(surface);
    pointerUp(surface, 0);

    expect(onIntent).not.toHaveBeenCalled();
    expect(onCameraLock).not.toHaveBeenCalled();
  });

  it("coalesces moves, creates the grip preview after slop, and keeps it on an off-floor move", () => {
    const onIntent = vi.fn();
    const onRefused = vi.fn();
    const toWorld = vi.fn((clientX: number, clientY: number) =>
      clientX === 10 ? null : { x: clientX, y: clientY },
    );
    const { getByTestId, observed } = renderProbe(
      optionsFor({ onIntent, onRefused, toWorld }),
    );
    const surface = getByTestId("surface") as HTMLElement;

    pointerDown(surface);
    pointerMove(surface, DRAG_SLOP_PX + 1);
    pointerMove(surface, DRAG_SLOP_PX + 2);
    expect(surface.getAttribute("data-edit-drag")).toBeNull();
    act(() => flushRaf());

    expect(surface.getAttribute("data-edit-drag")).toBe("true");
    expect(surfaceOf(observed).drag).toEqual({
      kind: "move",
      id: "h0",
      at: { x: DRAG_SLOP_PX + 2, y: 0 },
    });
    expect(surfaceOf(observed).surfaceProps.style).toEqual({ cursor: "grabbing" });

    pointerMove(surface, 10);
    act(() => flushRaf());
    expect(surfaceOf(observed).drag).toEqual({
      kind: "move",
      id: "h0",
      at: { x: DRAG_SLOP_PX + 2, y: 0 },
    });

    pointerUp(surface, 10);
    expect(onIntent).not.toHaveBeenCalled();
    expect(onRefused).toHaveBeenCalledWith("released outside the floor");
  });

  it("treats exactly the slop distance as a click and one pixel beyond it as a drag", () => {
    const onIntent = vi.fn();
    const { getByTestId, observed } = renderProbe(optionsFor({ onIntent }));
    const surface = getByTestId("surface") as HTMLElement;

    pointerDown(surface);
    pointerMove(surface, DRAG_SLOP_PX);
    act(() => flushRaf());
    expect(surfaceOf(observed).drag).toBeNull();
    expect(surface.getAttribute("data-edit-drag")).toBeNull();
    pointerUp(surface, DRAG_SLOP_PX);
    expect(onIntent).toHaveBeenCalledTimes(1);
    expect(onIntent).toHaveBeenLastCalledWith({ kind: "deselect" });

    onIntent.mockClear();
    pointerDown(surface);
    pointerMove(surface, DRAG_SLOP_PX + 1);
    act(() => flushRaf());
    expect(surface.getAttribute("data-edit-drag")).toBe("true");
    pointerUp(surface, DRAG_SLOP_PX + 1);
    expect(onIntent).toHaveBeenCalledTimes(1);
    expect(onIntent).toHaveBeenLastCalledWith({
      kind: "move",
      id: "h0",
      at: { x: DRAG_SLOP_PX + 1, y: 0 },
    });
  });

  it("reports exactly one intent for a live drag", () => {
    const onIntent = vi.fn();
    const { getByTestId } = renderProbe(optionsFor({ onIntent }));
    const surface = getByTestId("surface") as HTMLElement;

    pointerDown(surface);
    pointerMove(surface, DRAG_SLOP_PX + 1);
    act(() => flushRaf());
    pointerMove(surface, DRAG_SLOP_PX + 2);
    act(() => flushRaf());
    pointerUp(surface, DRAG_SLOP_PX + 2);
    fireEvent.pointerUp(surface, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: DRAG_SLOP_PX + 2,
      clientY: 0,
      buttons: 0,
    });

    expect(onIntent).toHaveBeenCalledTimes(1);
  });

  it("cancels a drag without an intent and unlocks the camera", () => {
    const onIntent = vi.fn();
    const onCameraLock = vi.fn();
    const { getByTestId, observed } = renderProbe(
      optionsFor({ onIntent, onCameraLock }),
    );
    const surface = getByTestId("surface") as HTMLElement;
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    Object.defineProperty(surface, "setPointerCapture", {
      configurable: true,
      value: setPointerCapture,
    });
    Object.defineProperty(surface, "releasePointerCapture", {
      configurable: true,
      value: releasePointerCapture,
    });

    pointerDown(surface);
    pointerMove(surface, DRAG_SLOP_PX + 1);
    act(() => flushRaf());
    pointerCancel(surface);

    expect(onIntent).not.toHaveBeenCalled();
    expect(onCameraLock.mock.calls.map(([locked]) => locked)).toEqual([true, false]);
    expect(releasePointerCapture).toHaveBeenCalledWith(1);
    expect(surfaceOf(observed).drag).toBeNull();
    expect(surface.getAttribute("data-edit-drag")).toBeNull();
  });

  it("cancels on leave without capture, but keeps a captured press alive", () => {
    const onIntent = vi.fn();
    const onCameraLock = vi.fn();
    const { getByTestId } = renderProbe(optionsFor({ onIntent, onCameraLock }));
    const surface = getByTestId("surface") as HTMLElement;

    pointerDown(surface);
    fireEvent.pointerLeave(surface, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 0,
      clientY: 0,
    });
    expect(onCameraLock.mock.calls.map(([locked]) => locked)).toEqual([true, false]);

    onCameraLock.mockClear();
    pointerDown(surface);
    const hasPointerCapture = vi.fn(() => true);
    Object.defineProperty(surface, "hasPointerCapture", {
      configurable: true,
      value: hasPointerCapture,
    });
    fireEvent.pointerLeave(surface, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 0,
      clientY: 0,
    });
    expect(onCameraLock).toHaveBeenCalledWith(true);
    expect(onCameraLock).not.toHaveBeenCalledWith(false);
    pointerUp(surface, 0);
  });

  it("exhausts append after one place intent", () => {
    const onIntent = vi.fn();
    const onModeExhausted = vi.fn();
    const { getByTestId } = renderProbe(
      optionsFor({ mode: "append", onIntent, onModeExhausted }),
    );
    const surface = getByTestId("surface") as HTMLElement;

    pointerDown(surface, { clientX: 20, clientY: 4 });
    pointerMove(surface, 20 + DRAG_SLOP_PX + 1, 4);
    act(() => flushRaf());
    pointerUp(surface, 20 + DRAG_SLOP_PX + 1, 4);
    expect(onIntent).not.toHaveBeenCalled();
    expect(onModeExhausted).not.toHaveBeenCalled();

    pointerDown(surface, { clientX: 20, clientY: 4 });
    pointerUp(surface, 20, 4);

    expect(onIntent).toHaveBeenCalledTimes(1);
    expect(onIntent).toHaveBeenLastCalledWith({ kind: "place", at: { x: 20, y: 4 } });
    expect(onModeExhausted).toHaveBeenCalledTimes(1);
  });

  it("maps rotate grips to yaw previews from the press-time origin", () => {
    const onIntent = vi.fn();
    const { getByTestId, observed } = renderProbe(
      optionsFor({ onIntent, selection: { kind: "handle", id: "h0" } }),
    );
    const surface = getByTestId("surface") as HTMLElement;

    pointerDown(surface, { clientX: 1, clientY: 0 });
    pointerMove(surface, 1, 7);
    act(() => flushRaf());

    expect(surfaceOf(observed).drag).toEqual({
      kind: "rotate",
      id: "h0",
      yaw: Math.atan2(7, 1),
    });
    pointerUp(surface, 1, 7);
    expect(onIntent).toHaveBeenLastCalledWith({
      kind: "rotate",
      id: "h0",
      yaw: Math.atan2(7, 1),
    });
  });

  it("initializes modality from hover capability and updates it from every pointer type", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { getByTestId, observed } = renderProbe(optionsFor({ scene: PATH_SCENE }));
    const surface = getByTestId("surface") as HTMLElement;

    expect(surfaceOf(observed).modality).toBe<PointerModality>("coarse");
    expect(surfaceOf(observed).persistentGhosts).toHaveLength(1);

    fireEvent.pointerMove(surface, {
      pointerId: 2,
      pointerType: "mouse",
      clientX: 5,
      clientY: 0,
      buttons: 0,
    });
    act(() => flushRaf());
    expect(surfaceOf(observed).modality).toBe<PointerModality>("fine");
    expect(surfaceOf(observed).persistentGhosts).toEqual([]);

    fireEvent.pointerMove(surface, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 5,
      clientY: 0,
      buttons: 0,
    });
    act(() => flushRaf());
    expect(surfaceOf(observed).modality).toBe<PointerModality>("coarse");
  });

  it("does not rerender for a structurally equal affordance", () => {
    const { getByTestId, observed } = renderProbe(optionsFor());
    const surface = getByTestId("surface") as HTMLElement;

    const beforeHover = observed.renders;
    fireEvent.pointerMove(surface, {
      pointerId: 4,
      pointerType: "mouse",
      clientX: 0,
      clientY: 0,
      buttons: 0,
    });
    act(() => flushRaf());
    const afterFirstHover = observed.renders;
    const firstAffordance = surfaceOf(observed).affordance;

    fireEvent.pointerMove(surface, {
      pointerId: 4,
      pointerType: "mouse",
      clientX: 0,
      clientY: 0,
      buttons: 0,
    });
    act(() => flushRaf());

    expect(afterFirstHover).toBeGreaterThan(beforeHover);
    expect(observed.renders).toBe(afterFirstHover);
    expect(surfaceOf(observed).affordance).toBe(firstAffordance);
  });

  it("uses crosshair outside direct mode and exposes no extra surface props", () => {
    const { getByTestId, observed } = renderProbe(optionsFor({ mode: "append" }));
    const surface = getByTestId("surface") as HTMLElement;
    const props = surfaceOf(observed).surfaceProps;

    expect(props.style).toEqual({ cursor: "crosshair" });
    expect(Object.keys(props).sort()).toEqual([
      "onPointerCancel",
      "onPointerDown",
      "onPointerLeave",
      "onPointerMove",
      "onPointerUp",
      "style",
    ]);
  });
});
