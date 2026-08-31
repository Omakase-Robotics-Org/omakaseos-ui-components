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
 * header for the editing grammar, the junction argument, and the
 * screen-constant rule.
 *
 * The story renders the editor BARE — no `instrument`, the twin beside the
 * canvas — which is the layout a full-width Storybook canvas has room for.
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

export const Default: Story = {};
