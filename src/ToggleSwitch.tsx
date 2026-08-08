/**
 * @file ToggleSwitch — controlled on/off switch rendered as a styled checkbox.
 *
 * Form layer. Promoted in v0.10 from `robot-status-server-app`
 * (`src/components/ui/ToggleSwitch.tsx`), where it backs every feature-flag
 * / on-off control on the robot console (RobotStatePanel's gesture flag,
 * ConversationStatePanel's master switch, the audio/camera popovers' device
 * toggles, ...). See `omksos_web/reports/ui-primitives-promotion/` for the
 * promotion rationale.
 *
 * Distinct from `Switch` (v0.3): `Switch` wraps a native
 * `InputHTMLAttributes<HTMLInputElement>` (uncontrolled-friendly, DOM
 * `onChange(event)`, an optional adjacent `label`) for the dashboard's form
 * idiom. `ToggleSwitch` is a fully controlled `checked` / `onChange(checked)`
 * boolean API with a *required* `ariaLabel` (it renders no visible label of
 * its own) and its "on" state reads as the console's success/running tone
 * rather than the dashboard's accent — the operator vocabulary this control
 * was built for. Both are kept, unmerged, so the robot console's ~10
 * call sites re-adapt onto this component without a call-shape rewrite.
 *
 * Like `Switch`, built on a real `<input type="checkbox" role="switch">` so
 * screen readers announce "switch, on/off" rather than "checkbox, checked".
 */
import styles from "./ToggleSwitch.module.css";

export type ToggleSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Required: the switch renders no visible label of its own. */
  ariaLabel: string;
};

/** A controlled on/off switch (styled checkbox); `ariaLabel` names it. */
export function ToggleSwitch({ checked, onChange, disabled = false, ariaLabel }: ToggleSwitchProps) {
  return (
    <label className={styles.toggleSwitch}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.toggleSlider} />
    </label>
  );
}
