/**
 * @file The pointer-state contract for useDirectEditSurface.
 *
 * The probe div is deliberately only the surface props returned by the hook.
 * These jsdom cases pin the gesture boundary, rAF coalescing, modality and
 * modifier seams, the per-class slop, the single `preventDefault`, and the
 * negative guarantee that the hook reports intents without mutating a document
 * itself.
 *
 * What jsdom CANNOT show is pinned in the browser proof instead
 * (`spec/direct-manipulation.e2e.spec.ts`): computed cursors, layout, floating
 * affordances colliding with each other. A `render()` here is not evidence
 * about any of those.
 */

import { act, fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DRAG_SLOP_PX,
  EMPTY_SELECTION,
  type DirectEditSurface,
  type DirectEditSurfaceOptions,
  type EditScene,
  type EditIntent,
  type EditSelection,
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
  revealM: 2,
  snapM: 0.3,
} as const;
const NO_SNAPPING = { enabled: false, toGeometry: false, toGrid: false } as const;
const MOVE_SLOP = DRAG_SLOP_PX.move.fine;
const ROTATE_SLOP = DRAG_SLOP_PX.rotate.fine;

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
const SELECTED_H0: EditSelection = {
  targets: [{ kind: "handle", id: "h0" }],
  primary: { kind: "handle", id: "h0" },
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
    arming: "sustained",
    scene: HANDLE_SCENE,
    selection: EMPTY_SELECTION,
    capabilities: CAPABILITIES,
    tolerance: TOLERANCE,
    drawing: null,
    snapping: NO_SNAPPING,
    grid: null,
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

function pointerMove(
  surface: HTMLElement,
  clientX: number,
  clientY = 0,
  overrides: Record<string, unknown> = {},
): void {
  fireEvent.pointerMove(surface, {
    pointerId: 1,
    pointerType: "mouse",
    clientX,
    clientY,
    buttons: 1,
    ...overrides,
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

  it("coalesces moves, previews the move set after slop, and keeps it on an off-floor move", () => {
    const onIntent = vi.fn();
    const onRefused = vi.fn();
    const toWorld = vi.fn((clientX: number, clientY: number) =>
      clientX === 40 ? null : { x: clientX, y: clientY },
    );
    const { getByTestId, observed } = renderProbe(
      optionsFor({ onIntent, onRefused, toWorld }),
    );
    const surface = getByTestId("surface") as HTMLElement;

    pointerDown(surface);
    pointerMove(surface, MOVE_SLOP + 1);
    pointerMove(surface, MOVE_SLOP + 2);
    expect(surface.getAttribute("data-edit-drag")).toBeNull();
    act(() => flushRaf());

    expect(surface.getAttribute("data-edit-drag")).toBe("true");
    expect(surfaceOf(observed).drag).toEqual({
      kind: "move-set",
      moves: [{ target: { kind: "handle", id: "h0" }, at: { x: MOVE_SLOP + 2, y: 0 } }],
    });
    expect(surfaceOf(observed).surfaceProps.style).toEqual({ cursor: "grabbing" });
    expect(surfaceOf(observed).surfaceProps["data-edit-cursor"]).toBe("grabbing");

    pointerMove(surface, 40);
    act(() => flushRaf());
    expect(surfaceOf(observed).drag).toEqual({
      kind: "move-set",
      moves: [{ target: { kind: "handle", id: "h0" }, at: { x: MOVE_SLOP + 2, y: 0 } }],
    });

    pointerUp(surface, 40);
    expect(onIntent).not.toHaveBeenCalled();
    expect(onRefused).toHaveBeenCalledWith("released outside the floor");
  });

  it("treats exactly the class's slop as a click and one pixel beyond it as a drag", () => {
    const onIntent = vi.fn();
    const { getByTestId, observed } = renderProbe(optionsFor({ onIntent }));
    const surface = getByTestId("surface") as HTMLElement;

    pointerDown(surface);
    pointerMove(surface, MOVE_SLOP);
    act(() => flushRaf());
    expect(surfaceOf(observed).drag).toBeNull();
    expect(surface.getAttribute("data-edit-drag")).toBeNull();
    pointerUp(surface, MOVE_SLOP);
    expect(onIntent).toHaveBeenCalledTimes(1);
    // A click is resolved where it was RELEASED, not where it was pressed: at
    // MOVE_SLOP away the handle is out of tolerance, so this is empty floor.
    expect(onIntent).toHaveBeenLastCalledWith({ kind: "deselect" });

    onIntent.mockClear();
    pointerDown(surface);
    pointerMove(surface, MOVE_SLOP + 1);
    act(() => flushRaf());
    expect(surface.getAttribute("data-edit-drag")).toBe("true");
    pointerUp(surface, MOVE_SLOP + 1);
    expect(onIntent).toHaveBeenCalledTimes(1);
    expect(onIntent).toHaveBeenLastCalledWith({
      kind: "move-set",
      moves: [{ target: { kind: "handle", id: "h0" }, at: { x: MOVE_SLOP + 1, y: 0 } }],
    });
  });

  it("takes each grip class's own slop, so a knob twist engages before a move would", () => {
    // A rotation is a twist on a small dedicated target: waiting for a move's
    // travel would swallow the first degrees of every rotation.
    expect(ROTATE_SLOP).toBeLessThan(MOVE_SLOP);
    const onIntent = vi.fn();
    const { getByTestId, observed } = renderProbe(
      optionsFor({ onIntent, selection: SELECTED_H0 }),
    );
    const surface = getByTestId("surface") as HTMLElement;

    // Press the knob (headingArmM = 1 along yaw 0), then travel a distance that
    // is past the rotate slop but not past the move slop.
    pointerDown(surface, { clientX: 1, clientY: 0 });
    pointerMove(surface, 1, ROTATE_SLOP + 1);
    act(() => flushRaf());
    expect(surface.getAttribute("data-edit-drag")).toBe("true");
    expect(surfaceOf(observed).drag?.kind).toBe("rotate");
  });

  it("reports exactly one intent for a live drag", () => {
    const onIntent = vi.fn();
    const { getByTestId } = renderProbe(optionsFor({ onIntent }));
    const surface = getByTestId("surface") as HTMLElement;

    pointerDown(surface);
    pointerMove(surface, MOVE_SLOP + 1);
    act(() => flushRaf());
    pointerMove(surface, MOVE_SLOP + 2);
    act(() => flushRaf());
    pointerUp(surface, MOVE_SLOP + 2);
    fireEvent.pointerUp(surface, {
      pointerId: 1,
      pointerType: "mouse",
      clientX: MOVE_SLOP + 2,
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
    pointerMove(surface, MOVE_SLOP + 1);
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

  it("exhausts append only when the host declared one-shot arming", () => {
    const onIntent = vi.fn();
    const onModeExhausted = vi.fn();
    const sustained = renderProbe(
      optionsFor({ mode: "append", arming: "sustained", onIntent, onModeExhausted }),
    );
    const sustainedSurface = within(sustained.container).getByTestId("surface");

    pointerDown(sustainedSurface, { clientX: 20, clientY: 4 });
    pointerUp(sustainedSurface, 20, 4);
    expect(onIntent).toHaveBeenLastCalledWith({ kind: "place", at: { x: 20, y: 4 } });
    expect(onModeExhausted).not.toHaveBeenCalled();

    onIntent.mockClear();
    const oneShot = renderProbe(
      optionsFor({ mode: "append", arming: "one-shot", onIntent, onModeExhausted }),
    );
    const oneShotSurface = within(oneShot.container).getByTestId("surface");

    pointerDown(oneShotSurface, { clientX: 20, clientY: 4 });
    pointerMove(oneShotSurface, 20 + MOVE_SLOP + 1, 4);
    act(() => flushRaf());
    pointerUp(oneShotSurface, 20 + MOVE_SLOP + 1, 4);
    // An armed drag belongs to the camera (invariant D): no intent, so nothing
    // to exhaust either.
    expect(onIntent).not.toHaveBeenCalled();
    expect(onModeExhausted).not.toHaveBeenCalled();

    pointerDown(oneShotSurface, { clientX: 20, clientY: 4 });
    pointerUp(oneShotSurface, 20, 4);
    expect(onIntent).toHaveBeenCalledTimes(1);
    expect(onModeExhausted).toHaveBeenCalledTimes(1);
  });

  it("maps rotate grips to yaw previews from the press-time origin", () => {
    const onIntent = vi.fn();
    const { getByTestId, observed } = renderProbe(
      optionsFor({ onIntent, selection: SELECTED_H0 }),
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

    expect(observed.renders).toBe(afterFirstHover);
    expect(surfaceOf(observed).affordance).toBe(firstAffordance);
  });

  it("reads the modifiers a pointer event carries", () => {
    const { getByTestId, observed } = renderProbe(optionsFor());
    const surface = getByTestId("surface") as HTMLElement;

    pointerMove(surface, 0, 0, { buttons: 0, shiftKey: true, altKey: true });
    act(() => flushRaf());
    expect(surfaceOf(observed).modifiers).toEqual({ shift: true, alt: true });

    pointerMove(surface, 0, 0, { buttons: 0, shiftKey: false, altKey: false });
    act(() => flushRaf());
    expect(surfaceOf(observed).modifiers).toEqual({ shift: false, alt: false });
  });

  it("observes Shift and Alt on window while the pointer is resident, and re-resolves at rest", () => {
    // The pointer does not move: this is exactly the case a pointer-event-only
    // implementation cannot serve, and it is what makes a modifier's effect
    // visible before the press rather than after it.
    const { getByTestId, observed } = renderProbe(optionsFor({ scene: PATH_SCENE }));
    const surface = getByTestId("surface") as HTMLElement;

    fireEvent.pointerEnter(surface, { pointerId: 1, pointerType: "mouse", clientX: 5, clientY: 0 });
    pointerMove(surface, 5, 0, { buttons: 0 });
    act(() => flushRaf());
    expect(surfaceOf(observed).modifiers.alt).toBe(false);

    act(() => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
    });
    expect(surfaceOf(observed).modifiers.alt).toBe(true);

    act(() => {
      fireEvent.keyUp(window, { key: "Alt", altKey: false });
    });
    expect(surfaceOf(observed).modifiers.alt).toBe(false);
  });

  it("ignores keys once the pointer has left, so a Shift typed elsewhere is not ours", () => {
    const { getByTestId, observed } = renderProbe(optionsFor());
    const surface = getByTestId("surface") as HTMLElement;

    fireEvent.pointerEnter(surface, { pointerId: 1, pointerType: "mouse", clientX: 0, clientY: 0 });
    fireEvent.pointerLeave(surface, { pointerId: 1, pointerType: "mouse", clientX: 0, clientY: 0 });

    act(() => {
      fireEvent.keyDown(window, { key: "Shift", shiftKey: true });
    });
    expect(surfaceOf(observed).modifiers.shift).toBe(false);
  });

  it("aborts a live drag on Escape with no intent, and that is its only preventDefault", () => {
    const onIntent = vi.fn();
    const onCameraLock = vi.fn();
    const { getByTestId, observed } = renderProbe(optionsFor({ onIntent, onCameraLock }));
    const surface = getByTestId("surface") as HTMLElement;

    pointerDown(surface);
    pointerMove(surface, MOVE_SLOP + 2);
    act(() => flushRaf());
    expect(surfaceOf(observed).drag).not.toBeNull();

    const escape = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    act(() => {
      window.dispatchEvent(escape);
    });
    expect(escape.defaultPrevented).toBe(true);
    expect(surfaceOf(observed).drag).toBeNull();
    expect(onCameraLock).toHaveBeenLastCalledWith(false);

    // The release that follows the abort produces nothing at all: the gesture
    // was cancelled, not completed as a click.
    pointerUp(surface, MOVE_SLOP + 2);
    expect(onIntent).not.toHaveBeenCalled();
  });

  it("leaves Escape alone when no drag is live, so the chrome layer owns it", () => {
    const { getByTestId } = renderProbe(optionsFor());
    const surface = getByTestId("surface") as HTMLElement;
    fireEvent.pointerEnter(surface, { pointerId: 1, pointerType: "mouse", clientX: 0, clientY: 0 });

    const escape = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    act(() => {
      window.dispatchEvent(escape);
    });
    expect(escape.defaultPrevented).toBe(false);
  });

  it("routes a double click through the additive-only double-click grammar", () => {
    const onIntent = vi.fn();
    const armed: EditSelection = {
      targets: [{ kind: "path", id: "route" }],
      primary: { kind: "path", id: "route" },
    };
    const { getByTestId } = renderProbe(
      optionsFor({ scene: PATH_SCENE, selection: armed, onIntent }),
    );
    const surface = getByTestId("surface") as HTMLElement;

    // Make the surface fine-modality, then double-click the armed segment.
    pointerMove(surface, 5, 0, { buttons: 0 });
    act(() => flushRaf());
    fireEvent.doubleClick(surface, { clientX: 5, clientY: 0 });

    expect(onIntent).toHaveBeenCalledWith({
      kind: "insert",
      pathId: "route",
      afterIndex: 0,
      at: { x: 5, y: 0 },
    });
  });

  it("reports live drag feedback while a move set is running", () => {
    const { getByTestId, observed } = renderProbe(
      optionsFor({
        scene: PATH_SCENE,
        snapping: { enabled: true, toGeometry: true, toGrid: false },
      }),
    );
    const surface = getByTestId("surface") as HTMLElement;

    pointerDown(surface);
    pointerMove(surface, MOVE_SLOP + 2, 3);
    act(() => flushRaf());

    const feedback = surfaceOf(observed).dragFeedback;
    expect(feedback?.grip.kind).toBe("move-set");
    expect(feedback?.members).toHaveLength(1);
    expect(feedback?.resolved.constrained).toBe(false);
  });

  it("reports a marquee's rectangle and candidates before the release commits them", () => {
    const { getByTestId, observed } = renderProbe(optionsFor({ scene: PATH_SCENE }));
    const surface = getByTestId("surface") as HTMLElement;

    // Shift + a press on empty floor: the gesture the camera would otherwise
    // have taken becomes a rubber band.
    pointerDown(surface, { clientX: 0, clientY: 20, shiftKey: true });
    pointerMove(surface, 12, 0, { shiftKey: true });
    act(() => flushRaf());

    const marquee = surfaceOf(observed).marquee;
    expect(marquee?.refusal).toBeNull();
    expect(marquee?.candidates).toEqual([
      { kind: "handle", id: "h0" },
      { kind: "handle", id: "h1" },
    ]);
    expect(surfaceOf(observed).surfaceProps["data-edit-cursor"]).toBe("marquee");
  });

  it("reports the armed rubber band from the run's last point, on hover alone", () => {
    const { getByTestId, observed } = renderProbe(
      optionsFor({ mode: "append", drawing: [{ x: 0, y: 0 }] }),
    );
    const surface = getByTestId("surface") as HTMLElement;

    pointerMove(surface, 30, 40, { buttons: 0 });
    act(() => flushRaf());

    expect(surfaceOf(observed).pending).toEqual({
      from: { x: 0, y: 0 },
      to: { x: 30, y: 40 },
      resolved: { at: { x: 30, y: 40 }, constrained: false, snap: null },
    });
  });

  it("constrains the pending placement while Shift is held", () => {
    const { getByTestId, observed } = renderProbe(
      optionsFor({ mode: "append", drawing: [{ x: 0, y: 0 }] }),
    );
    const surface = getByTestId("surface") as HTMLElement;

    pointerMove(surface, 30, 40, { buttons: 0, shiftKey: true });
    act(() => flushRaf());

    const pending = surfaceOf(observed).pending;
    expect(pending?.resolved.constrained).toBe(true);
    // 30,40 is 53.13 degrees from the origin; the nearest 45-degree ray is 45,
    // and the travelled distance along it is preserved.
    expect(pending?.to.x).toBeCloseTo(pending?.to.y ?? 0);
  });

  it("names its cursor and affordance on the surface, and exposes nothing else", () => {
    const { getByTestId, observed } = renderProbe(optionsFor({ mode: "append" }));
    const props = surfaceOf(observed).surfaceProps;

    expect(props.style).toEqual({ cursor: "crosshair" });
    expect(props["data-edit-cursor"]).toBe("draw");
    expect(props["data-edit-affordance"]).toBe("none");
    expect(getByTestId("surface").getAttribute("data-edit-cursor")).toBe("draw");
    expect(Object.keys(props).sort()).toEqual([
      "data-edit-affordance",
      "data-edit-cursor",
      "onDoubleClick",
      "onPointerCancel",
      "onPointerDown",
      "onPointerEnter",
      "onPointerLeave",
      "onPointerMove",
      "onPointerUp",
      "style",
    ]);
  });

  it("writes no inline cursor where the host's resting cursor owns the surface", () => {
    // The camera surface is the host's business: a raster view pans, a
    // perspective view orbits. The DELEGATION is still named, so a host with no
    // resting rule of its own is a visible hole rather than a silent one.
    const { getByTestId, observed } = renderProbe(optionsFor({ scene: PATH_SCENE }));
    const surface = getByTestId("surface") as HTMLElement;

    pointerMove(surface, 5, 400, { buttons: 0 });
    act(() => flushRaf());

    expect(surfaceOf(observed).affordance).toEqual({ kind: "floor" });
    expect(surfaceOf(observed).cursor).toEqual({ name: "host-resting", value: null });
    expect(surfaceOf(observed).surfaceProps.style).toEqual({});
    expect(surface.getAttribute("data-edit-cursor")).toBe("host-resting");
    expect(surface.style.cursor).toBe("");
  });
});
