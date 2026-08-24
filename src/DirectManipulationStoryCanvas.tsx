/**
 * @file Storybook-only SVG canvas for direct-manipulation glyph stories.
 *
 * The canvas keeps each fragment's geometry visible in isolation while the
 * render factory lets each story retain its own component prop type.
 */
import type { ReactNode } from "react";

type DirectManipulationStoryCanvasProps = {
  children: ReactNode;
};

export function DirectManipulationStoryCanvas({ children }: DirectManipulationStoryCanvasProps) {
  return (
    <svg
      width="180"
      height="120"
      viewBox="0 0 180 120"
      style={{ background: "var(--ds-surface-inset)", border: "1px solid var(--ds-border)" }}
    >
      {children}
    </svg>
  );
}

export function renderDirectManipulationGlyphInStoryCanvas<Props>(
  renderGlyph: (args: Props) => ReactNode,
) {
  return (args: Props) => (
    <DirectManipulationStoryCanvas>
      {renderGlyph(args)}
    </DirectManipulationStoryCanvas>
  );
}
