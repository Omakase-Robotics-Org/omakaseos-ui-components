# @omakase-robotics/ui-components

Shared L1 React component library for omakase-robotics web UIs:

- [`omakaseos_service`](https://github.com/omakase-robotics/omakaseos_service) — `packages/web` (the dashboard)
- [`status_server_webui`](https://github.com/omakase-robotics/...) — the on-robot diagnostic UI

The library carries **only the visual primitives** that both UIs share, and
intentionally carries **no brand colors** of its own. Each consuming app
provides a small alias CSS file that maps its existing tokens onto the
library's neutral `--ds-*` token names.

## What's in here

```
src/
├── tokens.css        # neutral --ds-* tokens with sane fallbacks
│                     # (v0.3: control sizing, spacing scale, accent,
│                     #  focus ring, typography scale, transition)
├── StatusBadge.tsx   # tone × pulse × size, semantic vocabulary
├── Card.tsx          # Card + CardHeader (two-piece, with title= shorthand)
├── Fact.tsx          # Fact + FactList, row/column direction
├── ButtonRow.tsx     # margin-free flex group
│
├── Button.tsx        # primary | secondary | ghost | danger; sm/md/lg
├── Input.tsx         # native <input> shell, sm/md/lg, invalid
├── Select.tsx        # native <select> with chevron + ellipsis closed state
├── Textarea.tsx      # native <textarea>, vertical resize, invalid
├── Heading.tsx       # h1..h4 bound to typographic level + truncate?
├── Toolbar.tsx       # role=toolbar; first child grows; min-width: 0
├── Checkbox.tsx      # native checkbox + tri-state + optional label
├── Switch.tsx        # role=switch; styled track+thumb
├── Slider.tsx        # native range + custom track-fill via --ds-slider-fill
└── index.ts          # public surface

aliases/
├── status-server-webui.css   # for omakaseos/status_server_webui hosts
└── omks-robo-web.css         # for @omks-robo/web hosts

demo/                  # standalone harness rendering both themes side by side
spec/                  # Playwright e2e: overflow / focus / role contracts
scripts/run-e2e.sh     # demo harness e2e runner (parity with source/scripts/wt-e2e.sh)
```

## Public API

```ts
import {
  // status primitives (v0.1–v0.2)
  StatusBadge,           // <StatusBadge tone size? pulse?>{label}</StatusBadge>
  Card, CardHeader,      // <Card><CardHeader title hint? right?/>...</Card>
  Fact, FactList,        // <FactList><Fact label direction?>value</Fact>...</FactList>
  ButtonRow,             // <ButtonRow>{...buttons}</ButtonRow>

  // basic primitives (v0.3)
  Button,                // <Button variant size? truncate?>label</Button>
  Input,                 // <Input inputSize? invalid? type?/>
  Select,                // <Select selectSize?><option/>...</Select>
  Textarea,              // <Textarea rows? invalid?/>
  Heading,               // <Heading level={1..4} truncate?>title</Heading>
  Toolbar,               // <Toolbar align? ariaLabel?>{...}</Toolbar>
  Checkbox,              // <Checkbox label? indeterminate?/>
  Switch,                // <Switch label?/>  (role=switch)
  Slider,                // <Slider min max value label?/>
} from "@omakase-robotics/ui-components";

// Bring in the neutral tokens once, OR provide your own alias file.
import "@omakase-robotics/ui-components/tokens.css";

// Or, host-specific alias (replaces the import above):
import "@omakase-robotics/ui-components/aliases/status-server-webui.css";
import "@omakase-robotics/ui-components/aliases/omks-robo-web.css";
```

`StatusBadge` tones are **semantic**, not domain-specific:

```ts
type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";
```

If your app speaks a domain vocabulary like `"running" | "stopped" | "failed"`,
write a 5-line in-app adapter that maps to the semantic tone — see the
status_server_webui migration sketch.

### Backwards-compatible call shapes

The `Card` and `StatusBadge` surfaces accept both call shapes used by the
two consuming apps, so neither app pays a per-call-site cost for adopting
the library:

```tsx
// Both compile, both render the same DOM:
<StatusBadge tone="success" label="Live" />
<StatusBadge tone="success">Live</StatusBadge>

<Card title="Robot State">…</Card>
<Card><CardHeader title="Robot State"/>…</Card>
```

`children` wins over `label` when both are given. The `title` shorthand
on `Card` is implemented as `<CardHeader title=…/>` internally — no
behavioral difference.

## Why these five components

These are the L1 (visual primitive) intersection between the two consuming
apps. L2 (BatteryBadge / ConnectionBadge / SignalBars) and L3 (RobotStatePanel
etc.) are deliberately **out of scope** until the L1 contract is proven in
production. L3 also requires a shared type contract
(`@omks-robo/core/robot-status`), which is a separate decision.

## Token model

Components reference only `--ds-*` CSS variables. The library ships sane
fallbacks (`src/tokens.css`) so a host that forgets to alias still renders
plausibly.

| `--ds-*` | what it means |
|---|---|
| `--ds-surface`, `--ds-surface-inset`, `--ds-surface-hover`, `--ds-surface-active` | layered surfaces for cards, tiles, hover/active feedback |
| `--ds-border`, `--ds-border-strong` | hairline border / hover-emphasized border |
| `--ds-text`, `--ds-text-muted`, `--ds-text-disabled`, `--ds-text-on-accent` | foreground variants |
| `--ds-tone-{success,warning,danger,info,neutral}-{fg,bg}` | badge fg / soft bg per tone |
| `--ds-accent`, `--ds-accent-hover`, `--ds-accent-soft` | primary action color (Button primary, Switch on, Slider fill, Checkbox checked) |
| `--ds-focus-ring-color`, `--ds-focus-ring-width` | focus ring around all interactive controls |
| `--ds-space-{2xs..2xl}` | gap / padding scale (4-based) |
| `--ds-control-height-{sm,md,lg}`, `--ds-control-padding-x-{sm,md,lg}` | size variants for Input / Select / Button / Switch |
| `--ds-radius-control`, `--ds-radius-card`, `--ds-radius-pill` | purpose-bound radii |
| `--ds-shadow-card`, `--ds-shadow-overlay` | card / overlay shadow |
| `--ds-font-sans`, `--ds-font-mono` | font stacks |
| `--ds-font-size-{label,control,body,heading-1..4}` | typographic scale (purpose-bound) |
| `--ds-line-height-{control,text}` | line-height for controls vs prose |
| `--ds-disabled-opacity` | opacity for disabled controls |
| `--ds-transition-fast` | transition duration for hover/focus/checked |

The brand SoT in each consuming app stays authoritative; the alias CSS just
forwards the names.

## Consuming this repo

The two apps consume this package via **git submodule** during the rollout
phase, then graduate to a `git+ssh` URL pin in `package.json` once the
public surface is stable:

```jsonc
// package.json
"dependencies": {
  // Stage 1 (rollout): submodule under vendor/ + workspace symlink.
  // Stage 2 (stable):
  "@omakase-robotics/ui-components": "git+ssh://git@github.com/omakase-robotics/omakaseos-ui-components.git#v0.1.0"
}
```

If your machine uses an SSH alias (e.g. `omakase` for github.com via a
non-default key), substitute:

```
git+ssh://git@omakase/omakase-robotics/omakaseos-ui-components.git#v0.1.0
```

Tag every breaking change. Until v1.0.0 the surface may move; pin exact
tags in dependent apps.

## Development

```bash
bun install
bun run typecheck   # tsc --noEmit
bun run test        # vitest --run (49 tests across 12 files)
bun run test:e2e    # vite + Playwright; verifies overflow/focus/role
                    # in a real chromium (the things jsdom cannot show)
bun run dev         # http://localhost:5198 — themed harness (both apps)
bun run build       # demo/dist
```

## Origin

- v0.1–v0.2 status primitives: PoC at `omksos_web/reports/shared-status-components-poc/`,
  shipped to dashboard at `source/packages/web` (commit `d236683`).
- v0.3 basic primitives: PoC at `omksos_web/reports/shared-ui-components-basics-poc/`.
  Library consumed in dashboard separately; status_server_webui consumes the
  same contract once it joins.

Both reports retain the API delta tables, token vocabulary rationale, and
the gates that drove the PoC red→green.
