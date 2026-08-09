/**
 * @file Toast — one transient notification card, in a semantic tone.
 *
 * Status layer. Added in v0.11; both consuming apps had grown their own
 * toast card (the robot console's `components/ui/Toast.tsx`, the
 * dashboard's `components/toast/ToastProvider.tsx`) around the same four
 * registers. See `omksos_web/reports/rssa-ui-unification/README.md`.
 *
 * ## What this component owns, and what it does not
 *
 * It owns ONE card: its surface, its tone, its semantics, and its
 * enter/exit transition. It does not own:
 *
 *   - **when the toast goes away** — no timer, no `useEffect`. The hosts
 *     already disagree here (the console dismisses after 5s, the
 *     dashboard after 3.2s) and the timing is a product decision, not a
 *     visual one.
 *   - **where the toast sits** — no `position: fixed`, no portal. The
 *     console pins a single card bottom-right; the dashboard stacks cards
 *     bottom-center in a viewport element. A library card that positioned
 *     itself could serve only one of them, and would escape any container
 *     it was demoed or storyboarded inside.
 *
 * So the host renders `<Toast>` inside its own (positioned) viewport and
 * drives `open` from its own lifecycle.
 *
 * ## Why `open` instead of mount/unmount
 *
 * The console keeps its card mounted and slides it out, so it needs a
 * closed *state*, not an unmount. `open` is expressed as a data attribute
 * and the transition is pure CSS — no JS-driven enter/exit state machine.
 * Hosts that prefer to unmount simply never pass `open={false}`.
 *
 * A closed card also stops taking pointer events (see the CSS): the
 * console's faded-out card currently sits over the bottom-right corner of
 * the page and swallows clicks there.
 *
 * ## Why the role is derived from the tone
 *
 * "It did not happen" must interrupt; the other three registers must not.
 * That is precisely the ARIA difference between `alert` (implicit
 * `aria-live="assertive"`) and `status` (implicit `aria-live="polite"`),
 * so the mapping is a total `Record` over the tone union rather than a
 * condition at each call site — and adding a tone to the vocabulary
 * becomes a compile error here instead of a silent "polite".
 *
 * `aria-live` is deliberately NOT set: each role already implies the right
 * politeness, and hardcoding one would flatten that distinction.
 *
 * ## Tone vocabulary
 *
 * `BadgeTone` — the library's single semantic tone union, named for its
 * first consumer (`StatusBadge`). Both apps' toast registers map onto it
 * at the edge, the same way their status vocabularies already do:
 * `success → success`, `warning → warning`, `error → danger`,
 * `info → info` (`neutral` is available for a notice that should carry no
 * color at all).
 *
 * ## No close button
 *
 * Neither consumer has one: both auto-dismiss, and the console's card is
 * not even interactive. A dismiss affordance would need an `onClose` that
 * no host is in a position to implement today (the host owns the timer,
 * and cancelling it is its business), so it is left out rather than
 * shipped dead. Add it with the consumer that needs it.
 */
import type { ReactNode } from "react";
import type { BadgeTone } from "./StatusBadge";
import styles from "./Toast.module.css";

/**
 * The register a toast lands in. An alias of `BadgeTone`, not a second
 * vocabulary: one tone union serves every semantic surface in the library.
 */
export type ToastTone = BadgeTone;

/**
 * Tone → ARIA role. Total over the tone union so a new tone cannot land
 * without deciding whether it interrupts the user.
 */
const TOAST_ROLE: Record<BadgeTone, "alert" | "status"> = {
  /** It did not happen — interrupt. */
  danger: "alert",
  /** Everything else is a report on something the user is already doing. */
  success: "status",
  warning: "status",
  info: "status",
  neutral: "status",
};

export type ToastProps = {
  tone: ToastTone;
  /** Visible (and interactive) when true; slides out when false. Default true. */
  open?: boolean;
  /** The message. Newlines are preserved (the console sends multi-line errors). */
  children?: ReactNode;
};

/** One transient notification card; the host owns placement and timing. */
export function Toast({ tone, open = true, children }: ToastProps) {
  return (
    <div
      className={styles.toast}
      data-tone={tone}
      data-open={open ? "true" : "false"}
      role={TOAST_ROLE[tone]}
    >
      {children}
    </div>
  );
}
