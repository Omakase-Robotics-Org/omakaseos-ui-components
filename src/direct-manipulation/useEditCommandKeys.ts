/**
 * @file Keyboard accelerators for the editing session's DOCUMENT COMMANDS —
 * for the consumer's CHROME layer, never for the canvas.
 *
 * ## Why this is not a canvas concern
 *
 * Enter, Escape, Delete and the chrome's own buttons are the SAME commands: end
 * the run, back out one level, remove the selection. The buttons are native
 * controls in the host's chrome (the panel around the map), and that is where
 * keyboard reachability lives; these keys are those buttons' accelerators and
 * nothing more. The canvas stays decorative — `aria-hidden` SVG with no `role`,
 * no `tabIndex` and no `aria-*` — exactly as the a11y contract requires, and
 * `direct-manipulation-boundary.spec.ts` pins that this helper is never wired
 * into `useDirectEditSurface`.
 *
 * This generalises an implementation that already ships: the on-robot console's
 * scene editor panel listens for Escape and Delete on its own container div,
 * with a text-entry guard, and calls its selection commands. The dashboard had
 * no such route at all; one helper gives both hosts the same one.
 *
 * ## Escape peels exactly one layer
 *
 * A live drag is aborted by the surface hook itself (the gesture's own cancel),
 * so it never reaches here. What remains is the ladder below, innermost first,
 * and it stops after ONE step: an operator who wanted to abandon a run does not
 * also lose their selection.
 */

import { useEffect } from "react";

export type EditCommandKeysOptions = {
  /** True only while the host's chrome declares an editing session open. */
  readonly enabled: boolean;
  /** True while an armed mode (append / draw-area) is engaged. */
  readonly armed: boolean;
  /** How many points the run in progress holds (`drawing?.length ?? 0`). */
  readonly runLength: number;
  /** True while anything is selected. */
  readonly hasSelection: boolean;
  /** Enter, and Escape's first rung when a run is in progress. */
  readonly onFinishRun: () => void;
  /** Escape with a run in progress: abandon what it drew. */
  readonly onCancelRun: () => void;
  /** Escape while armed with an empty run: leave the mode. */
  readonly onDisarm: () => void;
  /** Escape with only a selection: clear it. */
  readonly onDeselectAll: () => void;
  /** Delete / Backspace: remove every selected target. */
  readonly onDeleteSelection: () => void;
};

/**
 * Whether the event's target is somewhere the operator is typing.
 *
 * Delete inside a text field means "erase a character" and must never mean
 * "remove the selected waypoints". Checked by tag and by `isContentEditable`,
 * because a rich-text host is not an `<input>`.
 */
export function isTextEntry(target: EventTarget | null): boolean {
  if (target === null || typeof target !== "object") {
    return false;
  }
  const element = target as {
    readonly tagName?: unknown;
    readonly isContentEditable?: unknown;
  };
  if (element.isContentEditable === true) {
    return true;
  }
  const tagName = typeof element.tagName === "string" ? element.tagName.toUpperCase() : "";
  return tagName === "INPUT" || tagName === "SELECT" || tagName === "TEXTAREA";
}

/**
 * Wire the document-command accelerators for an open editing session.
 *
 * Attach this in the CHROME layer, alongside the native twin controls. Passing
 * it to the canvas surface would give the canvas keyboard behaviour, which the
 * a11y contract forbids and the boundary spec refuses.
 *
 * @param options The session's state and its command callbacks.
 */
export function useEditCommandKeys(options: EditCommandKeysOptions): void {
  const {
    enabled,
    armed,
    runLength,
    hasSelection,
    onFinishRun,
    onCancelRun,
    onDisarm,
    onDeselectAll,
    onDeleteSelection,
  } = options;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTextEntry(event.target)) {
        return;
      }
      if (event.key === "Enter") {
        if (runLength > 0) {
          event.preventDefault();
          onFinishRun();
        }
        return;
      }
      if (event.key === "Escape") {
        if (runLength > 0) {
          event.preventDefault();
          onCancelRun();
          return;
        }
        if (armed) {
          event.preventDefault();
          onDisarm();
          return;
        }
        if (hasSelection) {
          event.preventDefault();
          onDeselectAll();
        }
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (hasSelection) {
          event.preventDefault();
          onDeleteSelection();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    armed,
    enabled,
    hasSelection,
    onCancelRun,
    onDeleteSelection,
    onDeselectAll,
    onDisarm,
    onFinishRun,
    runLength,
  ]);
}
