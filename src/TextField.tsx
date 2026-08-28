/**
 * @file TextField — labeled single-line text input convenience composition.
 *
 * Keeps label, help, and error wiring in Field while Input remains the native
 * control shell. It does not add validation or a second input implementation;
 * callers own the controlled value and validation decision.
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
          inputSize={props.inputSize}
          invalid={props.error !== undefined}
          onChange={handleChange}
        />
      )}
    </Field>
  );
}
