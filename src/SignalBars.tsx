/**
 * @file SignalBars — signal strength as four ascending bars.
 *
 * Status layer. Promoted in v0.10 from `robot-status-server-app`
 * (`src/components/ui/SignalBars.tsx`), where it had already grown from a
 * single call site (the Wi-Fi settings panel's scanned-network list) into a
 * shared one (the status bar's network popover) before this promotion — the
 * exact "reused across two surfaces" signal this library exists to carry.
 * See `omksos_web/reports/ui-primitives-promotion/README.md`.
 *
 * A presentational primitive over one 0-100 link-quality number, with no
 * opinion about what the number describes and no spacing of its own (the
 * surrounding row supplies that). A signal that is not known at all is not
 * this component's concern: the source app's callers simply do not render
 * `SignalBars` when a radio has no reported signal (see the demo harness'
 * "unknown" state for the pattern) — inventing a placeholder state inside
 * the primitive would let it guess at data it was never given.
 */
import styles from "./SignalBars.module.css";

export type SignalBarsProps = {
  signal: number;
};

/** Renders signal strength as a set of ascending bars. */
export function SignalBars({ signal }: SignalBarsProps) {
  const bars = [signal >= 20, signal >= 40, signal >= 60, signal >= 80];
  return (
    <div className={styles.signalBars}>
      {bars.map((active, i) => (
        <div
          key={i}
          className={styles.signalBar}
          data-active={active ? "true" : undefined}
          style={{ height: (i + 1) * 4 }}
        />
      ))}
    </div>
  );
}
