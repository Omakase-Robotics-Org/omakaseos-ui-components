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
| **Status** | v0.1–v0.2 | Status-monitor primitives shared by every panel that surfaces robot or service state | `StatusBadge`, `Card` + `CardHeader`, `Fact` + `FactList`, `ButtonRow` |
| **Form** | v0.3 | Native-element-based input / layout primitives with overflow-safe defaults and focus rings | `Button`, `Input`, `Select`, `Textarea`, `Heading`, `Toolbar`, `Checkbox`, `Switch`, `Slider`, `Field` |
| **Chat-log** | v0.4 | Past-tense conversation log — what was said, in chronological order. Vocabulary follows the OpenAI Realtime API event roles | `MessageBubble`, `Transcript`, `TypingIndicator`, `ToolCallTrace`, `RealtimeEventLog` |
| **Live-stage** | v0.5 | In-progress 1:n live conversation — Google Meet-style stage with participant grid + caption strip. Distinct DOM shape from the chat-log layer | `ConversationStage`, `ParticipantTile`, `LiveCaption` |

The chat-log and live-stage layers share the same `MessageRole` vocabulary
(`"user" | "assistant" | "system" | "tool"`) — taken verbatim from the OpenAI
Realtime API — and the same role-tinted accent tokens, so a speaker's tile in
the live stage and their bubble in the log read visually consistent.

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
} from "@omakase-robotics/ui-components";
```

Plus host-specific alias CSS, imported once at the SPA entry:

```ts
// omakaseos_service web (light, dashboard brand)
import "@omakase-robotics/ui-components/aliases/omks-robo-web.css";

// status_server_webui (dark, operator-facing)
import "@omakase-robotics/ui-components/aliases/status-server-webui.css";
```

The alias must come **after** the host's own brand variables.css so the
`--ds-*` mappings reference defined tokens.

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
bun run test              # vitest --run (107+ tests across 21+ files)
bun run test:e2e          # vite + Playwright; verifies overflow / focus / role / chat / stage
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
