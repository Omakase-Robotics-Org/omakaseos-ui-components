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
├── StatusBadge.tsx   # tone × pulse × size, semantic vocabulary
├── Card.tsx          # Card + CardHeader (two-piece)
├── Fact.tsx          # Fact + FactList, row/column direction
├── ButtonRow.tsx     # margin-free flex group
└── index.ts          # public surface

aliases/
├── status-server-webui.css   # for omakaseos/status_server_webui hosts
└── omks-robo-web.css         # for @omks-robo/web hosts

demo/                  # standalone harness rendering both themes side by side
```

## Public API

```ts
import {
  StatusBadge,           // <StatusBadge tone size? pulse?>{label}</StatusBadge>
  Card, CardHeader,      // <Card><CardHeader title hint? right?/>...</Card>
  Fact, FactList,        // <FactList><Fact label direction?>value</Fact>...</FactList>
  ButtonRow,             // <ButtonRow>{...buttons}</ButtonRow>
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
| `--ds-surface`, `--ds-surface-inset` | card background, inset tile background |
| `--ds-border` | card / chip border |
| `--ds-text`, `--ds-text-muted` | foreground, secondary foreground |
| `--ds-tone-{success,warning,danger,info,neutral}-{fg,bg}` | badge fg / soft bg per tone |
| `--ds-radius-card`, `--ds-radius-pill` | radii |
| `--ds-shadow-card` | card shadow (host theme decides) |
| `--ds-font-mono` | monospace stack for badge label etc. |

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
bun run test        # vitest --run (11 tests)
bun run dev         # http://localhost:5173 — themed harness (both apps)
bun run build       # demo/dist
```

## Origin

Started life as a PoC inside `omksos_web/reports/shared-status-components-poc/`.
That report retains the historical motivation, API delta tables, and the
two migration sketches.
