/**
 * @file E2E: prove the v0.13 rule "a nested Card is a section" in a real browser.
 *
 * Panel and Card are drawn from the same recipe (a --ds-surface fill inside a
 * --ds-border outline, lifted by --ds-shadow-card). v0.12 relaxed that recipe
 * for a nested card — shadow dropped, border stepped down — and the consumer
 * read the result as a change of manner, not of structure: a fainter frame
 * inside a frame is still a frame inside a frame (omksos_web
 * `reports/monitor-scope-coherence/`, ruling B). v0.13 replaces the rule: in a
 * panel body a Card stops being a surface altogether and becomes a section —
 * a heading, its content, and the space around it.
 *
 * The rule is a CSS ancestor selector with no prop and no class of its own, so:
 *
 *   - vitest/jsdom can only show the structure it stands on (Panel's scope
 *     marker, the nested card being a descendant of it, and the declaration
 *     list itself) — done in `src/Card.spec.tsx`;
 *   - whether the cascade resolves, and whether what it produces actually reads
 *     as sections — alignment and rhythm are measurements, and a measurement
 *     needs a layout engine — is only observable here.
 *
 * Both host sections are checked, because the two consuming apps map --ds-* to
 * different palettes and a rule that resolves in one is not evidence for the
 * other.
 */
import { test, expect, type Locator, type Page } from "playwright/test";

/**
 * `shadowBound` is the host's own answer to "does a card float by shadow at
 * all". The dashboard binds --ds-shadow-card to a real shadow; the robot
 * console's dark palette binds `--shadow-card: none` (rssa
 * `src/styles/variables.css`), so there the shadow half of the rule is a no-op
 * and the rest is the entire visible change. That is stated here rather than
 * skipped: a host that gains a shadow later fails this expectation and gets the
 * full nested-vs-bare comparison, instead of quietly passing a check that
 * compares "none" with "none".
 */
const HOSTS = [
  { selector: ".host--status-webui", anchor: "status-webui", shadowBound: false },
  { selector: ".host--omks-web", anchor: "omks-web", shadowBound: true },
] as const;

/** The bare control card: the same component, the same call shape, outside any
 * panel body. Every "nested" expectation below is paired with this, so the file
 * proves a difference rather than a state. */
function bareCard(page: Page, host: string): Locator {
  return page.locator(host).locator('[data-testid="bare-card"] > section');
}

/** The panel that holds the nested sections, addressed by its anchor id. */
function sectionsPanel(page: Page, anchor: string): Locator {
  return page.locator(`#${anchor}-conversation-state`);
}

/**
 * The nested sections in document order. Deliberately NOT selected by testid:
 * the third one is a direct child of the panel body while the first two are
 * wrapped in a <div>, and the point of the rule is that this makes no
 * difference. Selecting the wrapped and unwrapped ones the same way is how the
 * spec stays able to notice if it ever starts to.
 */
function sections(page: Page, anchor: string): Locator {
  return sectionsPanel(page, anchor).locator("[data-panel-body] section");
}

function styleOf(target: Locator, property: string): Promise<string> {
  return target.evaluate(
    (element, prop) => getComputedStyle(element).getPropertyValue(prop),
    property,
  );
}

/** What the host's palette paints for a raw token value, e.g. `--ds-surface`. */
function resolveColour(page: Page, value: string): Promise<string> {
  return page.evaluate((raw) => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = raw;
    document.body.append(probe);
    const painted = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return painted;
  }, value);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

for (const { selector: host, anchor, shadowBound } of HOSTS) {
  test(`${host}: a card in a panel body draws no surface at all`, async ({ page }) => {
    const nested = sections(page, anchor);
    await expect(nested).toHaveCount(3);

    for (let index = 0; index < 3; index += 1) {
      const section = nested.nth(index);
      await expect(section).toBeVisible();

      // No outline: all four edges, so a rule that only reset border-color (the
      // v0.12 shape of this file) cannot pass.
      const widths = await section.evaluate((element) => {
        const computed = getComputedStyle(element);
        return [
          computed.borderTopWidth,
          computed.borderRightWidth,
          computed.borderBottomWidth,
          computed.borderLeftWidth,
        ];
      });
      expect(widths).toEqual(["0px", "0px", "0px", "0px"]);

      // No fill. `transparent` computes to rgba(0, 0, 0, 0) — and that is not
      // the same statement as "the same colour the panel happens to have": if
      // the panel's fill changes, a transparent section follows it and a
      // hard-coded one does not.
      expect(await styleOf(section, "background-color")).toBe("rgba(0, 0, 0, 0)");

      // No lift, no corner.
      expect(await styleOf(section, "box-shadow")).toBe("none");
      expect(await styleOf(section, "border-top-left-radius")).toBe("0px");
    }
  });

  test(`${host}: the bare card is untouched — the rule is about position, not about Card`, async ({
    page,
  }) => {
    const bare = bareCard(page, host);
    await expect(bare).toBeVisible();

    // Still an outline, still a fill, still a corner, still an inset.
    expect(await styleOf(bare, "border-top-width")).toBe("1px");
    expect(await styleOf(bare, "border-top-style")).toBe("solid");
    expect(await styleOf(bare, "border-top-left-radius")).not.toBe("0px");
    expect(await styleOf(bare, "padding-left")).not.toBe("0px");

    // The fill is this host's --ds-surface, not merely "something opaque": a
    // typo'd token computes to transparent, which would also be "not equal to
    // the panel's colour".
    const surface = await bare.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--ds-surface").trim(),
    );
    expect(surface).not.toBe("");
    expect(await styleOf(bare, "background-color")).toBe(await resolveColour(page, surface));

    // And still floats where the host's palette says a card floats.
    const shadow = await styleOf(bare, "box-shadow");
    if (shadowBound) {
      expect(shadow).not.toBe("none");
      expect(shadow.trim()).not.toBe("");
    } else {
      expect(shadow).toBe("none");
    }
  });

  test(`${host}: a section heading sits on the panel title's own column`, async ({ page }) => {
    // This is what horizontal padding 0 is FOR. With the frame gone the inset
    // no longer holds content off an outline, it just pushes the section's text
    // off the column its own panel title occupies. At 0 the two align, and the
    // alignment is what says "this belongs to that section" now that no box
    // does.
    const panel = sectionsPanel(page, anchor);
    const panelTitle = panel.locator("h2").first();
    const lefts = await panel.evaluate((element) => {
      const body = element.querySelector("[data-panel-body]");
      if (body === null) {
        throw new Error("panel has no body scope");
      }
      return [...body.querySelectorAll("section h2")].map(
        (heading) => heading.getBoundingClientRect().left,
      );
    });
    const titleLeft = (await panelTitle.boundingBox())?.x;

    expect(lefts).toHaveLength(3);
    for (const left of lefts) {
      expect(left).toBeCloseTo(titleLeft ?? Number.NaN, 1);
    }
  });

  test(`${host}: sections are held apart by more space than holds one together`, async ({
    page,
  }) => {
    // Containment is carried by proximity now, so the rhythm has to be ordered:
    // the space BETWEEN two sections must beat the largest space WITHIN one, or
    // a heading groups with what precedes it instead of what follows it.
    // Measured on painted content (a Range, so bare text nodes count) rather
    // than on the border boxes, which are contiguous and would report 0.
    const rhythm = await sectionsPanel(page, anchor).evaluate((element) => {
      const body = element.querySelector("[data-panel-body]");
      if (body === null) {
        throw new Error("panel has no body scope");
      }
      const list = [...body.querySelectorAll("section")];

      const rectOf = (node: Element, from: "all" | "after-header"): DOMRect => {
        const range = document.createRange();
        if (from === "all") {
          range.selectNodeContents(node);
        } else {
          const header = node.querySelector("header");
          if (header === null) {
            throw new Error("section has no header");
          }
          range.setStartAfter(header);
          range.setEnd(node, node.childNodes.length);
        }
        return range.getBoundingClientRect();
      };

      const within = list.map((section) => {
        const header = section.querySelector("header");
        if (header === null) {
          throw new Error("section has no header");
        }
        return rectOf(section, "after-header").top - header.getBoundingClientRect().bottom;
      });
      const between = list
        .slice(1)
        .map(
          (section, index) =>
            rectOf(section, "all").top - rectOf(list[index] as Element, "all").bottom,
        );
      return { within, between };
    });

    expect(rhythm.between).toHaveLength(2);
    // Twice over, not merely "more": grouping by proximity needs a ratio, and
    // the consumer's sections already put 16px between their own last control
    // and a footer hint (rssa `ConversationStatePanel.module.css .footerHint`,
    // `NavigationPanel.module.css .actionRow`). A separation that only just
    // beats the largest internal gap would stop reading there.
    for (const gap of rhythm.between) {
      expect(gap).toBeGreaterThanOrEqual(2 * Math.max(...rhythm.within));
    }

    // The two gaps are the same gap: the first is between a wrapped section and
    // a wrapped section, the second between a wrapped one and an unwrapped
    // direct child of the body. A rule keyed on sibling adjacency would produce
    // one of them and not the other, and would report exactly this difference.
    const [firstGap, secondGap] = rhythm.between as [number, number];
    expect(firstGap).toBeCloseTo(secondGap, 1);
  });

  test(`${host}: the section heading is the same heading a bare card draws`, async ({ page }) => {
    // The heading is now the ONLY thing that declares a section, so it is not
    // stepped down along with the surface — it stays the type a Card draws
    // anywhere. (Tried at 14px in the demo: below the body copy's own size, the
    // heading stops dominating its section and the grouping falls apart.)
    const bareHeading = bareCard(page, host).getByRole("heading", { name: "Prompt" });
    const nestedHeading = sections(page, anchor).first().getByRole("heading", { name: "Prompt" });

    await expect(nestedHeading).toBeVisible();
    for (const property of ["font-size", "font-weight", "color"]) {
      expect(await styleOf(nestedHeading, property)).toBe(await styleOf(bareHeading, property));
    }
  });
}
