# Contributing to `@omakase-robotics/ui-components`

This library is the **single contract** that three apps (`omakaseos_service`
web, `status_server_webui`, and `robot-inspection-web`) share for visual
primitives. Changes here ripple to all of them. The policies below exist to
keep that contract honest.

## The consumer-side green rule

A change is **not done** until at least one consuming app has been updated
to use it and the consumer's gate is green. This is not a CI rule (the
library's own CI cannot reach the consumers) — it is a discipline rule.

In practice:

1. Land the library change behind a tag (e.g. `v0.6.0`).
2. In the orchestrator repo, open a worktree against the consumer's main
   and bump the dependency to the new tag.
3. Run the consumer's full gate suite. For `omakaseos_service`:
   `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`,
   and `make wt-e2e` (compared to bare main if pre-existing fails are
   present). For `status_server_webui`: `bun run typecheck`, `lint`,
   `test`, `build`.
4. Cherry-pick / merge the consumer change.
5. Only after both points 1 and 4 are done is the change "shipped".

A library-only green is not green. The PoC report this rule comes from
is `reports/realtime-chat-components-poc/README.md` in the orchestrator.

## Choosing the right layer

Every primitive belongs to exactly one layer:

| Layer | What lives here | What does NOT belong here |
| --- | --- | --- |
| **Status** | Pure presentation primitives that appear in dashboards / status panels (badges, cards, fact rows, and the shape-carried glyph / chip / meter) | Anything interactive beyond a click handler |
| **Form** | Native-element-based form / layout primitives (input, select, button, toolbar). Always use a real `<input>`/`<select>`/`<button>` so a11y / IME / mobile pickers come for free | Anything past-tense (chat log) or live (stage); those have their own layer |
| **Chat-log** | Past-tense conversation rendering: bubbles, transcripts, tool-call traces, event log. Vocabulary is OpenAI Realtime API roles | Anything that represents the in-progress call (who is on the line right now) — that is the live-stage layer |
| **Live-stage** | In-progress 1:n call rendering: participant grid, speaking indicators, live caption | Anything past-tense; that is chat-log |

If a primitive feels like it spans two layers, **split it**. v0.5 was
created precisely because a single "RealtimeChatPanel" was being asked to
serve both surfaces.

## Tokens

Bind component CSS to `--ds-*` purpose tokens (e.g. `--ds-control-height-md`),
never to raw values (`32px`). New tokens go in `src/tokens.css` with sane
fallbacks, and **must** be bridged in every alias file
(`aliases/omks-robo-web.css`, `aliases/status-server-webui.css`,
`aliases/robot-inspection-web.css`) in the same PR, plus the matching scoped
copy in `demo/hosts.css`. Adding a token in the library without the bridge is
a silent regression: the component falls back to the library default in
production, and those defaults are light.

An alias file **maps; it does not decide**. Every declaration must resolve
through `var(...)` at a host-owned variable;
`spec/alias-purity.spec.ts` freezes the pre-existing literals per file and
fails on new ones. If a value has nowhere to live, it belongs in the host
palette or in `src/tokens.css` — not in the alias.

If a token is purely internal (used by exactly one component, never
consumed by host overrides), keep it in the component's CSS module.
Promote to `tokens.css` when a second component reuses it. Component-intrinsic
geometry (a glyph's diameter, a chip's side, a bar's thickness) stays in the
module on purpose: it must NOT pick up `--ds-control-height-*`, because these
primitives have to fit *inside* a control or a table row.

### Adding a host

A fourth consuming app means, in one PR: `aliases/<host>.css` (mappings only),
its entry in `FROZEN_LITERALS` (empty — new aliases have no excuse for
literals), the `exports` map in `package.json`, a scoped copy of the palette
and its mappings under `.host--<host>` in `demo/hosts.css`, a third column in
`demo/main.tsx`'s harness, and an entry in `.storybook/preview.ts`'s
`HOST_SCOPES` / toolbar. Every primitive must then render plausibly under it —
including layers that host has no screen for yet, since an unmapped token
there is a break waiting for the first screen that mounts one.

## Backwards-compatible call shapes

When two consuming apps already use different call shapes for the same
underlying concept, the library accepts **both**. Examples in this repo:

- `<StatusBadge tone label>` (omks-robo/web) **and**
  `<StatusBadge tone>{children}</StatusBadge>` (status_server_webui).
- `<Card title>` (omks-robo/web) **and**
  `<Card><CardHeader title/></Card>` (status_server_webui).
- `Button` accepts a superset of variants (`accent`, `warning`, `neutral`)
  so the dashboard's existing call sites compile unchanged.

The rule is: **the library is upper-compatible**, the apps don't carry
adapter code per call site. Document both shapes in the component's
header doc and add a vitest case for each.

## Gate sequence (every PR)

The library CI runs all of these; PRs are not mergeable until each is
green:

```
bun run typecheck      # tsc --noEmit
bun run test           # vitest --run
bun x playwright install --with-deps chromium
bun run test:e2e       # demo harness + Playwright real-browser
bun run build          # demo/dist
bun run build-storybook
```

For new primitives, the PR must include:

1. The component (`src/<Name>.tsx`) with a JSDoc header that names the
   layer, the call-shape policy, and the cross-app constraints.
2. The CSS module (`src/<Name>.module.css`) bound to `--ds-*` only.
3. A vitest spec (`src/<Name>.spec.tsx`) covering props / role /
   data-attributes / both call shapes if the API has them.
4. A Storybook story (`src/<Name>.stories.tsx`) under the correct
   layer's title prefix (`Status/`, `Form/`, `Chat-log/`, or
   `Live-stage/`), with at least one story per supported variant.
5. If layout-sensitive: a Playwright spec under `spec/*.e2e.spec.ts`
   covering the things jsdom cannot see (overflow / focus ring /
   computed alignment / role).

## Versioning

- **Patch** (`v0.5.0` → `v0.5.1`): bug fixes, doc-only changes.
- **Minor** (`v0.5.0` → `v0.6.0`): additive changes, new primitives,
  call-shape extensions that are backwards-compatible.
- **Major** (`v0.x` → `v1.0`): breaking changes (prop renames, removed
  variants, DOM structure changes that affect CSS selectors in consumers).

Until `v1.0.0` the public surface may move. Tag every release; consumers
pin to exact tags. Tag a release with `git tag v0.x.y && git push origin
v0.x.y` so the Pages workflow rebuilds Storybook against the tag.

## Repo health

- `LICENSE` — proprietary "All Rights Reserved" by default. Re-evaluate
  when public release is decided.
- `.github/CODEOWNERS` — every path requires `@omakase-robotics/admins`
  review.
- `.github/dependabot.yml` — weekly updates for npm + GitHub Actions,
  grouped (Storybook, Vite, testing, types).
- CI / Pages workflows — keep both green; Pages publishes Storybook to
  `https://omakase-robotics.github.io/omakaseos-ui-components/`.

## Issues and questions

For long-running discussions or design proposals, open a PoC report in
the orchestrator repo (`omksos_web/reports/<purpose>/README.md`) and
link the PR back to it. Short-lived questions can live in the PR
description.
