# @omakase-robotics/ui-components

Shared React component library for omakase-robotics web UIs:

- [`omakaseos_service`](https://github.com/omakase-robotics/omakaseos_service) `packages/web` — the multi-tenant dashboard.
- [`omakaseos/status_server_webui`](https://github.com/omakase-ai/omakaseos) — the on-robot diagnostic UI.
- `robot-inspection-web` — the acceptance-inspection app (v0.15).

The library carries **only the visual primitives** these UIs share, and
intentionally carries **no brand colors of its own**. Each consuming app
provides a small alias CSS file that maps its existing tokens onto the
library's neutral `--ds-*` token names. Several apps consume one contract; the
library's job is to keep that contract honest.

### The three hosts

| Host | Alias | Look | Notes |
| --- | --- | --- | --- |
| `omks-robo-web` | `aliases/omks-robo-web.css` | Light, sans, airy | The dashboard's brand SoT is `packages/web/src/brand/tokens.ts` |
| `status-server-webui` | `aliases/status-server-webui.css` | Dark (with a light override), mono, dense | The robot console's SoT is rssa `src/styles/variables.css`; has a `[data-theme]` switch |
| `robot-inspection-web` | `aliases/robot-inspection-web.css` | Dark, **fully desaturated**, generous corners | One theme only, by design. Status is carried by shape / line style / opacity, not hue — see "Shape-carried status" below |

> **Catalog (Storybook):** every primitive is browsable in the published
> Storybook at
> <https://omakase-robotics.github.io/omakaseos-ui-components/>
> (deployed by the Pages workflow on every push to `main`). Use the
> toolbar's **Host theme** switch to render the same story under either
> consuming app's brand alias.

## Layers

The public surface is organized as four layers, each a distinct purpose.
Adding a new primitive starts with deciding which layer it belongs to;
the wrong layer is a sign the surface needs splitting (this is how v0.5
came to be — see `reports/realtime-chat-components-poc/`).

| Layer | Released | Purpose | Components |
| --- | --- | --- | --- |
| **Status** | v0.1–v0.2, v0.10, v0.11, v0.12–v0.15 | Status-monitor and feedback primitives shared by every panel that surfaces robot or service state. Since v0.12 the layer also states one *composition* rule, settled in v0.14: a `Panel` body takes no container — a `Card` or a nested `Panel` there **throws** — and `Section` is the grouping it does take (a heading, its content, and the rhythm around it, drawing no surface). v0.15 adds the shape-carried trio, which states a register with no hue at all | `StatusBadge`, `Card` + `CardHeader`, `Section` + `SectionHeader`, `Panel`, `Fact` + `FactList` + `FactGrid`, `ButtonRow`, `SignalBars`, `ReservedText`, `Spinner`, `Toast`, `StatusGlyph`, `RankChip`, `SegmentedMeter` |
| **Form** | v0.3, v0.10 | Native-element-based input / layout primitives with overflow-safe defaults and focus rings | `Button`, `Input`, `Select`, `Textarea`, `Heading`, `Toolbar`, `Checkbox`, `Switch`, `Slider`, `Field`, `ToggleSwitch` |
| **Chat-log** | v0.4 | Past-tense conversation log — what was said, in chronological order. Vocabulary follows the OpenAI Realtime API event roles | `MessageBubble`, `Transcript`, `TypingIndicator`, `ToolCallTrace`, `RealtimeEventLog` |
| **Live-stage** | v0.5 | In-progress 1:n live conversation — Google Meet-style stage with participant grid + caption strip. Distinct DOM shape from the chat-log layer | `ConversationStage`, `ParticipantTile`, `LiveCaption` |
| **AUI surface** | v0.6 | Vendored shadcn-style assistant-ui registry — the canonical chat shell consumed by live operator surfaces (PoC `assistant-ui-replacement-poc/app`, the body web app's conversations page). CSS Modules + shadcn theme tokens — see "Token model" below | `Thread`, `MarkdownText`, `ToolFallback`, `ToolGroupRoot/Trigger/Content`, `Reasoning` family, `ComposerAddAttachment`, `Composer/UserMessage Attachments`, `VoiceOrb` family, `TooltipIconButton`, plus shadcn `Button` / `Collapsible` / `Tooltip` / `Dialog` / `Avatar` re-exports — under sub-entry `/aui` |

The chat-log and live-stage layers share the same `MessageRole` vocabulary
(`"user" | "assistant" | "system" | "tool"`) — taken verbatim from the OpenAI
Realtime API — and the same role-tinted accent tokens, so a speaker's tile in
the live stage and their bubble in the log read visually consistent.

The AUI surface layer (v0.6) is **deliberately separate**: it ships under
the `/aui` sub-entry, mounts under a `.aui-root` subtree, and uses shadcn
theme tokens rather than `--ds-*`. It shipped on Tailwind v4 through v0.8;
the v0.9 migration (`omksos_web/reports/aui-css-modules/`) moved it onto
plain CSS Modules with no change to the public API or the theme token
names. See the "aui surface" note in the Token model section.

## Public API

```ts
import {
  // v0.1–v0.2: status primitives
  StatusBadge, Card, CardHeader, Fact, FactList, ButtonRow,

  // v0.3: form & layout primitives
  Button, Input, Select, Textarea, Heading, Toolbar,
  Checkbox, Switch, Slider, Field,

  // v0.4: conversation-log primitives (past-tense transcript)
  MessageBubble, Transcript, TypingIndicator, ToolCallTrace, RealtimeEventLog,

  // v0.5: live-conversation primitives (1:n live stage)
  ConversationStage, ParticipantTile, LiveCaption, pickStageColumns,

  // v0.10: promoted from robot-status-server-app's components/ui/
  ToggleSwitch, SignalBars, ReservedText,

  // v0.11: feedback primitives (presentational — the host owns timing and placement),
  //        the page-grid section, and the tile reading of a set of facts
  Spinner, Toast, Panel, FactGrid,

  // v0.14: a headed group that draws no surface — the way to divide a Panel
  Section, SectionHeader,

  // v0.15: the shape-carried Status vocabulary — a register, a rank and a
  //         division, each stated without hue
  StatusGlyph, RankChip, SegmentedMeter,
} from "@omakase-robotics/ui-components";

// v0.6: canonical assistant-ui surface — separate sub-entry
import {
  Thread,
  MarkdownText,
  ToolFallback, ToolGroupRoot, ToolGroupTrigger, ToolGroupContent,
  Reasoning, ReasoningRoot, ReasoningTrigger, ReasoningContent, ReasoningText,
  ComposerAddAttachment, ComposerAttachments, UserMessageAttachments,
  VoiceOrb, VoiceControl, deriveVoiceOrbState,
  TooltipIconButton, Button, Collapsible, Tooltip, Dialog, Avatar,
  cn,
  ReadonlyThreadProvider, AssistantRuntimeProvider,
  fromThreadMessageLike, useLocalRuntime,
} from "@omakase-robotics/ui-components/aui";
```

Plus host-specific alias CSS, imported once at the SPA entry:

```ts
// omakaseos_service web (light, dashboard brand)
import "@omakase-robotics/ui-components/aliases/omks-robo-web.css";

// status_server_webui (dark, operator-facing)
import "@omakase-robotics/ui-components/aliases/status-server-webui.css";

// robot-inspection-web (dark, desaturated — v0.15)
import "@omakase-robotics/ui-components/aliases/robot-inspection-web.css";

// AUI surface (v0.6): pre-built Tailwind v4 + shadcn theme stylesheet,
// scoped under `.aui-root`. Required only when the consumer mounts an
// aui-surface component (Thread / MarkdownText / etc).
import "@omakase-robotics/ui-components/aui/aui.css";
```

The alias must come **after** the host's own brand variables.css so the
`--ds-*` mappings reference defined tokens. The `aui/aui.css` is
independent of the `--ds-*` aliases — it brings its own scoped reset
and shadcn theme tokens.

### Backwards-compatible call shapes

`StatusBadge` and `Card` accept both call shapes used by the consuming
apps so neither pays a per-call-site cost when adopting the library:

```tsx
// Both compile, both render the same DOM:
<StatusBadge tone="success" label="Live" />
<StatusBadge tone="success">Live</StatusBadge>

<Card title="Robot State">…</Card>
<Card><CardHeader title="Robot State"/>…</Card>
```

`children` wins over `label` when both are given. The `title=` shorthand
on `Card` is implemented as `<CardHeader title=…/>` internally.

### Two containers, two surfaces — and why neither is a variant

Four v0.11 additions look like variants of something that already exists.
They are not, and the distinction is the API:

| Reach for | When | Not |
| --- | --- | --- |
| `Panel` | The thing IS a section of the page — one cell of a grid of peers. Small uppercase title over a hard divider; `fullWidth` spans the grid; `id` makes it an anchor target | `Card`, which is a surface *within* a page: softer header with `hint` / `right`, no divider, no grid vocabulary |
| `Section` | The thing is a *part of* something larger — one matter among several inside a panel, or a headed block on a page. A heading, its content, and the rhythm around it; no surface at all | `Card`, which draws a surface. Inside a `Panel` body, `Section` is the only grouping available: a `Card` there throws |
| `FactGrid` | The facts are readings taken at a glance — two columns of inset tiles, a small caption over a large monospaced figure | `FactList`, which is a vertical run of rows read one after another |

### A `Panel` body takes no container (v0.14)

`Panel` and `Card` are drawn from the same recipe — a `--ds-surface` fill
inside a `--ds-border` outline, rounded and lifted by `--ds-shadow-card` — so
nesting them repeats it and the pair reads as "a frame inside a frame": the
reader has to count boxes to know what contains what (measured on the dashboard
monitor page, where `ConversationStatePanel` was Panel > Card × 4 and
`NavigationPanel` Panel > Card × 3–4 > row borders).

**The rule.** Rendering a `Card` — or another `Panel` — as part of a `Panel`'s
content **throws**:

```
Card must not nest inside a Panel — use Section for grouping within a panel
Panel must not nest inside another Panel — use Section for grouping within a panel, or a sibling Panel in the page grid
```

…and `Section` is what the panel body does take: a heading, its content, and
the rhythm around it, drawing no surface. Its geometry is `0` across, so a
section heading lands on the exact column the panel's own title occupies, and
`--ds-space-xl` down each side, so two sections stand 32px apart — twice the
12px between a section's own heading and its body, which is what makes a
heading group with what follows it. `SectionHeader` *is* `CardHeader` (one
implementation, exported under both names): a card is a section drawn on a
surface, so the two headings cannot drift apart.

A `Section` is not panel-specific and reads nothing about its surroundings —
outside a panel it is a plain headed group that renders identically. Moving one
in or out is therefore not a visual change.

**How the rule is detected.** `Panel` opens a React context around its
children, and each container reads it at the top of its render — the same shape
as the `useX must be used inside XProvider` throws a consumer already knows,
in the other direction. It throws in production too: a contract that only holds
in development is a contract the shipped app does not have, and the failure is
a composition error in the caller's own tree.

Because it is a context and not a DOM ancestor, the contract is about
*composition*: content rendered elsewhere and portalled into a panel's body
does not throw (it was not composed into the panel), while a `Card` rendered
from inside a panel's subtree does throw even when portalled out to an overlay
layer (React context passes through portals) — raise such an overlay to a layer
the host owns. `Panel` keeps its `data-panel-body` marker, but nothing styles
off it any more: it exists so a panel's *content* can be addressed from outside
the library (omksos_web's browser-level container scan, consumer specs).

**Design history — do not reintroduce the earlier rules.** v0.12 relaxed the
nested recipe (shadow dropped, border stepped down to `--ds-border-subtle`) and
the consumer's verdict was that a fainter frame inside a frame is still a frame
inside a frame — a change of manner, not of structure. v0.13 went further and
had a `Card` in a panel body render *as* a section (no outline, fill, lift or
corner), through a `:global([data-panel-body]) .card` ancestor rule. That was
rejected twice over: a context-dependent automatic transform makes the call
site lie (the same `<Card>` renders as two different things depending on where
it sits, so moving it is a silent visual change), and more fundamentally it
**repainted a violation until it looked legal** — the container-in-container it
was meant to prevent was still there, now normalized. v0.14 keeps that
release's *look* as `Section` and drops its mechanism; the ancestor rule is
gone and `Card.spec.tsx` fails if any contextual selector returns to
`Card.module.css`.

The section rhythm is each section's own padding rather than a separator
between adjacent ones (`.section + .section`, a hairline or a margin) on
purpose: in the consumer, sibling sections are not reliably adjacent siblings
in the DOM — `ConversationStatePanel` interleaves an `ApiUnavailable` between
two of them, and `NavigationPanel` lays two side by side in a two-column grid,
where a top border on "the next one" would rule a line across the section
*beside* its neighbour. A rule each section carries itself is right in all
three shapes and cannot go vacuous when a call site wraps one in a `<div>`.

A `Fact` is a tile exactly when it is a child of a `FactGrid` (the tile
look is the grid's, not the fact's), so "tile-styled row" and "unstyled
tile" are unreachable. Give those facts `direction="column"`, and
`size="sm"` where the value is text rather than a figure (a path, a name)
— at display size those read as shouting and wrap out of the tile.

### One tone vocabulary, and the semantics derived from it

`BadgeTone` (`success | warning | danger | info | neutral`) is the single
semantic tone union — named for its first consumer, `StatusBadge`, and
shared by `Toast` and `Spinner`. A consuming app maps its domain registers
onto it once, at the edge (`error → danger`, `running → success`), so the
same word means the same color everywhere.

`Toast` derives its ARIA role from that tone through a total `Record`:
`danger → role="alert"` (implicitly assertive — "it did not happen" must
interrupt), every other tone → `role="status"` (implicitly polite). It
sets no `aria-live` of its own, so the two politeness levels stay
distinguishable, and a new tone becomes a compile error rather than a
silent "polite".

State is therefore assertable by **role and data attribute**
(`data-tone` / `data-size` / `data-open`) rather than by a visible label
string, in every consuming app's tests.

### Shape-carried status (v0.15)

`robot-inspection-web` has no hue to spend: its palette is three greys of
surface, three of ink, and one warm-silver accent. Five inspection readings
still have to be told apart in one table cell. Three primitives do that with
**fill, line style and opacity** — which also means they survive a greyscale
printout of a report and the common colour-vision deficiencies on the two
hosts that *do* have colour.

| Primitive | States what | How it separates them |
| --- | --- | --- |
| `StatusGlyph` | One register, in the space of one character | `success` washed ring + `✓` · `danger` solid disc + `✕` · `warning` dashed ring + `!` · `neutral` solid empty ring + `—` · `idle` dashed empty ring |
| `RankChip` | One rank of three, written as the caller's own notation | `high` filled · `medium` outlined · `low` dashed + muted — heaviest to lightest, so the ordering reads |
| `SegmentedMeter` | How a fixed whole is divided | Four ordered tiers of the surface's own ink (90 / 55 / 30 / 16 %), not four colours |

```tsx
// Consumers map their domain enum onto the register vocabulary once, at the
// edge — the same discipline BadgeTone already asks for.
<StatusGlyph tone="danger" ariaLabel="NG" />          {/* size?: sm | md | lg */}
<RankChip rank="high" ariaLabel="priority A">A</RankChip>
<SegmentedMeter
  total={60}
  ariaLabel="44 of 60 checks: 30 passed, 8 failed, 4 open, 2 excluded"
  segments={[
    { id: "ok", value: 30, weight: "full" },
    { id: "ng", value: 8, weight: "strong" },
    { id: "pending", value: 4, weight: "medium" },
    { id: "na", value: 2, weight: "faint" },
  ]}
/>
```

Three deliberate API choices:

- **`ariaLabel` is required** on `StatusGlyph` and `SegmentedMeter`. The
  meaning is entirely drawn, and only the consumer knows the words for it
  ("OK", "不合格", "44 of 60 recorded"). A default would either invent domain
  vocabulary the library has no business owning, or announce five different
  marks as "status" five times. `RankChip`'s is optional — its visible token
  is already text.
- **`weight` is required on every meter segment**, not derived from position:
  a three-segment meter would otherwise silently skip a tier, and which
  category is heaviest is a fact about the caller's data.
- **`StatusGlyph` is not a `StatusBadge` variant.** Reach for the glyph where
  the register is one cell of a dense table and the word does not fit; for the
  badge where there is room to write it. `GlyphTone` is `BadgeTone` minus
  `info` (a glyph is a reading; "info" is not a reading) plus `idle`.

On a monotone host, a primitive that carries its state through hue alone
(`StatusBadge` and similar) cannot be used for state discrimination — every
tone resolves to the same grey register set here. Use `StatusGlyph` (or
`RankChip` / `SegmentedMeter`) wherever the reading itself, not just a label
next to it, has to be told apart.

`idle` is a new sixth register (`--ds-tone-idle-*`): `neutral` says "this does
not apply", `idle` says "no reading has been taken yet". Both appear on the
same sheet, so they cannot share a token. It is deliberately **not** added to
`BadgeTone` — no badge or toast states it, and widening that union would force
every consumer's exhaustive mapping to grow for a register its badges never
take.

### What the host owns (v0.11 feedback primitives)

`Spinner` and `Toast` are presentational: no timers, no state, no portal.

| Concern | Owner | Why |
| --- | --- | --- |
| Whether a spinner is on screen | Host | "Work is in progress" is the host's knowledge; a spinner told it is not spinning renders nothing, which is the host's `null` branch |
| When a toast disappears | Host | The two apps already disagree (5s / 3.2s); timing is a product decision |
| Where a toast sits | Host | One app pins a single card bottom-right, the other stacks cards bottom-center; a self-positioning card could serve only one |
| The card, its tone, its role, its enter/exit transition | Library | Pure CSS (`data-open`), so no JS enter/exit state machine is needed |

`StatusBadge` takes an opt-in `live` prop that makes it a `role="status"`
live region. It is off by default: a badge that *labels* something fixed
is not a live region, and only the call site knows whether its badge
reports a changing value.

## Token model

Components reference only `--ds-*` CSS variables. The library ships sane
fallbacks (`src/tokens.css`) so a host that forgets to alias still
renders plausibly. The alias map for each host is in `aliases/`.

### Categories

| Category | Tokens |
| --- | --- |
| Surface & foreground | `--ds-surface`, `--ds-surface-{inset,hover,active}`, `--ds-border`, `--ds-border-strong`, `--ds-text`, `--ds-text-{muted,disabled,on-accent}` |
| Semantic tones | `--ds-tone-{success,warning,danger,info,neutral,idle}-{fg,bg}` (`idle` since v0.15) |
| Accent | `--ds-accent`, `--ds-accent-{hover,soft}` |
| Focus ring | `--ds-focus-ring-{color,width}` |
| Spacing scale (4-based) | `--ds-space-{2xs..2xl}` |
| Control sizing | `--ds-control-height-{sm,md,lg}`, `--ds-control-padding-x-{sm,md,lg}` |
| Radii (purpose-bound) | `--ds-radius-{chip,control,card,lg,pill}` (`chip` since v0.15 — below control, so a small tile does not round into a pill on a host with generous control corners) |
| Shadow | `--ds-shadow-{card,overlay}` |
| Typography (purpose-bound) | `--ds-font-sans`, `--ds-font-mono`, `--ds-font-size-{label,control,body,heading-{1..4}}`, `--ds-line-height-{control,text}` |
| Disabled / Transition | `--ds-disabled-opacity`, `--ds-transition-fast` |
| Chat bubble (v0.4) | `--ds-bubble-{radius,pad-{x,y},gap,max-width}`, `--ds-bubble-{bg,fg}-{user,assistant,system,tool}`, `--ds-bubble-meta-{fg,size}`, `--ds-caret-{color,blink-duration}` |
| Live stage (v0.5) | `--ds-stage-{bg,grid-gap,tile-{bg,avatar-bg,name-bg,radius},speaking-ring}`, `--ds-caption-{bg,fg,speaker-fg}` |

Bind to **purpose** (`--ds-control-height-md`), not to **value** (`32px`).
A host theme can shift density without touching component CSS.

An alias file is a **mapping layer, not a palette**: every `--ds-*`
declaration in `aliases/*.css` must resolve through `var(...)` at a variable
the host's own palette owns. `spec/alias-purity.spec.ts` mechanizes that,
freezing the handful of pre-existing bare literals so a *new* one fails CI —
a colour decision written into an alias is a second source of truth for what a
surface looks like.

### The `robot-inspection-web` host palette

`aliases/robot-inspection-web.css` was authored under that guard and therefore
has **no literals at all**: the host owns every value. A consuming app declares
the `--ri-*` set below once (before importing the alias), and nothing else:

```css
/* robot-inspection-web brand SoT. One dark, fully desaturated theme —
   there is no light variant and no [data-theme] switch. */
:root {
  color-scheme: dark;

  /* Surfaces: ground -> card -> recess, then the two interaction steps. */
  --ri-surface-0: #0a0b0c;
  --ri-surface-1: #131518;
  --ri-surface-2: #1b1e22;
  --ri-surface-hover: #202429;
  --ri-surface-active: #262b31;

  /* Two rules: hairline whispers inside a surface, rule separates surfaces. */
  --ri-hairline: rgba(255, 255, 255, 0.06);
  --ri-rule: rgba(255, 255, 255, 0.14);

  /* Ink, three levels. */
  --ri-text: #f2f3f5;
  --ri-text-muted: #9aa0a6;
  --ri-text-dim: #5b6067;

  /* The one accent — warm silver — and the ink that sits on top of it. */
  --ri-accent: #e5e7eb;
  --ri-accent-hover: #f7f8fa;
  --ri-accent-soft: rgba(229, 231, 235, 0.12);
  --ri-on-accent: #0a0b0c;

  /* Focus ring width — 1px on this host (the InspecLog prototype's
     `:focus-visible { outline: 1px solid var(--il-accent); outline-offset:
     2px; }`), narrower than the library's 2px default. Color reuses the
     accent above via --ds-focus-ring-color. */
  --ri-focus-ring-width: 1px;

  /* Registers, named for the reading they report. The alias maps
     ok->success, ng->danger, pending->warning, na->neutral, idle->idle. */
  --ri-tone-ok-fg: #f2f3f5;
  --ri-tone-ok-bg: rgba(242, 243, 245, 0.10);
  --ri-tone-ng-fg: #f2f3f5;
  --ri-tone-ng-bg: rgba(242, 243, 245, 0.18);
  --ri-tone-pending-fg: #c1c5cb;
  --ri-tone-pending-bg: rgba(255, 255, 255, 0.06);
  --ri-tone-na-fg: #8a9099;
  --ri-tone-na-bg: rgba(255, 255, 255, 0.04);
  --ri-tone-idle-fg: #5b6067;
  --ri-tone-idle-bg: rgba(255, 255, 255, 0.02);
  --ri-tone-info-fg: #f2f3f5;
  --ri-tone-info-bg: rgba(255, 255, 255, 0.08);

  /* Overlay ground for floating strips (tile name, caption). */
  --ri-scrim: rgba(0, 0, 0, 0.72);

  /* Radii — generous, which is why chip is its own level. */
  --ri-radius-chip: 6px;
  --ri-radius-control: 12px;
  --ri-radius-card: 18px;
  --ri-radius-lg: 22px;
  --ri-radius-pill: 999px;

  /* Type. Figures render tabular in the primitives that state counts. */
  --ri-font-sans: "Inter", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif;
  --ri-font-mono: "JetBrains Mono", "SF Mono", ui-monospace, monospace;

  /* Surfaces separate by hairline, so a card does not lift at all; only a
     floating layer does. */
  --ri-shadow-card: none;
  --ri-shadow-overlay: 0 0 0 1px rgba(255, 255, 255, 0.05), 0 12px 32px rgba(0, 0, 0, 0.5);
}
```

A missing `--ri-*` falls through to the library default in `src/tokens.css`,
which is **light** — i.e. visibly wrong on this host rather than quietly
plausible. That is deliberate: the library ships no dark fallback set, so an
unmapped token is a bug you see rather than one you ship.

Density, the type ramp, `--ds-disabled-opacity` and `--ds-transition-fast` are
*not* in the `--ri-*` set: this host does not own them, so the library
fallbacks apply — the same stance the other two aliases take toward the
levels their palettes do not own. `--ds-focus-ring-width` **is** in the set
(`--ri-focus-ring-width`, since v0.15.2) — the host's prototype draws a 1px
ring, and letting it fall through to the library's 2px default was a gap, not
a decision (operator flagged: "欠損は欠陥").

The demo harness reproduces this palette under
`.host--robot-inspection-web` in `demo/hosts.css`, which is where to look for
a working copy.

### The aui surface (v0.6, CSS Modules since v0.9)

The aui surface is the **only** layer that does not bind to `--ds-*`.
It uses the shadcn theme token set (`--background`, `--foreground`,
`--primary`, `--muted`, `--border`, `--ring`, ...) because the upstream
shadcn-style assistant-ui registry was authored that way, and
re-authoring the token NAMES would diverge us from upstream's refresh
path (`npx shadcn add ...` propagates updates verbatim into `src/aui/`).

Through v0.8 this layer additionally ran on Tailwind v4 utility classes
— the **only** Tailwind usage anywhere in the package. The v0.9 migration
(`omksos_web/reports/aui-css-modules/`) replaced that with plain CSS
Modules (one `*.module.css` per component, same theme token names, same
public API) so the package ships with **no Tailwind toolchain at all**.
The package guarantees:

| Boundary | Where it's pinned |
| --- | --- |
| No Tailwind import, dependency, or utility-class syntax anywhere in the package | `spec/aui-tailwind-boundary.spec.ts` |
| No `tailwind-merge` import anywhere — `cn()` is a plain `clsx` composer | `spec/aui-tailwind-boundary.spec.ts` |
| Preflight scoped to `:where(.aui-root *)` — does NOT clobber consumer CSS-Modules surfaces | `spec/aui-preflight-scope.spec.ts`, `src/aui/aui.css` |
| Surface root mounts with `.aui-root` className — preflight matches the subtree it was scoped to | `spec/aui-tailwind-boundary.spec.ts` (Thread mount) |
| AUI is shipped as `dist/aui/{index.js, aui.css}` (pre-built); legacy v0.4/v0.5 stay as TS source | `package.json` `exports` map |

Each row has an automated assertion: a future PR that reintroduces
Tailwind fails CI before review. The original boundary was sized in
`omksos_web/reports/ui-components-aui-canonical-lift/` and tightened
in `omksos_web/reports/ui-components-aui-tailwind-preflight-scope/`;
the v0.9 migration itself is documented in
`omksos_web/reports/aui-css-modules/`.

## Consuming the library

Each consuming app pins an exact tag:

```jsonc
// package.json
"dependencies": {
  "@omakase-robotics/ui-components":
    "git+ssh://git@github.com/omakase-robotics/omakaseos-ui-components.git#v0.5.0"
}
```

If the developer's machine uses an SSH alias for github.com (e.g.
`Host omakase` in `~/.ssh/config`):

```
git+ssh://git@omakase/omakase-robotics/omakaseos-ui-components.git#v0.5.0
```

Tag every breaking change. Until v1.0.0 the surface may move; **always pin
exact tags** in dependent apps. After bumping, clear bun's cache for the
old tag (`bun pm cache rm` + `rm -rf node_modules/@omakase-robotics`) and
run `bun install --force`.

## Local development

```bash
bun install
bun run typecheck         # tsc --noEmit
bun run test              # vitest --run (230+ tests across 38+ files)
bun run test:e2e          # vite + Playwright; verifies overflow / focus / role / chat / stage /
                          #   spinner rotation, toast semantics, panel grid spans and fact tiles,
                          #   and (v0.15) that the shape-carried registers are pairwise distinct
                          #   with no hue available — under every host alias,
                          #   in real chromium (the things jsdom cannot show)
bun run dev               # http://localhost:5198 — themed harness (all three hosts side by side)
bun run build             # demo/dist
bun run storybook         # http://localhost:6006 — story catalog
bun run build-storybook   # storybook-static/  (CI deploys this to GitHub Pages)
```

The CI workflow (`.github/workflows/ci.yml`) runs the same gates plus the
Storybook build on every PR; the Pages workflow
(`.github/workflows/pages.yml`) deploys Storybook on every push to `main`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the policy on:

- adding a new primitive (and how to decide which layer it belongs to),
- when call-shape upper-compatibility is required,
- the gate sequence that must pass before a PR is mergeable,
- the consumer-side green rule (a library-only green is not green).

## Origin and history

Each layer's design notes — including the API delta tables, token vocabulary
rationale, and the gates that drove the PoCs from red to green — live in the
orchestrator repo (`omakase-robotics/omksos_web`):

- v0.1–v0.2 — `reports/shared-status-components-poc/`
- v0.3 — `reports/shared-ui-components-basics-poc/`
- v0.4–v0.5 — `reports/realtime-chat-components-poc/`
- v0.10 — `reports/ui-primitives-promotion/`
- v0.11 — `reports/rssa-ui-unification/`
- v0.12 — `reports/monitor-ia-recomposition/`
- v0.13, v0.14 — `reports/monitor-scope-coherence/` (ruling B; v0.13's
  ancestor-selector rule was replaced by v0.14's contract + `Section`, and the
  report records why both earlier attempts were rejected)
- v0.15 — `reports/ui-components-inspect-theme/` (the third host alias, and
  the shape-carried Status vocabulary the desaturated palette made necessary)
- Storybook + Pages + repo health — `reports/ui-components-catalog-and-pages-poc/`

The current ship state is mirrored into `docs/shared-ui-components/`
(consumer-facing reference, kept in sync with this repo and the consumers).

## indexion: how this repo surfaces

When `indexion agent orient` is invoked across `reports source` or against
this repo directly, the following files are intentionally surfaced as
`knowledge_sources` for any task touching shared UI:

- `README.md` (this file) — the layered surface map.
- Each component's `src/<Name>.tsx` JSDoc header — the per-component
  contract (purpose, props, the two-app constraints).
- `aliases/{omks-robo-web,status-server-webui,robot-inspection-web}.css` —
  the brand-bridge mapping for each consuming host.

If a task touches a domain primitive, owner ranking should resolve to one
of the four layers (status / form / chat-log / live-stage) by reading the
component header doc; if it does not, that header is the place to fix.
