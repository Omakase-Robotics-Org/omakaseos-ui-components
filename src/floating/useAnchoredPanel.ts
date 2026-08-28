/**
 * @file `useAnchoredPanel` — the callback-ref measurement + reposition hook
 * `Popover` and `Menu` both build on. INTERNAL — not exported from
 * `src/index.ts`.
 *
 * Ported from how BOTH `.codex/ref/Popover.tsx` and `.codex/ref/Menu.tsx`
 * measure: a callback ref (not an effect), so the panel's size is read the
 * moment it mounts — synchronously, during commit, before the browser
 * paints — and the hidden->positioned swap never flashes at `{ top: 0, left:
 * 0 }`. Escape / outside-pointerdown / scroll / resize dismissal is NOT part
 * of this hook: the refs differ there on purpose (Popover's dialog[open]
 * carve-out vs Menu's plain dismiss-and-return-focus), so each component
 * still wires its own `useEffect` for that.
 */
import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";
import { anchoredPanelPosition } from "./anchored-position";
import type { AnchoredPanelPosition, Side } from "./anchored-position";

export type UseAnchoredPanelOptions = {
  /** The element the panel visually attaches to. */
  readonly anchorRef: RefObject<HTMLElement | null>;
  readonly side: Side;
  readonly align: "start" | "center" | "end";
  readonly offset: number;
  readonly margin: number;
};

export type UseAnchoredPanelResult = {
  /** Hand this to the portaled panel element's `ref`. */
  readonly measurePanel: (panel: HTMLElement | null) => void;
  /** The mounted panel element (`null` before mount / after unmount) — read
   * by each component's own outside-dismiss and focus-management wiring. */
  readonly panelRef: RefObject<HTMLElement | null>;
  /** `null` until the callback ref has measured; the resolved position (and
   * the side actually used, after any flip) after that. */
  readonly position: AnchoredPanelPosition | null;
  /**
   * Clears the measured position back to `null`. Ref Menu's `close()` does
   * this explicitly (`setPosition(null)`); ref Popover deliberately does
   * NOT (its file header argues the panel unmounts entirely either way, so
   * a stale coordinate can never reach the screen) — both stances are
   * preserved by leaving this opt-in rather than automatic on unmount.
   */
  readonly reset: () => void;
};

export function useAnchoredPanel(options: UseAnchoredPanelOptions): UseAnchoredPanelResult {
  const { anchorRef, side, align, offset, margin } = options;
  const panelRef = useRef<HTMLElement | null>(null);
  const [position, setPosition] = useState<AnchoredPanelPosition | null>(null);

  const measurePanel = useCallback(
    (panel: HTMLElement | null) => {
      panelRef.current = panel;
      const anchor = anchorRef.current;
      if (panel === null || anchor === null) {
        return;
      }
      setPosition(
        anchoredPanelPosition(
          anchor.getBoundingClientRect(),
          { w: panel.offsetWidth, h: panel.offsetHeight },
          {
            side,
            align,
            offset,
            margin,
            viewport: { w: window.innerWidth, h: window.innerHeight },
          },
        ),
      );
    },
    [anchorRef, side, align, offset, margin],
  );

  const reset = useCallback(() => {
    setPosition(null);
  }, []);

  return { measurePanel, panelRef, position, reset };
}
