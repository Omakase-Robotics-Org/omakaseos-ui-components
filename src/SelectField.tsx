/**
 * @file SelectField — labeled native select convenience composition.
 *
 * Keeps label, help, and error wiring in Field while Select remains the
 * native dropdown shell. Two disabled registers are intentional:
 *
 * - `disabled` on the field — the whole control is inert while its candidate
 *   list is in flight, so the operator cannot pick from an empty list and
 *   wonder why nothing happened.
 * - `disabled` on an OPTION — the candidate exists and is worth showing (so
 *   the operator can read why), but cannot be chosen. Hiding it would turn
 *   "this item is missing its files" into "this item does not exist".
 */
import type { ChangeEvent } from "react";
import { Field } from "./Field";
import { Select } from "./Select";

export type SelectOption = {
  readonly value: string;
  readonly label: string;
  /** Shown but not choosable — a candidate worth displaying with a notice, not hiding. */
  readonly disabled?: boolean;
};

/** Labeled controlled native select. */
export function SelectField(props: {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  /** Makes the whole control inert (e.g. while candidates load). */
  disabled?: boolean;
  help?: string;
  error?: string;
}) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    props.onChange(event.target.value);
  };

  return (
    <Field label={props.label} help={props.help} error={props.error}>
      {(id) => (
        <Select
          id={id}
          value={props.value}
          onChange={handleChange}
          disabled={props.disabled ?? false}
          invalid={props.error !== undefined}
        >
          {props.options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled ?? false}>
              {option.label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
