/**
 * @file Unit tests for the direct-manipulation editing timeline: undo, redo,
 * and the branch a new edit throws away.
 *
 * The draft type is a bare string here, on purpose. The whole value of this
 * module is that it does not look inside a draft, so a case written against
 * waypoints or keep-out rings would be testing the document as much as the
 * timeline; a string makes every assertion about the timeline alone, and the
 * equality this module refuses to guess at is supplied as an argument the way
 * a real document supplies it.
 */
import { describe, it, expect } from "vitest";
import {
  beginSession,
  canRedo,
  canUndo,
  commitEdit,
  discardEdits,
  isDirty,
  rebaseSession,
  redoEdit,
  undoEdit,
} from "./session";

/** The comparison a document states about itself; here, plain equality. */
const same = (a: string, b: string): boolean => a === b;

describe("a session that has not been edited", () => {
  it("has nothing to undo, nothing to redo, and nothing to save", () => {
    const session = beginSession("loaded");

    expect(canUndo(session)).toBe(false);
    expect(canRedo(session)).toBe(false);
    expect(isDirty(session, same)).toBe(false);
  });

  it("answers undo and redo with itself rather than an empty draft", () => {
    const session = beginSession("loaded");

    expect(undoEdit(session)).toBe(session);
    expect(redoEdit(session)).toBe(session);
  });
});

describe("undo and redo walk one cursor", () => {
  it("takes an edit back and puts it forward again", () => {
    const session = commitEdit(beginSession("a"), "b");

    const undone = undoEdit(session);
    expect(undone.current).toBe("a");
    expect(canUndo(undone)).toBe(false);
    expect(canRedo(undone)).toBe(true);

    const redone = redoEdit(undone);
    expect(redone.current).toBe("b");
    expect(canUndo(redone)).toBe(true);
    expect(canRedo(redone)).toBe(false);
  });

  it("walks a run of edits back to the snapshot and forward again in order", () => {
    const third = commitEdit(commitEdit(commitEdit(beginSession("a"), "b"), "c"), "d");

    const back = undoEdit(undoEdit(undoEdit(third)));
    expect(back.current).toBe("a");
    expect(canUndo(back)).toBe(false);

    expect(redoEdit(back).current).toBe("b");
    expect(redoEdit(redoEdit(back)).current).toBe("c");
    expect(redoEdit(redoEdit(redoEdit(back))).current).toBe("d");
  });

  it("never walks back past the snapshot the robot stated", () => {
    const session = commitEdit(beginSession("a"), "b");
    const back = undoEdit(undoEdit(session));

    expect(back.current).toBe("a");
    expect(back.base).toBe("a");
  });
});

describe("a new edit after an undo drops the branch in front of the cursor", () => {
  it("cannot redo what the operator has just replaced", () => {
    const abandoned = undoEdit(commitEdit(beginSession("a"), "b"));
    expect(canRedo(abandoned)).toBe(true);

    const chosen = commitEdit(abandoned, "c");

    expect(canRedo(chosen)).toBe(false);
    expect(chosen.current).toBe("c");
    // The taken-back edit is still undoable ONCE — back to the snapshot, not
    // back to the branch that was dropped.
    expect(undoEdit(chosen).current).toBe("a");
  });
});

describe("dirtiness is asked of the drafts, not of the timeline", () => {
  it("reports clean after an edit and its undo, though the timeline is not empty", () => {
    const undone = undoEdit(commitEdit(beginSession("a"), "b"));

    expect(canRedo(undone)).toBe(true);
    expect(isDirty(undone, same)).toBe(false);
  });

  it("reports dirty for a draft that differs from the snapshot", () => {
    expect(isDirty(commitEdit(beginSession("a"), "b"), same)).toBe(true);
  });

  it("uses the comparison it is given rather than object identity", () => {
    // A document whose drafts are equal by its own rules but not by identity —
    // the vendor scene's raw payload objects are exactly this case.
    const caseless = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();
    const session = commitEdit(beginSession("dock"), "DOCK");

    expect(isDirty(session, same)).toBe(true);
    expect(isDirty(session, caseless)).toBe(false);
  });
});

describe("discard and rebase clear the timeline in both directions", () => {
  it("returns a discarded session to the snapshot with no redo out of it", () => {
    const discarded = discardEdits(commitEdit(commitEdit(beginSession("a"), "b"), "c"));

    expect(discarded.current).toBe("a");
    expect(canUndo(discarded)).toBe(false);
    expect(canRedo(discarded)).toBe(false);
  });

  it("makes a written draft the new snapshot, with nothing to take back", () => {
    const rebased = rebaseSession(commitEdit(beginSession("a"), "b"), "b-as-read-back");

    expect(rebased.base).toBe("b-as-read-back");
    expect(rebased.current).toBe("b-as-read-back");
    expect(canUndo(rebased)).toBe(false);
    expect(canRedo(rebased)).toBe(false);
    expect(isDirty(rebased, same)).toBe(false);
  });
});
