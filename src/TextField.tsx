/**
 * @file TextField — labeled single-line text input convenience composition.
 *
 * Keeps label, help, and error wiring in Field while Input remains the native
 * control shell. It does not add validation or a second input implementation;
 * callers own the controlled value and validation decision. `autoComplete`
 * and `required` are forwarded verbatim as native attribute declarations
 * (autofill hinting / HTML5 required-field validation) — the library does
 * not interpret or enforce them itself.
 */
import type { ChangeEvent } from "react";
import { Field } from "./Field";
import { Input } from "./Input";
import type { InputSize } from "./Input";

/** Labeled controlled text input. */
export function TextField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "url" | "password" | "date" | "datetime-local";
  help?: string;
  error?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  required?: boolean;
  inputSize?: InputSize;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    props.onChange(event.target.value);
  };

  return (
    <Field label={props.label} help={props.help} error={props.error}>
      {(id) => (
        <Input
          id={id}
          type={props.type ?? "text"}
          value={props.value}
          placeholder={props.placeholder}
          autoFocus={props.autoFocus ?? false}
          autoComplete={props.autoComplete}
          required={props.required}
          inputSize={props.inputSize}
          invalid={props.error !== undefined}
          onChange={handleChange}
        />
      )}
    </Field>
  );
}
