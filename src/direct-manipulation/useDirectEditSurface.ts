/**
 * @file Shared pointer mechanics for the direct-manipulation editing surface.
 *
 * This hook owns pointer state, modality observation, pointer capture, drag
 * previews, and the translation from a gesture into one editing intent. It
 * refuses to own document state, rendering, or undo; consumers apply the
 * reported intent to their own draft and draw the returned affordance/preview.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type * as React from "react";
import { DRAG_SLOP_PX } from "./constants";
import type { Vertex } from "./geometry";
import {
  cursorFor,
  persistentGhosts as getPersistentGhosts,
  resolveAffordance,
  resolveClick,
  resolveDragRelease,
  resolveGrip,
  type DragGrip,
  type EditAffordance,
  type EditAnchors,
  type EditCapabilities,
  type EditIntent,
  type EditMode,
  type EditScene,
  type EditSelection,
  type EditScreenPick,
  type EditTolerances,
  type PointerModality,
} from "./grammar";

export type DirectEditSurfaceOptions = {
  readonly mode: EditMode;
  readonly scene: EditScene;
  readonly selection: EditSelection;
  readonly capabilities: EditCapabilities;
  readonly tolerance: EditTolerances;
  readonly drawing: readonly Vertex[] | null;
  readonly screenPick?: EditScreenPick;
  readonly anchors?: EditAnchors;
  /** client 座標 → 世界 m。床を外したら null。3D は pickFloor、2D は raster 逆変換。 */
  readonly toWorld: (clientX: number, clientY: number) => Vertex | null;
  /** 完了した 1 ジェスチャにつき高々 1 回。 */
  readonly onIntent: (intent: EditIntent) => void;
  /** grip を掴んだ瞬間に同期的に true。解放/中断で false。（不変条件 D） */
  readonly onCameraLock?: (locked: boolean) => void;
  /** append の one-shot 解除。 */
  readonly onModeExhausted?: () => void;
  /** drag が床の外で離された等、報告すべき事象。 */
  readonly onRefused?: (reason: string) => void;
};

export type DragPreview =
  | { readonly kind: "move"; readonly id: string; readonly at: Vertex }
  | {
      readonly kind: "insert";
      readonly pathId: string;
      readonly afterIndex: number;
      readonly at: Vertex;
    }
  | {
      readonly kind: "move-vertex";
      readonly areaId: string;
      readonly index: number;
      readonly at: Vertex;
    }
  | {
      readonly kind: "insert-vertex";
      readonly areaId: string;
      readonly edgeIndex: number;
      readonly at: Vertex;
    }
  | { readonly kind: "rotate"; readonly id: string; readonly yaw: number };

export type DirectEditSurface = {
  /** ホストの面要素に展開する pointer props。 */
  readonly surfaceProps: {
    readonly onPointerDown: React.PointerEventHandler;
    readonly onPointerMove: React.PointerEventHandler;
    readonly onPointerUp: React.PointerEventHandler;
    readonly onPointerCancel: React.PointerEventHandler;
    readonly onPointerLeave: React.PointerEventHandler;
    readonly style: React.CSSProperties;
    readonly "data-edit-drag"?: "true";
  };
  readonly affordance: EditAffordance;
  readonly drag: DragPreview | null;
  readonly modality: PointerModality;
  readonly persistentGhosts: readonly { pathId: string; segmentIndex: number; at: Vertex }[];
};

type PointerCaptureTarget = {
  readonly setPointerCapture?: (pointerId: number) => void;
  readonly releasePointerCapture?: (pointerId: number) => void;
  readonly hasPointerCapture?: (pointerId: number) => boolean;
};

type ActivePress = {
  readonly pointerId: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly worldAtDown: Vertex | null;
  readonly grip: DragGrip | null;
  readonly captureTarget: PointerCaptureTarget;
  readonly lockHandler: ((locked: boolean) => void) | undefined;
  captured: boolean;
  locked: boolean;
  live: boolean;
  offFloor: boolean;
};

type PendingMove = {
  readonly pointerId: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly buttons: number;
  readonly press: ActivePress | null;
};

type ReleaseOutcome =
  | { readonly kind: "intent"; readonly intent: EditIntent }
  | { readonly kind: "refused"; readonly reason: string }
  | { readonly kind: "none" };

function captureTargetFor(target: EventTarget): PointerCaptureTarget {
  return target as PointerCaptureTarget;
}

function sameVertex(a: Vertex, b: Vertex): boolean {
  return a.x === b.x && a.y === b.y;
}

function sameAffordance(a: EditAffordance, b: EditAffordance): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  switch (a.kind) {
    case "none":
    case "floor":
      return true;
    case "handle":
      return b.kind === "handle" && a.id === b.id;
    case "area":
      return b.kind === "area" && a.id === b.id;
    case "refused":
      return b.kind === "refused" && a.reason === b.reason;
    case "vertex":
      return b.kind === "vertex" && a.areaId === b.areaId && a.index === b.index;
    case "knob":
      return b.kind === "knob" && a.id === b.id && sameVertex(a.at, b.at);
    case "ghost":
      return (
        b.kind === "ghost" &&
        a.pathId === b.pathId &&
        a.segmentIndex === b.segmentIndex &&
        sameVertex(a.at, b.at)
      );
    case "ghost-vertex":
      return (
        b.kind === "ghost-vertex" &&
        a.areaId === b.areaId &&
        a.edgeIndex === b.edgeIndex &&
        sameVertex(a.at, b.at)
      );
    case "badge":
      if (b.kind !== "badge" || !sameVertex(a.at, b.at) || a.target.kind !== b.target.kind) {
        return false;
      }
      const bTarget = b.target;
      if (a.target.kind === "handle" && bTarget.kind === "handle") {
        return a.target.id === bTarget.id;
      }
      if (a.target.kind === "area" && bTarget.kind === "area") {
        return a.target.id === bTarget.id;
      }
      return a.target.kind === "vertex" && bTarget.kind === "vertex" && (
        a.target.areaId === bTarget.areaId &&
        a.target.index === bTarget.index
      );
  }
}

function previewForGrip(grip: DragGrip, at: Vertex): DragPreview {
  switch (grip.kind) {
    case "handle":
      return { kind: "move", id: grip.id, at };
    case "insert":
      return {
        kind: "insert",
        pathId: grip.pathId,
        afterIndex: grip.afterIndex,
        at,
      };
    case "vertex":
      return {
        kind: "move-vertex",
        areaId: grip.areaId,
        index: grip.index,
        at,
      };
    case "insert-vertex":
      return {
        kind: "insert-vertex",
        areaId: grip.areaId,
        edgeIndex: grip.edgeIndex,
        at,
      };
    case "rotate":
      return {
        kind: "rotate",
        id: grip.id,
        yaw: Math.atan2(at.y - grip.origin.y, at.x - grip.origin.x),
      };
  }
}

function modalityForPointerType(pointerType: string): PointerModality | null {
  if (pointerType === "touch") {
    return "coarse";
  }
  if (pointerType === "mouse" || pointerType === "pen") {
    return "fine";
  }
  return null;
}

function exceedsSlop(press: ActivePress, clientX: number, clientY: number): boolean {
  return (
    Math.hypot(clientX - press.clientX, clientY - press.clientY) > DRAG_SLOP_PX
  );
}

export function useDirectEditSurface(
  options: DirectEditSurfaceOptions,
): DirectEditSurface {
  const optionsRef = useRef<DirectEditSurfaceOptions>(options);
  optionsRef.current = options;

  const [modality, setModality] = useState<PointerModality>("fine");
  const modalityRef = useRef<PointerModality>("fine");
  const [affordance, setAffordance] = useState<EditAffordance>({ kind: "none" });
  const affordanceRef = useRef<EditAffordance>({ kind: "none" });
  const [drag, setDrag] = useState<DragPreview | null>(null);
  const dragRef = useRef<DragPreview | null>(null);
  const [dragLive, setDragLive] = useState(false);

  const pressRef = useRef<ActivePress | null>(null);
  const pendingMoveRef = useRef<PendingMove | null>(null);
  const framePendingRef = useRef(false);
  const frameIdRef = useRef<number | null>(null);

  const setCurrentModality = useCallback((next: PointerModality) => {
    if (modalityRef.current === next) {
      return;
    }
    modalityRef.current = next;
    setModality(next);
  }, []);

  const observePointerType = useCallback(
    (pointerType: string) => {
      const next = modalityForPointerType(pointerType);
      if (next !== null) {
        setCurrentModality(next);
      }
    },
    [setCurrentModality],
  );

  const updateAffordance = useCallback((next: EditAffordance) => {
    if (sameAffordance(affordanceRef.current, next)) {
      return;
    }
    affordanceRef.current = next;
    setAffordance(next);
  }, []);

  const setDragPreview = useCallback((next: DragPreview | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  const clearDragState = useCallback(() => {
    setDragPreview(null);
    setDragLive(false);
  }, [setDragPreview]);

  const probeAt = useCallback((at: Vertex) => {
    const current = optionsRef.current;
    return {
      mode: current.mode,
      modality: modalityRef.current,
      scene: current.scene,
      selection: current.selection,
      at,
      tolerance: current.tolerance,
      capabilities: current.capabilities,
      drawing: current.drawing,
      screenPick: current.screenPick,
      anchors: current.anchors,
    };
  }, []);

  const processPointerMove = useCallback(
    (move: PendingMove) => {
      if (move.press !== pressRef.current) {
        return;
      }
      if (move.press !== null && move.pointerId !== move.press.pointerId) {
        return;
      }

      const current = optionsRef.current;
      const press = move.press;
      if (press === null) {
        if (move.buttons !== 0) {
          return;
        }
        const at = current.toWorld(move.clientX, move.clientY);
        updateAffordance(
          at === null ? { kind: "none" } : resolveAffordance(probeAt(at)),
        );
        return;
      }

      if (press.grip === null || !exceedsSlop(press, move.clientX, move.clientY)) {
        return;
      }

      if (!press.live) {
        press.live = true;
        setDragLive(true);
      }

      const at = current.toWorld(move.clientX, move.clientY);
      if (at === null) {
        press.offFloor = true;
        return;
      }
      setDragPreview(previewForGrip(press.grip, at));
    },
    [probeAt, setDragPreview, updateAffordance],
  );

  const releaseCapture = useCallback(
    (press: ActivePress, currentTarget?: EventTarget) => {
      if (!press.captured) {
        return;
      }
      press.captureTarget.releasePointerCapture?.(press.pointerId);
      if (currentTarget !== undefined && currentTarget !== press.captureTarget) {
        captureTargetFor(currentTarget).releasePointerCapture?.(press.pointerId);
      }
      press.captured = false;
    },
    [],
  );

  const discardPress = useCallback(
    (press: ActivePress, currentTarget: EventTarget) => {
      if (pressRef.current !== press) {
        return;
      }
      pressRef.current = null;
      releaseCapture(press, currentTarget);
      const wasLocked = press.locked;
      press.locked = false;
      clearDragState();
      if (wasLocked) {
        press.lockHandler?.(false);
      }
    },
    [clearDragState, releaseCapture],
  );

  const handlePointerDown: React.PointerEventHandler = useCallback(
    (event) => {
      observePointerType(event.pointerType);
      if (pressRef.current !== null) {
        return;
      }

      const current = optionsRef.current;
      const worldAtDown = current.toWorld(event.clientX, event.clientY);
      const grip =
        worldAtDown === null ? null : resolveGrip(probeAt(worldAtDown));
      const press: ActivePress = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        worldAtDown,
        grip,
        captureTarget: captureTargetFor(event.currentTarget),
        lockHandler: current.onCameraLock,
        captured: false,
        locked: false,
        live: false,
        offFloor: false,
      };
      pressRef.current = press;
      clearDragState();

      if (grip !== null) {
        press.locked = true;
        press.lockHandler?.(true);
        press.captureTarget.setPointerCapture?.(event.pointerId);
        press.captured = press.captureTarget.setPointerCapture !== undefined;
      }
    },
    [clearDragState, observePointerType, probeAt],
  );

  const handlePointerMove: React.PointerEventHandler = useCallback(
    (event) => {
      observePointerType(event.pointerType);
      pendingMoveRef.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        buttons: event.buttons,
        press: pressRef.current,
      };
      if (framePendingRef.current) {
        return;
      }

      framePendingRef.current = true;
      const processFrame = () => {
        framePendingRef.current = false;
        frameIdRef.current = null;
        const pending = pendingMoveRef.current;
        pendingMoveRef.current = null;
        if (pending !== null) {
          processPointerMove(pending);
        }
      };
      if (
        typeof window !== "undefined" &&
        typeof window.requestAnimationFrame === "function"
      ) {
        frameIdRef.current = window.requestAnimationFrame(processFrame);
      } else {
        processFrame();
      }
    },
    [observePointerType, processPointerMove],
  );

  const handlePointerUp: React.PointerEventHandler = useCallback(
    (event) => {
      observePointerType(event.pointerType);
      const press = pressRef.current;
      if (press === null || press.pointerId !== event.pointerId) {
        return;
      }

      const current = optionsRef.current;
      const at = current.toWorld(event.clientX, event.clientY);
      const movedBeyondSlop = exceedsSlop(press, event.clientX, event.clientY);
      const isLive =
        press.grip !== null &&
        (press.live || movedBeyondSlop);
      const outcome: ReleaseOutcome =
        isLive && press.grip !== null
          ? at === null
            ? { kind: "refused", reason: "released outside the floor" }
            : { kind: "intent", intent: resolveDragRelease(press.grip, at) }
          : movedBeyondSlop || at === null
            ? { kind: "none" }
            : { kind: "intent", intent: resolveClick(probeAt(at)) };

      discardPress(press, event.currentTarget);

      if (outcome.kind === "refused") {
        current.onRefused?.(outcome.reason);
        return;
      }
      if (outcome.kind === "intent") {
        current.onIntent(outcome.intent);
        if (outcome.intent.kind === "place") {
          current.onModeExhausted?.();
        }
      }
    },
    [discardPress, observePointerType, probeAt],
  );

  const handlePointerCancel: React.PointerEventHandler = useCallback(
    (event) => {
      observePointerType(event.pointerType);
      const press = pressRef.current;
      if (press !== null && press.pointerId === event.pointerId) {
        discardPress(press, event.currentTarget);
      }
    },
    [discardPress, observePointerType],
  );

  const handlePointerLeave: React.PointerEventHandler = useCallback(
    (event) => {
      observePointerType(event.pointerType);
      const press = pressRef.current;
      if (press === null || press.pointerId !== event.pointerId) {
        return;
      }
      const target = captureTargetFor(event.currentTarget);
      const captured = target.hasPointerCapture?.(event.pointerId) ?? press.captured;
      if (!captured) {
        discardPress(press, event.currentTarget);
      }
    },
    [discardPress, observePointerType],
  );

  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const query = window.matchMedia("(hover: none)");
      setCurrentModality(query.matches ? "coarse" : "fine");
    }
  }, [setCurrentModality]);

  useEffect(() => {
    return () => {
      const frameId = frameIdRef.current;
      if (
        frameId !== null &&
        typeof window !== "undefined" &&
        typeof window.cancelAnimationFrame === "function"
      ) {
        window.cancelAnimationFrame(frameId);
      }
      frameIdRef.current = null;
      framePendingRef.current = false;
      pendingMoveRef.current = null;
      const press = pressRef.current;
      if (press !== null) {
        pressRef.current = null;
        releaseCapture(press);
        const wasLocked = press.locked;
        press.locked = false;
        if (wasLocked) {
          press.lockHandler?.(false);
        }
      }
    };
  }, [releaseCapture]);

  const persistentGhosts = useMemo(
    () => getPersistentGhosts(options.scene, modality),
    [modality, options.scene],
  );
  const cursor =
    options.mode !== "direct" ? "crosshair" : cursorFor(affordance, dragLive);
  const surfaceProps = useMemo<DirectEditSurface["surfaceProps"]>(() => {
    const base = {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onPointerLeave: handlePointerLeave,
      style: cursor === undefined ? {} : { cursor },
    };
    return dragLive ? { ...base, "data-edit-drag": "true" } : base;
  }, [
    cursor,
    dragLive,
    handlePointerCancel,
    handlePointerDown,
    handlePointerLeave,
    handlePointerMove,
    handlePointerUp,
  ]);

  return { surfaceProps, affordance, drag, modality, persistentGhosts };
}
