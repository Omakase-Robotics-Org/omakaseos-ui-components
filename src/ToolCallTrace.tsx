/**
 * @file ToolCallTrace — render one OpenAI Realtime API tool call, including
 *       streaming JSON arguments and (consumer-managed) execution status.
 *
 * Maps to the events:
 *   - response.function_call_arguments.delta  → set `argsRaw` to the
 *     accumulated chunk; status: "running"
 *   - response.function_call_arguments.done   → set `args` (parsed) and
 *     status: "running" or higher
 *   - consumer-side tool dispatch result      → status: "succeeded" |
 *     "failed", optionally with `result` populated
 *
 * The Realtime API itself does not report tool execution outcome (the host
 * runs the tool); the props slot for `status` and `result` lets the
 * consumer surface its dispatcher's outcome in the same card the user
 * already sees.
 *
 * Argument display rules:
 *   - `args !== undefined` → JSON.stringify(args, null, 2)
 *   - else if `argsRaw !== undefined` → use as-is (streaming, possibly
 *     incomplete JSON; we preserve newlines)
 *   - else → empty pre block
 */
import type { HTMLAttributes, ReactNode } from "react";
import { StatusBadge, type BadgeTone } from "./StatusBadge";
import styles from "./ToolCallTrace.module.css";

export type ToolCallStatus = "pending" | "running" | "succeeded" | "failed";

export type ToolCallTraceProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  /** Parsed arguments. Takes precedence over `argsRaw` when set. */
  args?: unknown;
  /** Raw arguments string, useful for streaming partial JSON. */
  argsRaw?: string;
  status: ToolCallStatus;
  /** Optional render result of the tool's execution. */
  result?: ReactNode;
  /** Override the automatic status → tone mapping. */
  statusTone?: BadgeTone;
  /** Override the visible status label (defaults to the status string). */
  statusLabel?: ReactNode;
};

function defaultTone(status: ToolCallStatus): BadgeTone {
  if (status === "succeeded") {
    return "success";
  }
  if (status === "failed") {
    return "danger";
  }
  if (status === "running") {
    return "info";
  }
  return "neutral";
}

function formatArgs(args: unknown, argsRaw: string | undefined): string {
  if (args !== undefined) {
    try {
      return JSON.stringify(args, null, 2);
    } catch {
      return String(args);
    }
  }
  if (argsRaw !== undefined) {
    return argsRaw;
  }
  return "";
}

export function ToolCallTrace({
  name,
  args,
  argsRaw,
  status,
  result,
  statusTone,
  statusLabel,
  className,
  ...rest
}: ToolCallTraceProps) {
  const tone = statusTone ?? defaultTone(status);
  const label = statusLabel ?? status;
  const cls = className ? `${styles.trace} ${className}` : styles.trace;
  const argsText = formatArgs(args, argsRaw);
  return (
    <div className={cls} data-status={status} {...rest}>
      <div className={styles.header}>
        <span className={styles.name}>{name}</span>
        <StatusBadge tone={tone} size="sm">
          {label}
        </StatusBadge>
      </div>
      <pre className={styles.args} data-testid="tool-call-args">
        {argsText}
      </pre>
      {result === undefined ? null : (
        <div className={styles.result} data-testid="tool-call-result">
          {result}
        </div>
      )}
    </div>
  );
}
