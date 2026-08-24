/**
 * @file The direct-manipulation editing session — one draft, the snapshot it
 * was read from, and the timeline between them. Generic over WHAT is being
 * edited.
 *
 * There is one of these in the suite, deliberately. Two map surfaces are edited
 * here (a vendor chassis scene's waypoints and keep-out polygons; a nav-autonomy
 * recording's ordered waypoint list) and a third document lives in the dashboard,
 * and every one of them needs the same four questions answered: what did the
 * robot say, what does the operator's copy say now, can the last step be taken
 * back, and has anything changed at all. Answering them once — over a draft type
 * this module never looks inside — is what keeps "undo" from meaning three
 * slightly different things on three screens.
 *
 * ## What this module does NOT know
 *
 * It does not know how to compare two drafts. Equality is the one question that
 * cannot be answered generically: a vendor scene's draft carries the raw payload
 * objects it was read from, so structural equality over the whole draft would
 * report a change every time the robot re-sent the same scene, and a waypoint
 * list's entries carry session-local identity keys that mean nothing to the
 * robot. So {@link isDirty} takes the comparison as an argument and each document
 * states its own — `draftsAgree` for the vendor scene, `entriesAgree` for a
 * waypoint list.
 *
 * ## The timeline is a CURSOR, not a stack
 *
 * Undo moves a cursor back through the drafts this session produced; redo moves
 * it forward again. Committing a new edit after an undo DISCARDS what was in
 * front of the cursor, because the operator has just said what happens next and
 * two futures cannot both be it. That is the rule every editor an operator has
 * ever used follows, and the alternative (keeping the abandoned branch reachable)
 * would need a UI to choose between them that nobody asked for.
 *
 * Pure functions only: no React, no wire, no clock.
 */

/** A draft, the snapshot it was read from, and the timeline around it. */
export type EditSession<D> = {
  /** The draft as the robot last stated it. Undo never goes past this. */
  readonly base: D;
  /** The draft as the operator's copy stands now. */
  readonly current: D;
  /** The drafts behind the cursor, oldest first. Undo walks back through these. */
  readonly past: readonly D[];
  /** The drafts in front of the cursor, nearest first. Redo walks forward. */
  readonly future: readonly D[];
};

/** Whether two drafts say the same thing, as the document itself defines that. */
export type DraftsAgree<D> = (a: D, b: D) => boolean;

/**
 * Start an editing session over a freshly read draft.
 *
 * @param draft The draft as the robot stated it.
 * @returns The session, with nothing to undo and nothing to redo.
 */
export function beginSession<D>(draft: D): EditSession<D> {
  return { base: draft, current: draft, past: [], future: [] };
}

/**
 * Apply one edit, moving the cursor forward.
 *
 * Whatever was in FRONT of the cursor is dropped: an edit made after an undo is
 * the operator choosing this future over the one they took back.
 *
 * @param session The session.
 * @param next The draft after the edit.
 * @returns A new session.
 */
export function commitEdit<D>(session: EditSession<D>, next: D): EditSession<D> {
  return { ...session, current: next, past: [...session.past, session.current], future: [] };
}

/**
 * Whether there is an edit to take back.
 *
 * @param session The session.
 * @returns True when undo would change something.
 */
export function canUndo<D>(session: EditSession<D>): boolean {
  return session.past.length > 0;
}

/**
 * Whether there is an undone edit to put back.
 *
 * @param session The session.
 * @returns True when redo would change something.
 */
export function canRedo<D>(session: EditSession<D>): boolean {
  return session.future.length > 0;
}

/**
 * Take back the most recent edit.
 *
 * Only edits made before a save can be taken back: none of the write paths this
 * feeds offers an undo, so once a payload is written the session is re-based on a
 * fresh read (see {@link rebaseSession}) and the timeline is empty again.
 *
 * @param session The session.
 * @returns A new session, or the same one when there is nothing to undo.
 */
export function undoEdit<D>(session: EditSession<D>): EditSession<D> {
  const previous = session.past[session.past.length - 1];
  if (previous === undefined) {
    return session;
  }
  return {
    ...session,
    current: previous,
    past: session.past.slice(0, -1),
    future: [session.current, ...session.future],
  };
}

/**
 * Put back the most recently undone edit.
 *
 * @param session The session.
 * @returns A new session, or the same one when there is nothing to redo.
 */
export function redoEdit<D>(session: EditSession<D>): EditSession<D> {
  const next = session.future[0];
  if (next === undefined) {
    return session;
  }
  return {
    ...session,
    current: next,
    past: [...session.past, session.current],
    future: session.future.slice(1),
  };
}

/**
 * Throw the whole draft away and return to the loaded snapshot.
 *
 * The timeline goes with it in BOTH directions: a discard is not an edit that can
 * be redone, it is the operator saying the session never happened.
 *
 * @param session The session.
 * @returns A session with no edits.
 */
export function discardEdits<D>(session: EditSession<D>): EditSession<D> {
  return { base: session.base, current: session.base, past: [], future: [] };
}

/**
 * Re-base a session on a newly read draft, after a successful save.
 *
 * @param session The session.
 * @param draft The draft read back from the robot.
 * @returns A session with no edits and the new snapshot as its base.
 */
export function rebaseSession<D>(session: EditSession<D>, draft: D): EditSession<D> {
  return { ...session, base: draft, current: draft, past: [], future: [] };
}

/**
 * Whether the draft differs from the snapshot it was read from.
 *
 * Asked of the two drafts rather than of the timeline's length, so it holds
 * however the session got here: an edit and its undo leave a non-empty timeline
 * and a clean draft, and the operator is looking at what the robot said.
 *
 * @param session The session.
 * @param agree The document's own comparison.
 * @returns True when saving would change something.
 */
export function isDirty<D>(session: EditSession<D>, agree: DraftsAgree<D>): boolean {
  return !agree(session.base, session.current);
}
