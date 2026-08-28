/**
 * @file Shared pointer mechanics for the direct-manipulation editing surface.
 *
 * This hook owns pointer state, modality observation, modifier observation,
 * pointer capture, drag previews, live drag feedback, and the translation from
 * a gesture into one editing intent. It refuses to own document state,
 * rendering, or undo; consumers apply the reported intent to their own draft
 * and draw the returned affordance/preview.
 *
 * ## Which keys this hook may see, and which it may not
 *
 * A gesture MODIFIER (Shift / Alt) is part of a pointer gesture: it can do
 * nothing on its own, so observing it creates no keyboard route into editing
 * and therefore no keyboard reachability the a11y contract would have to
 * account for. It is observed on `window` only while the pointer is resident on
 * the surface or a press is alive, so a Shift typed into a form elsewhere on the
 * page never reaches the editor.
 *
 * A DOCUMENT COMMAND (Enter / Escape outside a drag / Delete / undo) is not this
 * hook's business at all: those are the native twin controls' keyboard
 * accelerators and belong to the consumer's chrome layer, where
 * `useEditCommandKeys` provides them. The one exception is Escape DURING a live
 * drag, which aborts that drag — the gesture's own cancel — and is the ONLY
 * place this file calls `preventDefault`.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type * as React from "react";
import { dragSlopPx, gripClassOf, pressSlopPx, type GripClass } from "./constants";
import type { EditGrid, Vertex } from "./geometry";
import {
  cursorFor,
  marqueeTargets,
  persistentGhosts as getPersistentGhosts,
  resolveAffordance,
  resolveClick,
  resolveDoubleClick,
  resolveDragRelease,
  resolveGrip,
  resolveInsertPosition,
  resolveMoveSet,
  resolvePosition,
  resolveRotation,
  sameTarget,
  type DragGrip,
  type EditAffordance,
  type EditAnchors,
  type EditArming,
  type EditCapabilities,
  type EditCursor,
  type EditIntent,
  type EditMode,
  type EditModifiers,
  type EditMove,
  type EditScene,
  type EditScreenMarquee,
  type EditScreenRank,
  type EditSelection,
  type EditSnapping,
  type EditTarget,
  type EditTolerances,
  type PointerModality,
  type ResolvedPosition,
} from "./grammar";

export type DirectEditSurfaceOptions = {
  readonly mode: EditMode;
  /**
   * Whether an armed mode survives its own placement. REQUIRED: a default
   * would be this layer deciding a host's rhythm for it.
   */
  readonly arming: EditArming;
  readonly scene: EditScene;
  readonly selection: EditSelection;
  readonly capabilities: EditCapabilities;
  readonly tolerance: EditTolerances;
  readonly drawing: readonly Vertex[] | null;
  /** The magnet, as the host's chrome declares it. REQUIRED. */
  readonly snapping: EditSnapping;
  /** The declared grid, or an explicit `null`. REQUIRED. */
  readonly grid: EditGrid | null;
  readonly screenRank?: EditScreenRank;
  readonly screenMarquee?: EditScreenMarquee;
  readonly anchors?: EditAnchors;
  /** client 座標 → 世界 m。床を外したら null。3D は pickFloor、2D は raster 逆変換。 */
  readonly toWorld: (clientX: number, clientY: number) => Vertex | null;
  /** 完了した 1 ジェスチャにつき高々 1 回。 */
  readonly onIntent: (intent: EditIntent) => void;
  /** grip を掴んだ瞬間に同期的に true。解放/中断で false。（不変条件 D） */
  readonly onCameraLock?: (locked: boolean) => void;
  /** `arming: "one-shot"` のときだけ呼ばれる。 */
  readonly onModeExhausted?: () => void;
  /** drag が床の外で離された等、報告すべき事象。 */
  readonly onRefused?: (reason: string) => void;
};

export type DragPreview =
  | { readonly kind: "move-set"; readonly moves: readonly EditMove[] }
  | {
      readonly kind: "insert";
      readonly pathId: string;
      readonly afterIndex: number;
      readonly at: Vertex;
    }
  | {
      readonly kind: "insert-vertex";
      readonly areaId: string;
      readonly edgeIndex: number;
      readonly at: Vertex;
    }
  | { readonly kind: "rotate"; readonly id: string; readonly yaw: number }
  | { readonly kind: "marquee"; readonly from: Vertex; readonly to: Vertex };

/** What a live drag is doing right now, for drawing the reason it looks so. */
export type DragFeedback = {
  readonly grip: DragGrip;
  /** Where the gesture landed, and the constraint / snap that put it there. */
  readonly resolved: ResolvedPosition;
  /** Every member's position under this drag; empty for a non-move grip. */
  readonly members: readonly EditMove[];
};

/** The rubber-band rectangle and what it currently encloses. */
export type MarqueePreview = {
  readonly from: Vertex;
  readonly to: Vertex;
  readonly candidates: readonly EditTarget[];
  /** Non-null when the host cannot answer a rectangle in its own frame. */
  readonly refusal: string | null;
};

/** The armed rubber band from the run's last point to the pointer. */
export type PendingPreview = {
  readonly from: Vertex;
  readonly to: Vertex;
  readonly resolved: ResolvedPosition;
};

export type DirectEditSurface = {
  /** ホストの面要素に展開する pointer props。 */
  readonly surfaceProps: {
    readonly onPointerDown: React.PointerEventHandler;
    readonly onPointerMove: React.PointerEventHandler;
    readonly onPointerUp: React.PointerEventHandler;
    readonly onPointerCancel: React.PointerEventHandler;
    readonly onPointerEnter: React.PointerEventHandler;
    readonly onPointerLeave: React.PointerEventHandler;
    readonly onDoubleClick: React.MouseEventHandler;
    readonly style: React.CSSProperties;
    readonly "data-edit-cursor": string;
    readonly "data-edit-affordance": string;
    readonly "data-edit-drag"?: "true";
  };
  readonly affordance: EditAffordance;
  readonly cursor: EditCursor;
  readonly drag: DragPreview | null;
  readonly dragFeedback: DragFeedback | null;
  readonly marquee: MarqueePreview | null;
  readonly pending: PendingPreview | null;
  readonly modality: PointerModality;
  readonly modifiers: EditModifiers;
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
  aborted: boolean;
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

const NO_MODIFIERS: EditModifiers = { shift: false, alt: false };

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
    case "path":
      return (b.kind === "handle" || b.kind === "path") && a.id === b.id;
    case "area":
      return b.kind === "area" && a.id === b.id;
    case "refused":
      return b.kind === "refused" && a.reason === b.reason;
    case "vertex":
      return b.kind === "vertex" && a.areaId === b.areaId && a.index === b.index;
    case "knob":
      return b.kind === "knob" && a.id === b.id && sameVertex(a.at, b.at);
    case "ghost":
    case "path-edge":
      return (
        (b.kind === "ghost" || b.kind === "path-edge") &&
        a.pathId === b.pathId &&
        a.segmentIndex === b.segmentIndex &&
        sameVertex(a.at, b.at)
      );
    case "ghost-vertex":
    case "ring-edge":
      return (
        (b.kind === "ghost-vertex" || b.kind === "ring-edge") &&
        a.areaId === b.areaId &&
        a.edgeIndex === b.edgeIndex &&
        sameVertex(a.at, b.at)
      );
    case "run-first":
    case "run-last":
      return (b.kind === "run-first" || b.kind === "run-last") && sameVertex(a.at, b.at);
    case "path-endpoint":
      return (
        b.kind === "path-endpoint" &&
        a.pathId === b.pathId &&
        a.endpoint === b.endpoint &&
        sameVertex(a.at, b.at)
      );
    case "badge":
      return b.kind === "badge" && sameVertex(a.at, b.at) && sameTarget(a.target, b.target);
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

function sameModifiers(a: EditModifiers, b: EditModifiers): boolean {
  return a.shift === b.shift && a.alt === b.alt;
}

function samePending(a: PendingPreview | null, b: PendingPreview | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    sameVertex(a.from, b.from) &&
    sameVertex(a.to, b.to) &&
    a.resolved.constrained === b.resolved.constrained &&
    (a.resolved.snap?.kind ?? null) === (b.resolved.snap?.kind ?? null)
  );
}

function travelled(press: ActivePress, clientX: number, clientY: number): number {
  return Math.hypot(clientX - press.clientX, clientY - press.clientY);
}

export function useDirectEditSurface(
  options: DirectEditSurfaceOptions,
): DirectEditSurface {
  const optionsRef = useRef<DirectEditSurfaceOptions>(options);
  optionsRef.current = options;

  const [modality, setModality] = useState<PointerModality>("fine");
  const modalityRef = useRef<PointerModality>("fine");
  const [modifiers, setModifiers] = useState<EditModifiers>(NO_MODIFIERS);
  const modifiersRef = useRef<EditModifiers>(NO_MODIFIERS);
  const [affordance, setAffordance] = useState<EditAffordance>({ kind: "none" });
  const affordanceRef = useRef<EditAffordance>({ kind: "none" });
  const [drag, setDrag] = useState<DragPreview | null>(null);
  const dragRef = useRef<DragPreview | null>(null);
  const [dragFeedback, setDragFeedback] = useState<DragFeedback | null>(null);
  const [marquee, setMarquee] = useState<MarqueePreview | null>(null);
  const [pending, setPending] = useState<PendingPreview | null>(null);
  const pendingRef = useRef<PendingPreview | null>(null);
  const [dragClass, setDragClass] = useState<GripClass | null>(null);

  const pressRef = useRef<ActivePress | null>(null);
  const pendingMoveRef = useRef<PendingMove | null>(null);
  const framePendingRef = useRef(false);
  const frameIdRef = useRef<number | null>(null);
  const lastClientRef = useRef<{ x: number; y: number } | null>(null);
  const [resident, setResident] = useState(false);
  const residentRef = useRef(false);

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

  /**
   * Residence gates the window key listeners. Guarded by a ref because this is
   * touched on every pointer move: calling setState with an unchanged value
   * still costs React a render pass, and that would show up as affordance
   * churn on a stationary pointer.
   */
  const setResidentFlag = useCallback((next: boolean) => {
    if (residentRef.current === next) {
      return;
    }
    residentRef.current = next;
    setResident(next);
  }, []);

  const setCurrentModifiers = useCallback((next: EditModifiers) => {
    if (sameModifiers(modifiersRef.current, next)) {
      return;
    }
    modifiersRef.current = next;
    setModifiers(next);
  }, []);

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

  /**
   * Every hover frame runs through these setters, so each one is guarded: a
   * setState with an unchanged value still costs React a render pass, and on a
   * stationary pointer that reads as affordance churn.
   */
  const dragStateDirtyRef = useRef(false);
  const clearDragState = useCallback(() => {
    if (!dragStateDirtyRef.current) {
      return;
    }
    dragStateDirtyRef.current = false;
    setDragPreview(null);
    setDragFeedback(null);
    setMarquee(null);
    setDragClass(null);
  }, [setDragPreview]);

  const updatePendingPreview = useCallback((next: PendingPreview | null) => {
    if (samePending(pendingRef.current, next)) {
      return;
    }
    pendingRef.current = next;
    setPending(next);
  }, []);

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
      screenRank: current.screenRank,
      screenMarquee: current.screenMarquee,
      anchors: current.anchors,
      modifiers: modifiersRef.current,
      snapping: current.snapping,
      grid: current.grid,
    };
  }, []);

  /**
   * The armed rubber band. Recomputed on hover as well as on drag, so holding
   * Shift with the pointer still shows the constrained placement before the
   * click that commits it.
   */
  const updatePending = useCallback(
    (at: Vertex | null) => {
      const current = optionsRef.current;
      const run = current.drawing;
      if (current.mode === "direct" || at === null || run === null || run.length === 0) {
        updatePendingPreview(null);
        return;
      }
      const from = run[run.length - 1];
      if (from === undefined) {
        updatePendingPreview(null);
        return;
      }
      const probe = probeAt(at);
      const resolved = resolvePosition(at, { origin: from, probe, exclude: [] });
      updatePendingPreview({ from, to: resolved.at, resolved });
    },
    [probeAt, updatePendingPreview],
  );

  const refreshHover = useCallback(() => {
    const last = lastClientRef.current;
    if (last === null || pressRef.current !== null) {
      return;
    }
    const at = optionsRef.current.toWorld(last.x, last.y);
    updateAffordance(at === null ? { kind: "none" } : resolveAffordance(probeAt(at)));
    updatePending(at);
  }, [probeAt, updateAffordance, updatePending]);

  const updateLiveDrag = useCallback(
    (press: ActivePress, at: Vertex) => {
      const grip = press.grip;
      if (grip === null) {
        return;
      }
      const probe = probeAt(at);
      if (grip.kind === "move-set") {
        const { moves, resolved } = resolveMoveSet(grip, at, probe);
        setDragPreview({ kind: "move-set", moves });
        setDragFeedback({ grip, resolved, members: moves });
        updateAffordance(resolveAffordance(probe));
        return;
      }
      if (grip.kind === "insert" || grip.kind === "insert-vertex") {
        const resolved = resolveInsertPosition(grip, at, probe);
        dragStateDirtyRef.current = true;
        setDragPreview(
          grip.kind === "insert"
            ? { kind: "insert", pathId: grip.pathId, afterIndex: grip.afterIndex, at: resolved.at }
            : {
                kind: "insert-vertex",
                areaId: grip.areaId,
                edgeIndex: grip.edgeIndex,
                at: resolved.at,
              },
        );
        setDragFeedback({ grip, resolved, members: [] });
        updateAffordance(resolveAffordance(probe));
        return;
      }
      if (grip.kind === "rotate") {
        const yaw = resolveRotation(grip, at, probe);
        dragStateDirtyRef.current = true;
        setDragPreview({ kind: "rotate", id: grip.id, yaw });
        setDragFeedback({
          grip,
          resolved: { at, constrained: probe.modifiers.shift, snap: null },
          members: [],
        });
        return;
      }
      const outcome = marqueeTargets(probe, grip.from, at);
      dragStateDirtyRef.current = true;
      setDragPreview({ kind: "marquee", from: grip.from, to: at });
      setMarquee({
        from: grip.from,
        to: at,
        candidates: outcome.kind === "targets" ? outcome.targets : [],
        refusal: outcome.kind === "refused" ? outcome.reason : null,
      });
      setDragFeedback({
        grip,
        resolved: { at, constrained: false, snap: null },
        members: [],
      });
    },
    [probeAt, setDragPreview, updateAffordance],
  );

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
        updatePending(at);
        return;
      }

      if (press.aborted || press.grip === null) {
        return;
      }
      const slop = dragSlopPx(press.grip, modalityRef.current);
      if (!press.live && travelled(press, move.clientX, move.clientY) <= slop) {
        return;
      }

      if (!press.live) {
        press.live = true;
        dragStateDirtyRef.current = true;
        setDragClass(gripClassOf(press.grip));
      }

      const at = current.toWorld(move.clientX, move.clientY);
      if (at === null) {
        press.offFloor = true;
        return;
      }
      press.offFloor = false;
      updateLiveDrag(press, at);
    },
    [probeAt, updateAffordance, updateLiveDrag, updatePending],
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
    (press: ActivePress, currentTarget?: EventTarget) => {
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
      setCurrentModifiers({ shift: event.shiftKey, alt: event.altKey });
      lastClientRef.current = { x: event.clientX, y: event.clientY };
      setResidentFlag(true);
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
        aborted: false,
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
    [clearDragState, observePointerType, probeAt, setCurrentModifiers, setResidentFlag],
  );

  const handlePointerMove: React.PointerEventHandler = useCallback(
    (event) => {
      observePointerType(event.pointerType);
      setCurrentModifiers({ shift: event.shiftKey, alt: event.altKey });
      lastClientRef.current = { x: event.clientX, y: event.clientY };
      setResidentFlag(true);
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
        const pendingMove = pendingMoveRef.current;
        pendingMoveRef.current = null;
        if (pendingMove !== null) {
          processPointerMove(pendingMove);
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
    [observePointerType, processPointerMove, setCurrentModifiers, setResidentFlag],
  );

  const handlePointerUp: React.PointerEventHandler = useCallback(
    (event) => {
      observePointerType(event.pointerType);
      setCurrentModifiers({ shift: event.shiftKey, alt: event.altKey });
      const press = pressRef.current;
      if (press === null || press.pointerId !== event.pointerId) {
        return;
      }

      const current = optionsRef.current;
      const at = current.toWorld(event.clientX, event.clientY);
      const distance = travelled(press, event.clientX, event.clientY);
      const grip = press.grip;
      const movedBeyondSlop =
        distance >
        (grip === null ? pressSlopPx(modalityRef.current) : dragSlopPx(grip, modalityRef.current));
      const isLive = !press.aborted && grip !== null && (press.live || movedBeyondSlop);
      const outcome: ReleaseOutcome = press.aborted
        ? { kind: "none" }
        : isLive && grip !== null
          ? at === null
            ? { kind: "refused", reason: "released outside the floor" }
            : { kind: "intent", intent: resolveDragRelease(grip, at, probeAt(at)) }
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
        if (outcome.intent.kind === "place" && current.arming === "one-shot") {
          current.onModeExhausted?.();
        }
      }
    },
    [discardPress, observePointerType, probeAt, setCurrentModifiers],
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

  const handlePointerEnter: React.PointerEventHandler = useCallback(
    (event) => {
      observePointerType(event.pointerType);
      setCurrentModifiers({ shift: event.shiftKey, alt: event.altKey });
      lastClientRef.current = { x: event.clientX, y: event.clientY };
      setResidentFlag(true);
    },
    [observePointerType, setCurrentModifiers, setResidentFlag],
  );

  const handlePointerLeave: React.PointerEventHandler = useCallback(
    (event) => {
      observePointerType(event.pointerType);
      const press = pressRef.current;
      if (press === null || press.pointerId !== event.pointerId) {
        setResidentFlag(false);
        lastClientRef.current = null;
        updateAffordance({ kind: "none" });
        updatePendingPreview(null);
        return;
      }
      const target = captureTargetFor(event.currentTarget);
      const captured = target.hasPointerCapture?.(event.pointerId) ?? press.captured;
      if (!captured) {
        discardPress(press, event.currentTarget);
        setResidentFlag(false);
        lastClientRef.current = null;
      }
    },
    [discardPress, observePointerType, setResidentFlag, updateAffordance, updatePendingPreview],
  );

  const handleDoubleClick: React.MouseEventHandler = useCallback(
    (event) => {
      const current = optionsRef.current;
      if (modalityRef.current === "coarse") {
        return;
      }
      setCurrentModifiers({ shift: event.shiftKey, alt: event.altKey });
      const at = current.toWorld(event.clientX, event.clientY);
      if (at === null) {
        return;
      }
      const intent = resolveDoubleClick(
        probeAt(at),
      );
      if (intent.kind === "nothing") {
        return;
      }
      current.onIntent(intent);
    },
    [probeAt, setCurrentModifiers],
  );

  /**
   * Gesture-modifier observation, alive only while the pointer is resident or a
   * press is running. The affordance and cursor are re-resolved on the key
   * event itself, so a stationary pointer still shows what Shift or Alt has
   * just changed.
   */
  useEffect(() => {
    if (!resident || typeof window === "undefined") {
      return;
    }
    const readModifiers = (event: KeyboardEvent): EditModifiers => ({
      shift: event.shiftKey,
      alt: event.altKey,
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const press = pressRef.current;
        if (press !== null && press.live) {
          event.preventDefault();
          press.aborted = true;
          discardPress(press);
        }
        return;
      }
      if (event.key !== "Shift" && event.key !== "Alt") {
        return;
      }
      setCurrentModifiers(readModifiers(event));
      refreshHover();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Shift" && event.key !== "Alt") {
        return;
      }
      setCurrentModifiers(readModifiers(event));
      refreshHover();
    };
    const onBlur = () => {
      setCurrentModifiers(NO_MODIFIERS);
      refreshHover();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onBlur);
    };
  }, [discardPress, refreshHover, resident, setCurrentModifiers]);

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

  // The cursor decision reads the probe's DECLARATIONS (mode, modality,
  // modifiers, selection) and never its position — the affordance already
  // carries the hit — so those are what this memo depends on.
  const cursor = useMemo<EditCursor>(
    () =>
      cursorFor(affordance, {
        probe: probeAt(affordanceProbePosition(affordance)),
        dragging: dragClass,
      }),
    [
      affordance,
      dragClass,
      modality,
      modifiers,
      options.mode,
      options.selection,
      probeAt,
    ],
  );

  const surfaceProps = useMemo<DirectEditSurface["surfaceProps"]>(() => {
    const base = {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onPointerEnter: handlePointerEnter,
      onPointerLeave: handlePointerLeave,
      onDoubleClick: handleDoubleClick,
      style: cursor.value === null ? {} : { cursor: cursor.value },
      "data-edit-cursor": cursor.name,
      "data-edit-affordance": affordance.kind,
    };
    return dragClass !== null ? { ...base, "data-edit-drag": "true" as const } : base;
  }, [
    affordance.kind,
    cursor,
    dragClass,
    handleDoubleClick,
    handlePointerCancel,
    handlePointerDown,
    handlePointerEnter,
    handlePointerLeave,
    handlePointerMove,
    handlePointerUp,
  ]);

  return {
    surfaceProps,
    affordance,
    cursor,
    drag,
    dragFeedback,
    marquee,
    pending,
    modality,
    modifiers,
    persistentGhosts,
  };
}

/**
 * A position to build a probe from when only the affordance is at hand. The
 * cursor decision never reads the position, so any point serves; the
 * affordance's own point is used where it carries one.
 */
function affordanceProbePosition(affordance: EditAffordance): Vertex {
  return "at" in affordance ? affordance.at : { x: 0, y: 0 };
}
