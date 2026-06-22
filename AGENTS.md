# Agent policy — `@omakase-robotics/ui-components`

This file is the first thing an automated agent (Claude Code,
indexion-orient, etc.) should read when invoked against this
repository. It encodes the rules of engagement that are not
self-evident from the code.

## What this repo is

A shared React component library consumed by two web apps:
`omakaseos_service` web and `status_server_webui`. Read [`README.md`](./README.md)
for the layered surface map and consumption details.

## What this repo is NOT

It is **not** a place for app-specific logic, brand colors, or domain
types. If a primitive can only render correctly inside one of the two
consuming apps, it does not belong here — it belongs in that app's
own `components/` directory.

## Decision rules for an agent edit

1. **Choose a layer.** Every primitive lives in exactly one of:
   *Status* / *Form* / *Chat-log* / *Live-stage* (see README). If a
   change spans layers, split it.

2. **Bind to `--ds-*`.** Component CSS must reference design tokens,
   never raw values. If a token is missing, add it to `src/tokens.css`
   AND both alias files (`aliases/omks-robo-web.css`,
   `aliases/status-server-webui.css`) in the same change. A library
   token without a host bridge is a silent regression.

   **Tailwind exception (v0.6 aui surface).** The vendored
   shadcn-style assistant-ui registry components under `src/aui/`
   are the **only** place in this library where Tailwind v4 is in
   use. They were authored upstream against Tailwind utility
   classes + shadcn theme tokens (`--background`, `--foreground`,
   `--primary`, ...), and we ship them verbatim rather than re-author
   them in CSS Modules — the upstream registry is too large to fork
   visually. To keep that exception bounded:

   - Tailwind imports (`@import "tailwindcss"`,
     `@import "tailwindcss/theme.css"`, etc.) appear in
     `src/aui/aui.css` and **nowhere else**.
   - Tailwind class composition utilities (`clsx`, `tailwind-merge`,
     `class-variance-authority`, `cn`) are imported only by
     `src/aui/**/*.{ts,tsx}`.
   - Legacy v0.4/v0.5 components (`Button`, `Card`, `MessageBubble`,
     `ConversationStage`, ...) stay on `*.module.css` + `--ds-*`
     tokens. They DO NOT mount under `.aui-root`, do not use
     Tailwind utilities, and are not styled by the shadcn theme.
   - The aui preflight is scoped to `:where(.aui-root *)`. The
     Thread shell mounts that class on its root; new aui-surface
     components must mount inside the same subtree or their
     preflight inheritance breaks.

   These rules are pinned by `spec/aui-tailwind-boundary.spec.ts`
   (failing CI catches violations) and explained at length in
   `omksos_web/reports/ui-components-aui-canonical-lift/README.md`
   and `omksos_web/reports/ui-components-aui-tailwind-preflight-scope/README.md`.
   If you find yourself wanting to relax any of them, read those
   reports first — the exception was sized deliberately.

3. **Both call shapes must compile.** When two consuming apps use
   different idioms for the same concept (e.g. `label=` vs `children`),
   the library accepts both. Add a vitest case for each.

4. **Native elements only.** Form controls wrap a real
   `<input>` / `<select>` / `<button>` / `<textarea>`. Synthetic ARIA
   widgets are out of scope; we get a11y / IME / mobile pickers for
   free from the platform.

5. **Overflow first.** Every container assumes a long unbroken token
   in its content. `min-width: 0` on flex children, `overflow-wrap:
   anywhere` on text surfaces, `text-overflow: ellipsis` only where
   single-line truncation is the documented behavior.

6. **No `let` outside loops.** Match the consuming apps' lint policy
   (status_server_webui's flat-config restricted-syntax rule). The
   library does not enforce its own lint, but PRs that would land in
   the consumers must lint clean over there too.

## Gate sequence

Run these locally before requesting review (CI runs the same):

```
bun run typecheck
bun run test
bun run test:e2e        # vite + Playwright real chromium
bun run build           # demo/dist
bun run build-storybook # storybook-static/
```

The Playwright spec needs a clean port — kill any local dev server
on `5198` first.

## Consumer-side green rule

A library change is **not done** until at least one consuming app has
been bumped to the new tag and that consumer's gate is green. The
library's CI cannot enforce this; treat it as a discipline rule. See
[`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full procedure.

## Where the design notes live

The PoC reports for each layer live in the orchestrator repo
(`omakase-robotics/omksos_web`) under `reports/`. They retain the
problem statement, the API delta, the gates that drove red→green, and
the design discoveries. When in doubt about why a layer or a primitive
exists, read the report before changing the contract.

## indexion knowledge surface

When `indexion agent orient` indexes this repo, the intended
`knowledge_sources` are:

- This file (`AGENTS.md`) — rules and decision boundaries.
- [`README.md`](./README.md) — public surface map.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — gate / versioning / PoC
  cycle.
- Each `src/<Name>.tsx` JSDoc header — per-component contract.
- Each `aliases/*.css` — per-host token bridge.

If an orient against the consuming apps does NOT surface this
repository, fix the indexed corpus to include it (the apps' README
already links to this repo as the SoT for shared visual primitives).
