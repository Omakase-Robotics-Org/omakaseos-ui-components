/**
 * @file SegmentedMeter — how a fixed whole is divided, as one pill-shaped bar.
 *
 * Status layer. Added in v0.15 for the acceptance-inspection host
 * (robot-inspection-web), where a sheet's progress is not one number but a
 * breakdown: so many checks passed, so many failed, so many still open, so
 * many excluded — and the palette has no hue to tell them apart. See
 * `omksos_web/reports/ui-components-inspect-theme/README.md`.
 *
 * ## Why weight and not colour
 *
 * Each segment declares one of four `weight`s, drawn as tiers of the surface's
 * own ink (`--ds-text` at 90% / 55% / 30% / 16%). The tiers are ORDERED, so
 * the bar states a ranking as well as a division, and it survives a
 * desaturated palette, a greyscale printout, and colour-vision deficiency
 * alike — a four-colour bar states none of that reliably.
 *
 * `weight` is required on every segment rather than derived from position. A
 * meter with three segments would otherwise silently skip a tier depending on
 * which three, and "the second one is the strong one" is a fact about the
 * caller's data, not about the array.
 *
 * ## The whole
 *
 * `total` is the denominator: pass it when the whole is larger than what the
 * segments account for, and the unaccounted part shows as empty track (the
 * common case — an inspection sheet's untouched rows are the remainder, not a
 * segment). Omit it and the segments ARE the whole.
 *
 * The denominator used is `max(total, sum of values)`, so a `total` smaller
 * than what the segments hold widens the whole instead of letting the bar
 * overflow or clip: an over-full meter that renders as exactly full would
 * report a division that is not the one it was given.
 *
 * ## Presentational, like every meter in this layer
 *
 * No animation and no internal state: the host owns when the numbers change.
 * Segments whose value is zero render no element at all — a zero-width sliver
 * is invisible but still a DOM node a test would have to reason about, and
 * "no failures" is the absence of that segment, not an empty one.
 *
 * ## Accessible name
 *
 * `role="img"` with a REQUIRED `ariaLabel`, for the same reason as
 * `StatusGlyph`: the division is drawn, and only the caller knows what the
 * segments are ("42 of 60 checks: 30 passed, 8 failed, 4 open"). A `<progress>`
 * element is deliberately not used — it states one value against a maximum,
 * which is precisely what this primitive exists not to do.
 */
import styles from "./SegmentedMeter.module.css";

/**
 * How strongly a segment is inked. Ordered: `full` is the heaviest. The names
 * are weights, not registers — a caller decides which of its categories is
 * heaviest, and that decision is what the ordering shows.
 */
export type SegmentWeight = "full" | "strong" | "medium" | "faint";

export type MeterSegment = {
  /** Stable key, and the value of the segment's `data-segment` attribute. */
  readonly id: string;
  /** Count (or any additive quantity) this segment accounts for. */
  readonly value: number;
  readonly weight: SegmentWeight;
};

/** Bar thickness. `md` (6px) is the thickness a bar under a heading reads at. */
export type SegmentedMeterSize = "sm" | "md";

export type SegmentedMeterProps = {
  segments: readonly MeterSegment[];
  /** Denominator, when the whole is larger than the segments. See the header. */
  total?: number;
  size?: SegmentedMeterSize;
  /** What the division says, in the consumer's own words. Required. */
  ariaLabel: string;
};

/** A fixed whole divided into ordered, differently-inked segments. */
export function SegmentedMeter({
  segments,
  total,
  size = "md",
  ariaLabel,
}: SegmentedMeterProps) {
  const held = segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);
  const denominator = Math.max(total ?? 0, held);
  const drawn = segments.filter((segment) => segment.value > 0);
  /* Rounded to 4 decimals (sub-pixel on any real bar) and then back through
     Number so a whole share serializes as `25%`, not `25.0000%` — the value is
     asserted as a string in specs and must not depend on how a given CSSOM
     implementation normalizes trailing zeros. */
  const share = (value: number) => `${Number(((value / denominator) * 100).toFixed(4))}%`;

  return (
    <span
      className={styles.meter}
      data-size={size}
      role="img"
      aria-label={ariaLabel}
    >
      {/* denominator === 0 means nothing has been counted yet: the track shows
          through at full width, which is the honest drawing of an empty whole
          (and avoids dividing by it). */}
      {denominator === 0
        ? null
        : drawn.map((segment) => (
            <span
              key={segment.id}
              className={styles.segment}
              data-segment={segment.id}
              data-weight={segment.weight}
              style={{ width: share(segment.value) }}
            />
          ))}
    </span>
  );
}
