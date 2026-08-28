/**
 * @file Storybook catalog of the editing cursor vocabulary.
 *
 * The cursor is the one channel that says what a modified gesture will do
 * BEFORE it is committed, so the catalog exists to be hovered: each tile
 * applies one real `EDIT_CURSOR_VALUES` entry, and the operator's own pointer
 * is the test instrument.
 *
 * The tiles are enumerated from `EDIT_CURSOR_VALUES` itself, not from a list
 * written here, so a new cursor name appears in this catalog by construction
 * rather than by someone remembering to add it.
 *
 * `host-resting` is catalogued as a state of its own: it is the DECLARED
 * delegation "the host's own resting cursor owns this surface", and a host that
 * never wrote that rule should be able to see the hole here.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { EDIT_CURSOR_VALUES } from "./direct-manipulation";
import type { EditCursorName } from "./direct-manipulation";

const NAMES = Object.keys(EDIT_CURSOR_VALUES).sort() as readonly EditCursorName[];

/** What each cursor is FOR, so the catalog reads as vocabulary, not shapes. */
const MEANING: Readonly<Record<EditCursorName, string>> = {
  grabbing: "moving or inserting, right now",
  rotating: "rotating, right now",
  marquee: "Shift on empty floor: rubber-band a selection",
  grab: "a point that can be picked up",
  move: "an armed edge or a selected area: drag translates it",
  insert: "a vertex would be inserted here",
  delete: "coarse only: tap removes this",
  select: "an unarmed object: click arms it",
  rotate: "a heading knob",
  draw: "armed: click places a point",
  "close-ring": "the run's first point: click closes the ring",
  "finish-run": "the run's last point: click ends the run",
  "resume-run": "an existing path's end: click continues it",
  "pen-plus": "Alt over an edge: click adds a vertex",
  "pen-minus": "Alt over a point: click removes it",
  "not-allowed": "refused, with a reason the host shows",
  "host-resting": "delegated: the host's own resting cursor (pan / orbit)",
};

function CursorCatalog() {
  return (
    <div style={{ display: "grid", gap: "var(--ds-space-md)" }}>
      <p style={{ margin: 0, color: "var(--ds-text-muted)", fontSize: "var(--ds-font-size-label)" }}>
        Hover each tile. A tile whose value is delegated shows no cursor of its
        own — that is the declared behaviour, not a missing one.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "var(--ds-space-sm)",
        }}
      >
        {NAMES.map((name) => {
          const value = EDIT_CURSOR_VALUES[name];
          return (
            <div
              key={name}
              data-edit-cursor={name}
              style={{
                ...(value === null ? {} : { cursor: value }),
                display: "grid",
                gap: "var(--ds-space-2xs)",
                padding: "var(--ds-space-sm)",
                background: "var(--ds-surface-inset)",
                border: "1px solid var(--ds-border-subtle)",
                borderRadius: "var(--ds-radius-control)",
                minHeight: 72,
              }}
            >
              <code style={{ fontFamily: "var(--ds-font-mono)", color: "var(--ds-text)" }}>
                {name}
              </code>
              <span
                style={{
                  color: "var(--ds-text-secondary)",
                  fontSize: "var(--ds-font-size-label)",
                }}
              >
                {MEANING[name]}
              </span>
              <span
                style={{
                  color: "var(--ds-text-muted)",
                  fontFamily: "var(--ds-font-mono)",
                  fontSize: "var(--ds-font-size-label)",
                  overflowWrap: "anywhere",
                }}
              >
                {value === null ? "host-resting (no inline cursor)" : shortValue(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A data-URI cursor's whole value is unreadable; its fallback keyword is not. */
function shortValue(value: string): string {
  if (!value.startsWith("url(")) {
    return value;
  }
  const fallback = value.slice(value.lastIndexOf(",") + 1).trim();
  return `custom SVG, falls back to ${fallback}`;
}

const meta = {
  title: "DirectManipulation/Cursors",
  component: CursorCatalog,
  tags: ["autodocs"],
} satisfies Meta<typeof CursorCatalog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
