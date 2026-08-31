/**
 * @file The PRACTICAL map editor story — the review surface for
 * {@link MapCanvasEditorSurface}.
 *
 * The editor itself lives in `src/MapCanvasEditorSurface.tsx`, because it has
 * two hosts and this is only one of them: this story is the catalog entry a
 * reviewer opens, and `demo/map-canvas-demo.tsx` is the same editor inside the
 * demo harness, where `spec/map-canvas.e2e.spec.ts` drives it with real wheel,
 * pointer and modifier events in a real browser. `build-storybook` COMPILES a
 * story and never runs it, so a story alone is evidence that the editor
 * type-checks and nothing more; the two hosts share one module so the reviewed
 * editor and the proven editor cannot become two programs. See that file's
 * header for the editing grammar, the CRUD table, the ring-proxy argument and
 * the screen-constant rule.
 *
 * ## What to try, in the order that shows the most
 *
 *  1. **Add a corridor.** Press *Add points*, click twice on open floor: two
 *     vertices and the line between them. Keep clicking — the pen stays armed.
 *     Now click an EXISTING station: the pen joins to that one instead of
 *     placing a duplicate on top of it. Enter ends the chain.
 *  2. **Rename and retype a station.** Click one. Its own controls appear on
 *     the map: type a new name in the field and press *Rename*, or press
 *     *Make path point* — the name and the heading go with it, because a path
 *     point has neither.
 *  3. **Turn a station.** Move the pointer near a selected station until its
 *     heading knob appears, then drag the knob. Shift quantises to 15°.
 *  4. **Add and remove a point on a line.** Click a line, then double-click it
 *     (or Alt-click it) to split it in two at the point you aimed at. The
 *     selection's *Direction* control cycles the vendor's `oneWay` numeral and
 *     the arrow drawn on the line follows it. Alt-click a vertex to remove it,
 *     and every line that ended on it goes too.
 *  5. **Draw a virtual wall, then make it an area.** Press *Draw keep-out*,
 *     click two corners, press *Finish*: two points are a wall, which is the
 *     whole of what makes it one. Select it and press *Add corner* — three
 *     points are a forbidden polygon, and the drawing changes from a thick
 *     segment to a filled ring because the point count changed.
 *  6. **Draw a typed zone.** Press *Draw zone*, pick one of the vendor's eight
 *     types, click three corners, then click the first corner again to close
 *     the ring. Retype it from the selection's control afterwards.
 *  7. **Watch a refusal.** Alt-click one end of a virtual wall: it declines,
 *     and says that a keep-out entry of one point is `geometry.keepout-
 *     degenerate` and that removing the ENTRY is the decision to state
 *     instead. Nothing an operator can do here writes a scene the linter then
 *     refuses to save.
 *
 * Everything above is also reachable from the twin beside the canvas, by
 * keyboard, because the canvas is decorative `aria-hidden` SVG and the twin is
 * the accessible route. The twin is no longer the primary surface, though: its
 * first section is the selection and its verbs, and the scene's inventory sits
 * below it in collapsible groups per element kind.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { MapCanvasEditorSurface } from "./MapCanvasEditorSurface";

const meta = {
  title: "MapCanvas/Editor",
  component: MapCanvasEditorSurface,
  tags: ["autodocs"],
} satisfies Meta<typeof MapCanvasEditorSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The review layout: a wide canvas with the twin in a column beside it. */
export const Default: Story = {};

/**
 * The narrow layout, as a dashboard panel or the demo harness's half-width
 * column gets it: the twin goes BELOW, because a 300 px sidebar beside a
 * narrow canvas leaves too little map to point at.
 */
export const NarrowHost: Story = {
  args: { twin: "below", canvasHeightPx: 420 },
};
