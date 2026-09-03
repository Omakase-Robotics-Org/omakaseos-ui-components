import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandLogoSlot } from "./BrandLogoSlot";
import type { BrandLogoSlotVariant } from "./BrandLogoSlot";
import styles from "./BrandLogoSlot.module.css";

const cssSource = readFileSync(resolve(__dirname, "BrandLogoSlot.module.css"), "utf8");
// Strip block comments before asserting on declarations: the file header
// deliberately quotes the source's original raw-px values in prose, and a
// declaration-only regex must not trip over that quoting.
const cssDeclarations = cssSource.replace(/\/\*[\s\S]*?\*\//g, "");

const VARIANTS: readonly BrandLogoSlotVariant[] = ["inline", "centered", "header"];

describe("BrandLogoSlot", () => {
  it("mounts exactly one BrandLogo per variant, tagged by data-variant", () => {
    for (const variant of VARIANTS) {
      const { container } = render(<BrandLogoSlot variant={variant} />);
      const slot = container.firstElementChild as Element;
      expect(slot).toHaveAttribute("data-variant", variant);
      expect(slot).toHaveClass(styles.slot!);
      expect(slot.querySelectorAll("svg")).toHaveLength(1);
    }
  });

  it("passes a host-supplied alt through to the mounted BrandLogo", () => {
    const { container } = render(<BrandLogoSlot variant="header" alt="Custom Product" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-label", "Custom Product");
  });

  it("defaults to the library's own 'Omakase' name when no alt is supplied (existing call sites)", () => {
    const { container } = render(<BrandLogoSlot variant="header" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-label", "Omakase");
  });

  it("all three variants share the same .slot class; the visible difference is purely the data-variant attribute selectors", () => {
    const inline = render(<BrandLogoSlot variant="inline" />);
    const centered = render(<BrandLogoSlot variant="centered" />);
    const header = render(<BrandLogoSlot variant="header" />);

    const inlineSlot = inline.container.firstElementChild as HTMLElement;
    const centeredSlot = centered.container.firstElementChild as HTMLElement;
    const headerSlot = header.container.firstElementChild as HTMLElement;

    expect(inlineSlot.className).toBe(centeredSlot.className);
    expect(inlineSlot.className).toBe(headerSlot.className);
  });

  it("binds both source paddings to --ds-space-* tokens by value, and carries no host-private token", () => {
    // jsdom applies no cascade/layout, so a computed padding can't be
    // asserted here (the e2e suite is where a real gutter width would be
    // measured); this pins the actual mapping claim instead — the stylesheet
    // text itself must resolve padding-bottom/padding-left through the
    // library's own --ds-space-* scale (12px/8px respectively, matching the
    // source file's raw px values) rather than a raw literal or any
    // --omks-* / other host-private custom property.
    expect(cssDeclarations).toMatch(/padding-bottom:\s*var\(--ds-space-lg\)/);
    expect(cssDeclarations).toMatch(/padding-left:\s*var\(--ds-space-md\)/);
    expect(cssDeclarations).not.toMatch(/padding-(bottom|left):\s*\d/);
    expect(cssDeclarations).not.toMatch(/--omks/);
  });
});
