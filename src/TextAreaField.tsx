/**
 * @file TextAreaField — labeled multi-line input convenience composition.
 *
 * Keeps label, help, and error wiring in Field while Textarea remains the
 * native control shell. It does not add validation or auto-resizing; callers
 * own the controlled value and validation decision.
 */
import type { ChangeEvent } from "react";
import { Field } from "./Field";
import { Textarea } from "./Textarea";

/** Labeled controlled multi-line text input. */
export function TextAreaField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  help?: string;
  error?: string;
}) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    props.onChange(event.target.value);
  };

  return (
    <Field label={props.label} help={props.help} error={props.error}>
      {(id) => (
        <Textarea
          id={id}
          value={props.value}
          placeholder={props.placeholder}
          rows={props.rows ?? 3}
          invalid={props.error !== undefined}
          onChange={handleChange}
        />
      )}
    </Field>
  );
}
