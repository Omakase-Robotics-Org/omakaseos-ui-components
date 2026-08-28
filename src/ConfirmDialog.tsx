/**
 * @file ConfirmDialog — presentational confirm-action shell (v0.18).
 *
 * Ported from `.codex/ref/ConfirmDialog.tsx`, but DELIBERATELY narrower:
 * the ref owns the entire async lifecycle (`useAsyncFn`, a toast on
 * failure, i18n'd "Cancel"/"Saving…" labels) so a caller can pass a raw
 * `() => Promise<void>` with no local try/catch ceremony. This library
 * ships no i18n, no toast, and no async orchestration primitive — those
 * are app concerns, not shared-visual-primitive ones (the same line
 * `Menu`/`Popover` draw: no locale strings, no owned async state). So
 * this component is RENDERING ONLY:
 *
 *   - `busy` is a plain boolean the CALLER computes (however it likes —
 *     `useAsyncFn`, a manual `useState`, a mutation hook's `isPending`)
 *     and hands in; this component just aria-disables both buttons while
 *     it is true and refuses to invoke `onConfirm`/`onCancel` in that
 *     state (`Button`'s own `aria-disabled` register already guards the
 *     click, so this component adds no extra guard logic).
 *   - `confirmLabel` / `cancelLabel` / `closeLabel` are the caller's own
 *     words (no "Saving…" busy-label swap here — if a caller wants that,
 *     it computes the label itself and passes it as `confirmLabel`).
 *   - No `showToast` on failure — the caller's async wrapper decides what
 *     "it failed" looks like.
 *
 * The dashboard keeps its current async-lifecycle component (renamed
 * `ConfirmAction` there) composing this presentational shell instead of
 * hand-rolling the dialog+buttons shape again; that rename/composition is
 * app-side work, out of scope here.
 */
import { Dialog } from "./Dialog";
import { Button } from "./Button";
import type { ButtonVariant } from "./Button";
import styles from "./ConfirmDialog.module.css";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  /** Visual weight of the confirm button. Defaults to "danger" — this
   * shell exists for disruptive/destructive confirmations. */
  confirmVariant?: ButtonVariant;
  /** Caller-computed async-in-flight state. Aria-disables BOTH buttons
   * (via `Button`'s own `aria-disabled` register — the click is refused
   * there, not re-implemented here) and this component does not invoke
   * `onConfirm`/`onCancel` on its own while true. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Presentational confirmation dialog. No async lifecycle, no toast, no
 * i18n — see the file header for why, and for the dashboard's
 * `ConfirmAction` as the app-side composition that adds those back. */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const busy = props.busy ?? false;
  return (
    <Dialog
      open={props.open}
      title={props.title}
      closeLabel={props.closeLabel}
      onClose={props.onCancel}
      footer={
        <>
          <Button onClick={props.onCancel} aria-disabled={busy}>
            {props.cancelLabel}
          </Button>
          <Button
            variant={props.confirmVariant ?? "danger"}
            aria-disabled={busy}
            onClick={props.onConfirm}
          >
            {props.confirmLabel}
          </Button>
        </>
      }
    >
      <p className={styles.body}>{props.body}</p>
    </Dialog>
  );
}
