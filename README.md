# @omakase-robotics/ui-components

Shared React component library for omakase-robotics web UIs:

- [`omakaseos_service`](https://github.com/omakase-robotics/omakaseos_service) `packages/web` — the multi-tenant dashboard.
- [`omakaseos/status_server_webui`](https://github.com/omakase-ai/omakaseos) — the on-robot diagnostic UI.

The library carries **only the visual primitives** that both UIs share, and
intentionally carries **no brand colors of its own**. Each consuming app
provides a small alias CSS file that maps its existing tokens onto the
library's neutral `--ds-*` token names. Two apps consume one contract; the
library's job is to keep that contract honest.

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
| **Status** | v0.1–v0.2, v0.10, v0.11, v0.12, v0.13 | Status-monitor and feedback primitives shared by every panel that surfaces robot or service state. Since v0.12 the layer also states one *composition* rule, completed in v0.13: a `Card` inside a `Panel` body is a **section** of it, not a surface within it — no outline, fill, lift or corner, and the frame's inset replaced by the rhythm between sections | `StatusBadge`, `Card` + `CardHeader`, `Panel`, `Fact` + `FactList` + `FactGrid`, `ButtonRow`, `SignalBars`, `ReservedText`, `Spinner`, `Toast` |
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
| `FactGrid` | The facts are readings taken at a glance — two columns of inset tiles, a small caption over a large monospaced figure | `FactList`, which is a vertical run of rows read one after another |

**A nested `Card` is a section, not a surface (v0.13).** The two containers
are drawn from the same recipe — a `--ds-surface` fill inside a `--ds-border`
outline, rounded and lifted by `--ds-shadow-card` — so nesting them repeats
it, and the pair reads as "a frame inside a frame": the reader has to count
boxes to know what contains what (measured on the dashboard monitor page:
`ConversationStatePanel` is Panel > Card × 4, `NavigationPanel` is
Panel > Card × 3–4 > row borders). v0.12 answered this by relaxing the nested
recipe (shadow dropped, border stepped down to `--ds-border-subtle`), and the
consumer's verdict was that a fainter frame inside a frame is still a frame
inside a frame — a change of manner rather than of structure.

So v0.13 replaces the rule. In a `Panel` body a `Card` keeps its element, its
API and its header, and gives up the four properties that draw a surface:
**no outline, no fill, no lift, no corner**. Its inset is replaced by the
section rhythm — `0` across, so a `CardHeader` title lands on the exact column
the panel's own title occupies, and `--ds-space-xl` down each side, so two
sections stand `--ds-space-2xl` apart: twice the largest gap inside one of
them, which is what makes a heading group with what follows it. Containment is
then carried by proximity and by the heading, the reading that still works
when a panel grows a fourth and fifth section. Everything `CardHeader` draws
is unchanged, because the title is now the only containment signal there is.

**This is automatic and has no prop**: `Panel` marks its body
`data-panel-body` and `Card.module.css` keys the rule off that ancestor, so
nesting is stated by where the caller put the card and every existing call
site keeps its exact shape. A card that is not in a panel body is untouched.

The rhythm is each section's own padding rather than a separator between
adjacent ones (`.card + .card`, a hairline or a margin) on purpose: in the
consumer, sibling sections are not reliably adjacent siblings in the DOM —
`ConversationStatePanel` interleaves an `ApiUnavailable` between two of its
cards, and `NavigationPanel` lays two of them side by side in a two-column
grid, where a top border on "the next one" would rule a line across the card
*beside* its neighbour. A rule each section carries itself is right in all
three shapes and cannot go vacuous when a call site wraps a card in a `<div>`.

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
| Semantic tones | `--ds-tone-{success,warning,danger,info,neutral}-{fg,bg}` |
| Accent | `--ds-accent`, `--ds-accent-{hover,soft}` |
| Focus ring | `--ds-focus-ring-{color,width}` |
| Spacing scale (4-based) | `--ds-space-{2xs..2xl}` |
| Control sizing | `--ds-control-height-{sm,md,lg}`, `--ds-control-padding-x-{sm,md,lg}` |
| Radii (purpose-bound) | `--ds-radius-{control,card,pill}` |
| Shadow | `--ds-shadow-{card,overlay}` |
| Typography (purpose-bound) | `--ds-font-sans`, `--ds-font-mono`, `--ds-font-size-{label,control,body,heading-{1..4}}`, `--ds-line-height-{control,text}` |
| Disabled / Transition | `--ds-disabled-opacity`, `--ds-transition-fast` |
| Chat bubble (v0.4) | `--ds-bubble-{radius,pad-{x,y},gap,max-width}`, `--ds-bubble-{bg,fg}-{user,assistant,system,tool}`, `--ds-bubble-meta-{fg,size}`, `--ds-caret-{color,blink-duration}` |
| Live stage (v0.5) | `--ds-stage-{bg,grid-gap,tile-{bg,avatar-bg,name-bg,radius},speaking-ring}`, `--ds-caption-{bg,fg,speaker-fg}` |

Bind to **purpose** (`--ds-control-height-md`), not to **value** (`32px`).
A host theme can shift density without touching component CSS.

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
bun run test              # vitest --run (175+ tests across 27+ files)
bun run test:e2e          # vite + Playwright; verifies overflow / focus / role / chat / stage /
                          #   spinner rotation, toast semantics, panel grid spans and fact tiles
                          #   under both host aliases
                          #   in real chromium (the things jsdom cannot show)
bun run dev               # http://localhost:5198 — themed harness (both apps side by side)
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
- v0.13 — `reports/monitor-scope-coherence/` (ruling B)
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
- `aliases/{omks-robo-web,status-server-webui}.css` — the brand-bridge
  mapping for each consuming host.

If a task touches a domain primitive, owner ranking should resolve to one
of the four layers (status / form / chat-log / live-stage) by reading the
component header doc; if it does not, that header is the place to fix.
