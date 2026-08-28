/**
 * @file Dialog — modal built on the native `<dialog>` element (v0.19).
 *
 * Ported from `.codex/ref/Dialog.tsx` (the dashboard implementation this
 * library absorbs). `showModal()` gives focus trapping, Escape handling,
 * and `::backdrop` for free; this component syncs the imperative dialog
 * API with the `open` prop and reports dismissal through `onClose`.
 *
 * One deliberate difference from the ref: the ref wires `onClose` ONLY to
 * the native "close" DOM event and relies on the browser's own
 * cancel-then-close cascade (Escape fires `cancel`; if unhandled, the
 * browser's default action closes the dialog, which then fires "close")
 * to reach it. This component instead handles `cancel` itself
 * (`preventDefault()` + call `onClose` directly) and does NOT also listen
 * for "close" — see the `onCancel` handler's own comment below for why
 * that avoids a double-invoke. The practical reason for the divergence:
 * jsdom (this repo's test environment) does not implement the UA-native
 * cancel-then-close cascade at all (nor `showModal()`/`close()`
 * themselves — the spec file's own header explains the polyfill), so the
 * required jsdom coverage of "onClose fires on the cancel event" needs an
 * explicit handler to assert against.
 *
 * The `<dialog>` is rendered through a portal anchored at `document.body`
 * so its DOM ancestry is independent of the call site. Native
 * `showModal()` promotes the element to the top *paint* layer, but CSS
 * inheritance follows DOM ancestry — without the portal, a dialog opened
 * from inside (e.g.) a `<td data-align="end">` would inherit the cell's
 * text-align, font-variant-numeric, and any other heritable property. The
 * portal is what makes "looks the same wherever you call it from" actually
 * true (the same reasoning `Menu`'s header gives for its own portal).
 *
 * Unlike the ref, `closeLabel` is a REQUIRED, un-defaulted prop: this
 * library holds no locale strings (see `Menu`/`Popover`, neither of which
 * imports an i18n provider either) — a default English "Close" would be a
 * silent fallback the workspace bans. The consumer's own i18n owns the
 * word.
 *
 * `footerStart` (NEW here, v0.19): a start-aligned footer slot. The
 * dashboard's `FormDialog` (`.codex/ref/FormDialog.tsx`) already promises
 * this shape — its `extraActions` prop's own doc comment says "rendered on
 * the left of the footer" — but `FormDialog` only ever spreads
 * `{props.extraActions}` as the footer fragment's first CHILD, and
 * `Dialog.module.css`'s `.footer` is a plain `justify-content: flex-end`
 * row with no CSS to pull an early child to the opposite edge. The result
 * (verified against the ref pair) is that `extraActions` renders immediately
 * to the LEFT of Cancel, not on the left of the footer row as documented.
 * `footerStart` here is a real, dedicated slot: `.footerStart` carries
 * `margin-right: auto` so it (and only it) is pushed to the row's start
 * edge while `footer`'s own content stays flush right.
 */
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { PanelScopeReset } from "./PanelScope";
import styles from "./Dialog.module.css";

function DialogDescription(props: { id: string; text: string | undefined }) {
  if (props.text === undefined) {
    return null;
  }
  return (
    <p id={props.id} className={styles.description}>
      {props.text}
    </p>
  );
}

/** Inline "×" glyph for the close button — no icon dependency (matches
 * lucide-react's `X` glyph geometry so the swap is visually silent). */
function CloseGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Width preset of the dialog. `md` (default) is the historical 480px form
 * dialog used everywhere else; `lg` opens the surface up to 960px for
 * library/grid views like the preset library. Encoded as a data attribute
 * so the CSS owns the actual breakpoints.
 */
export type DialogSize = "md" | "lg";

export type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  size?: DialogSize;
  /**
   * Accessible name of the close (×) button. REQUIRED and un-defaulted —
   * see the file header: the library holds no locale strings, so a
   * default English label would be a silent fallback.
   */
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * Start-aligned footer slot (v0.19) — a destructive secondary action
   * (e.g. "Remove SSO") that sits on the LEFT of the footer row while
   * `footer`'s cancel/submit pair stays right. See the file header for why
   * this exists as a dedicated prop rather than a footer-fragment
   * convention.
   */
  footerStart?: ReactNode;
};

/** Modal dialog with title, optional description, body, and footer. */
export function Dialog(props: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Stable ids so `aria-labelledby` / `aria-describedby` can reach the
  // visible heading and description text — screen readers then announce
  // both when the dialog is focused. NOT a duplicated `aria-label`
  // (`aria-label={props.title}` repeats the h2's own text and drops the
  // description on the floor entirely) — port of the ref's reasoning.
  const headingId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (props.open && !dialog.open) {
      dialog.showModal();
    }
    if (!props.open && dialog.open) {
      dialog.close();
    }
  }, [props.open]);

  const node = (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      data-size={props.size ?? "md"}
      aria-labelledby={headingId}
      aria-describedby={props.description === undefined ? undefined : descriptionId}
      onCancel={(event) => {
        // Controlled component: don't let the native default action (close
        // the dialog out from under the `open` prop) run — report the
        // request through the same `onClose` the close button uses, and
        // let the effect above call `.close()` once the controlling parent
        // actually flips `open` to false. Escape is the only way `cancel`
        // fires on a `showModal()` dialog.
        //
        // Deliberately NOT also wiring the native "close" DOM event to
        // onClose here (the ref does, relying on the browser's own
        // cancel-then-close cascade to reach it exactly once): with
        // preventDefault() above, the ONLY way `dialog.open` ever becomes
        // false is the effect's own `.close()` call, which always runs
        // AFTER onClose has already been reported once (from here or the
        // close button). Wiring `onClose` to "close" too would fire it a
        // second time for the same Escape. `.close()`'s own "close" event
        // is therefore an unlistened echo, not a second source of truth.
        event.preventDefault();
        props.onClose();
      }}
    >
      <div className={styles.header}>
        <div>
          <h2 id={headingId} className={styles.title}>
            {props.title}
          </h2>
          <DialogDescription id={descriptionId} text={props.description} />
        </div>
        <button
          type="button"
          className={styles.closeButton}
          aria-label={props.closeLabel}
          onClick={props.onClose}
        >
          <CloseGlyph />
        </button>
      </div>
      {/* A Card composed into a dialog's body is its own top-level surface,
          not content of whatever Panel happened to render the trigger —
          same carve-out Popover/Menu apply; see PanelScope.tsx. */}
      <PanelScopeReset>
        <div className={styles.body}>{props.children}</div>
        {props.footer === undefined && props.footerStart === undefined ? null : (
          <div className={styles.footer}>
            {props.footerStart === undefined ? null : (
              <div className={styles.footerStart}>{props.footerStart}</div>
            )}
            {props.footer}
          </div>
        )}
      </PanelScopeReset>
    </dialog>
  );

  return createPortal(node, document.body);
}
