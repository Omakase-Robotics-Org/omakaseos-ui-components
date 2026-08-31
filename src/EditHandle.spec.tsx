import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditHandle } from "./EditHandle";
import type { EditHandleProps } from "./EditHandle";
import styles from "./EditHandle.module.css";

const STATES: readonly EditHandleProps["state"][] = [
  "idle",
  "hover",
  "selected",
  "primary",
  "dragging",
];

/** Every geometry attribute SVG would let an element carry. */
const GEOMETRY_ATTRIBUTES = ["r", "cx", "cy", "x", "y", "width", "height", "rx", "ry", "d"];

function outerGroup(container: HTMLElement): Element {
  const group = container.querySelector("svg > g");
  expect(group).not.toBeNull();
  return group as Element;
}

function anchorOf(container: HTMLElement): Element {
  const anchor = container.querySelector("[data-edit-glyph]");
  expect(anchor).not.toBeNull();
  return anchor as Element;
}

describe("EditHandle", () => {
  it("renders as an SVG fragment with a fixed hidden, non-focusable boundary", () => {
    const { container } = render(
      <svg>
        <EditHandle x={20} y={30} kind="anchor" state="idle" />
      </svg>,
    );
    const group = outerGroup(container);
    expect(group).toHaveAttribute("aria-hidden", "true");
    expect(group).toHaveAttribute("focusable", "false");
    expect(container.querySelector("rect")).not.toBeNull();
  });

  it("places the body by transform and carries the host's counter-scale", () => {
    const { container } = render(
      <svg>
        <EditHandle x={20} y={30} kind="anchor" state="idle" unitsPerPixel={2.5} />
      </svg>,
    );
    const body = container.querySelector("svg > g > g");
    expect(body).toHaveAttribute("transform", "translate(20 30) scale(2.5)");
  });

  it("refuses a counter-scale that would silently draw every affordance wrong", () => {
    // Fail-first: a zero or negative units-per-pixel is not a value to default
    // away from, it is a broken host.
    expect(() =>
      render(
        <svg>
          <EditHandle x={0} y={0} kind="anchor" state="idle" unitsPerPixel={0} />
        </svg>,
      ),
    ).toThrow(/unitsPerPixel/);
  });

  it("carries no drawn size of its own: the geometry is the design system's", () => {
    // The reason a state CANNOT change the size any more: there is no size in
    // the markup to change. Every length resolves from a --ds-edit-* token in
    // EditHandle.module.css through a CSS geometry property.
    const { container } = render(
      <svg>
        <EditHandle x={20} y={30} kind="place" state="selected" heading={0} />
      </svg>,
    );
    for (const element of container.querySelectorAll("rect, circle")) {
      const carried = GEOMETRY_ATTRIBUTES.filter((name) => element.hasAttribute(name));
      expect(carried, `${element.tagName} carries drawn geometry as an attribute`).toEqual([]);
    }
  });

  it("distinguishes a place from an anchor by SHAPE, using the identical rect", () => {
    // Same element, same class, same tokens: a place is the anchor rotated 45
    // degrees into a diamond. Nothing here can make one of them larger.
    const anchor = render(
      <svg>
        <EditHandle x={20} y={30} kind="anchor" state="idle" />
      </svg>,
    );
    const place = render(
      <svg>
        <EditHandle x={20} y={30} kind="place" state="idle" />
      </svg>,
    );
    const anchorRect = anchorOf(anchor.container);
    const placeRect = anchorOf(place.container);
    expect(anchorRect.tagName).toBe("rect");
    expect(placeRect.tagName).toBe("rect");
    expect(anchorRect).toHaveAttribute("data-edit-glyph", "anchor");
    expect(placeRect).toHaveAttribute("data-edit-glyph", "place");
    expect(anchorRect.getAttribute("class")).toBe(placeRect.getAttribute("class"));
    expect(anchorRect.getAttribute("transform")).toBeNull();
    expect(placeRect).toHaveAttribute("transform", "rotate(45)");
  });

  it("draws EVERY state at the identical geometry, and changes only the register", () => {
    // The inversion of the pre-v0.20 assertion, which asserted that selected /
    // dragging were 1.7x an idle handle. Illustrator's rule: the anchor does not
    // grow when it is selected, its FILL changes.
    const drawn = STATES.map((state) => {
      const { container } = render(
        <svg>
          <EditHandle x={20} y={30} kind="place" state={state} heading={0} />
        </svg>,
      );
      const anchor = anchorOf(container);
      return {
        state,
        placement: container.querySelector("svg > g > g")?.getAttribute("transform"),
        tag: anchor.tagName,
        shape: anchor.getAttribute("transform"),
        className: anchor.getAttribute("class"),
        register: outerGroup(container).getAttribute("class"),
      };
    });

    const first = drawn[0]!;
    for (const entry of drawn) {
      expect(entry.placement, entry.state).toBe(first.placement);
      expect(entry.tag, entry.state).toBe(first.tag);
      expect(entry.shape, entry.state).toBe(first.shape);
      expect(entry.className, entry.state).toBe(first.className);
    }
    // ...while the state register (the class the CSS paints from) is distinct
    // for every one of them, so "identical geometry" is not "identical glyph".
    expect(new Set(drawn.map((entry) => entry.register)).size).toBe(STATES.length);
    for (const state of STATES) {
      const { container } = render(
        <svg>
          <EditHandle x={20} y={30} kind="anchor" state={state} />
        </svg>,
      );
      expect(outerGroup(container)).toHaveClass(styles[state]!);
      expect(outerGroup(container)).toHaveAttribute("data-state", state);
    }
  });

  it("annotates the selection's primary with a ring, without touching the anchor", () => {
    // Which member of a multi-selection owns the heading knob has to be
    // readable from the shape; inferring it from "the one with a knob" fails
    // exactly when the knob is hidden by the arming radius.
    const selected = render(
      <svg>
        <EditHandle x={20} y={30} kind="anchor" state="selected" />
      </svg>,
    );
    expect(selected.container.querySelectorAll("circle")).toHaveLength(0);

    const primary = render(
      <svg>
        <EditHandle x={20} y={30} kind="anchor" state="primary" />
      </svg>,
    );
    const ring = primary.container.querySelector(`circle.${styles.primaryRing}`);
    expect(ring).not.toBeNull();
    expect(ring).toHaveAttribute("data-edit-annotation", "primary");
    // The ring is an annotation, not the body: it never claims the glyph hook,
    // and it carries no radius of its own (the token fixes it).
    expect(ring).not.toHaveAttribute("data-edit-glyph");
    expect(ring).not.toHaveAttribute("r");
    expect(primary.container.querySelector("svg > g")).toHaveAttribute("data-state", "primary");
    expect(anchorOf(primary.container).getAttribute("class")).toBe(
      anchorOf(selected.container).getAttribute("class"),
    );
  });

  it("draws the optional facing as a rotated tick, in degrees from radians", () => {
    const { container } = render(
      <svg>
        <EditHandle x={20} y={30} kind="place" state="selected" heading={Math.PI / 2} />
      </svg>,
    );
    const tick = container.querySelector(`rect.${styles.tick}`);
    expect(tick).not.toBeNull();
    expect(tick).toHaveAttribute("data-edit-annotation", "heading");
    expect(tick?.parentElement).toHaveAttribute("transform", "rotate(90)");
    // Where the tick starts and how long it is are tokens, not props.
    expect(tick).not.toHaveAttribute("x");
    expect(tick).not.toHaveAttribute("width");
  });

  it("omits the facing entirely when none is supplied", () => {
    const { container } = render(
      <svg>
        <EditHandle x={20} y={30} kind="anchor" state="idle" />
      </svg>,
    );
    expect(container.querySelectorAll(`rect.${styles.tick}`)).toHaveLength(0);
  });
});
