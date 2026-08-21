/**
 * @file StatusGlyph — a register stated as a shape, not as a colour.
 *
 * Status layer. Added in v0.15 for the acceptance-inspection host
 * (robot-inspection-web), whose palette is fully desaturated: five different
 * readings have to be told apart on a screen where every one of them is the
 * same grey. See `omksos_web/reports/ui-components-inspect-theme/README.md`.
 *
 * ## What distinguishes the registers
 *
 * Not hue — three things that survive a monochrome palette, a black-and-white
 * printout of a report, and the common colour-vision deficiencies:
 *
 * | tone      | fill        | ring          | mark |
 * | --------- | ----------- | ------------- | ---- |
 * | `success` | soft wash   | solid, faint  | `✓`  |
 * | `danger`  | solid       | none (filled) | `✕`  |
 * | `warning` | none        | dashed        | `!`  |
 * | `neutral` | none        | solid         | `—`  |
 * | `idle`    | none        | dashed        | none |
 *
 * `warning` and `idle` share a line style and are separated by presence of a
 * mark — the pair reads as "open, and someone is on it" against "nobody has
 * looked". `neutral` and `idle` share emptiness and are separated by line
 * style, which is the same distinction their tones carry (`--ds-tone-neutral-*`
 * = does not apply, `--ds-tone-idle-*` = no reading taken).
 *
 * ## Relation to `StatusBadge`
 *
 * The same thing said in the space of one character. Reach for `StatusGlyph`
 * where the register is one cell of a dense table or a run of rows and the
 * word does not fit; reach for `StatusBadge` where there is room to write it.
 * `GlyphTone` is `BadgeTone` minus `info` (a glyph is a reading, and "info" is
 * not a reading) plus `idle`.
 *
 * ## Accessible name
 *
 * `ariaLabel` is REQUIRED, unlike `Spinner`'s. Every spinner means the one
 * thing "work is in progress", so a default is right by default; a glyph means
 * whatever the consumer's domain calls this register ("OK", "不合格",
 * "not applicable"), and the shape and the tone carry all of it visually. A
 * default here would either invent domain words the library has no business
 * owning, or announce five marks as "status" five times.
 *
 * The mark itself is `aria-hidden`: `✕` is the drawing, not the message.
 */
import styles from "./StatusGlyph.module.css";

/**
 * The register the glyph states. A consuming app maps its domain enum onto
 * this once, at the edge — an inspection app's
 * `OK | NG | PENDING | NA | UNCHECKED` lands on
 * `success | danger | warning | neutral | idle`.
 */
export type GlyphTone = "success" | "danger" | "warning" | "neutral" | "idle";

/** Glyph diameter. `md` (22px) sits on a table row's line box. */
export type GlyphSize = "sm" | "md" | "lg";

export type StatusGlyphProps = {
  tone: GlyphTone;
  size?: GlyphSize;
  /**
   * What this register is called in the consumer's domain. Required: the
   * visual carries the meaning through shape alone, so the name cannot be
   * derived from anything the library knows.
   */
  ariaLabel: string;
};

/**
 * The mark drawn inside the ring. `idle` is deliberately empty — an unread
 * check has nothing to report, and a placeholder character there would read
 * as a reading of its own.
 */
const MARKS: Record<GlyphTone, string> = {
  success: "✓",
  danger: "✕",
  warning: "!",
  neutral: "—",
  idle: "",
};

/** A register stated as a shape: one round glyph, sized to a line box. */
export function StatusGlyph({ tone, size = "md", ariaLabel }: StatusGlyphProps) {
  return (
    <span
      className={styles.glyph}
      data-tone={tone}
      data-size={size}
      role="img"
      aria-label={ariaLabel}
    >
      <span className={styles.mark} aria-hidden="true">
        {MARKS[tone]}
      </span>
    </span>
  );
}
