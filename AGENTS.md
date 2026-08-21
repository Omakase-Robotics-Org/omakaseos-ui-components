# Agent policy — `@omakase-robotics/ui-components`

This file is the first thing an automated agent (Claude Code,
indexion-orient, etc.) should read when invoked against this
repository. It encodes the rules of engagement that are not
self-evident from the code.

## What this repo is

A shared React component library consumed by three web apps:
`omakaseos_service` web, `status_server_webui`, and (since v0.15)
`robot-inspection-web`. Read [`README.md`](./README.md) for the layered
surface map, the host table, and consumption details.

## What this repo is NOT

It is **not** a place for app-specific logic, brand colors, or domain
types. If a primitive can only render correctly inside one of the
consuming apps, it does not belong here — it belongs in that app's
own `components/` directory.

## Decision rules for an agent edit

1. **Choose a layer.** Every primitive lives in exactly one of:
   *Status* / *Form* / *Chat-log* / *Live-stage* (see README). If a
   change spans layers, split it.

2. **Bind to `--ds-*`.** Component CSS must reference design tokens,
   never raw values. If a token is missing, add it to `src/tokens.css`
   AND **every** alias file (`aliases/omks-robo-web.css`,
   `aliases/status-server-webui.css`,
   `aliases/robot-inspection-web.css`) in the same change. A library
   token without a host bridge is a silent regression: the component
   falls back to the library default, which is LIGHT — on a dark host
   that is a visible break, and on a light host it is a silent one.

   **An alias maps; it does not decide.** Every `--ds-*` declaration in
   an alias must resolve through `var(...)` at a variable the host's
   palette owns. `spec/alias-purity.spec.ts` freezes the pre-existing
   bare literals per file, so a NEW literal fails CI — and promoting a
   frozen one to a mapping must shrink that list. Put the value in the
   host palette and map to it, or add a library default in
   `src/tokens.css`. Adding a whole new host means a new alias file plus
   its (ideally empty) entry in that spec's `FROZEN_LITERALS`, plus the
   `exports` map, plus a scoped copy in `demo/hosts.css` and an entry in
   `.storybook/preview.ts`'s `HOST_SCOPES`.

   **Not every level has to be mapped.** Where a host palette genuinely
   does not own a level (density, the type ramp), the library default is
   the right answer and the non-mapping is documented in the alias
   header. That is a stated decision, not a gap.

   **A desaturated host is a design constraint, not a theme.**
   `robot-inspection-web` spends no hue at all, so a primitive that
   distinguishes its states by colour alone is broken there. Distinguish
   by fill, line style, opacity or shape — see `StatusGlyph` /
   `RankChip` / `SegmentedMeter` for the pattern, and note that a
   `border-style` claim is invisible to jsdom and therefore needs an
   e2e assertion. Concretely: `StatusBadge` (and any primitive that carries
   state through hue alone) cannot be used for state discrimination on this
   host — reach for `StatusGlyph` instead.

   **The aui surface (`src/aui/`, shadcn theme tokens, CSS Modules).**
   The vendored shadcn-style assistant-ui registry components under
   `src/aui/` are the **only** place in this library that don't bind
   to `--ds-*` — they target the shadcn theme token set
   (`--background`, `--foreground`, `--primary`, ...) by name because
   the upstream registry was authored that way, and we ship them
   verbatim rather than re-author the token NAMES — the upstream
   registry is too large to fork visually. Through v0.8 this layer
   ran on Tailwind v4; the v0.9 migration
   (`omksos_web/reports/aui-css-modules/`) moved it to plain CSS
   Modules (one `*.module.css` per component) with **no Tailwind
   anywhere in the package anymore**. To keep the boundary intact:

   - No Tailwind import, dependency, or utility-class syntax anywhere
     in `src/`, `demo/`, or `aliases/`.
   - No `tailwind-merge` import anywhere — `src/aui/lib/cn.ts`'s `cn()`
     is a plain `clsx` composer.
   - Legacy v0.4/v0.5 components (`Button`, `Card`, `MessageBubble`,
     `ConversationStage`, ...) stay on `*.module.css` + `--ds-*`
     tokens. They DO NOT mount under `.aui-root` and are not styled
     by the shadcn theme.
   - The aui preflight is scoped to `:where(.aui-root *)`. The
     Thread shell mounts that class on its root; new aui-surface
     components must mount inside the same subtree or their
     preflight inheritance breaks.

   These rules are pinned by `spec/aui-tailwind-boundary.spec.ts`
   (failing CI catches violations) and explained at length in
   `omksos_web/reports/ui-components-aui-canonical-lift/README.md`,
   `omksos_web/reports/ui-components-aui-tailwind-preflight-scope/README.md`,
   and `omksos_web/reports/aui-css-modules/README.md` (the v0.9
   Tailwind -> CSS Modules migration itself). If you find yourself
   wanting to relax any of them, read those reports first — the
   boundary was sized deliberately.

3. **Both call shapes must compile.** When two consuming apps use
   different idioms for the same concept (e.g. `label=` vs `children`),
   the library accepts both. Add a vitest case for each.

   **A required `ariaLabel` is a design decision, not boilerplate.**
   Where a primitive's whole meaning is drawn (`StatusGlyph`,
   `SegmentedMeter`), the name can only come from the caller and the
   prop is required. Where the primitive renders the caller's own text
   (`RankChip`), it is optional. Where every instance means the same one
   thing (`Spinner` — "work is in progress"), it defaults. Pick the case
   deliberately and say which in the header.

4. **Native elements only — with one bounded exception.** Form controls
   wrap a real `<input>` / `<select>` / `<button>` / `<textarea>`.
   Synthetic ARIA widgets are out of scope by default; we get a11y /
   IME / mobile pickers for free from the platform.

   **AsyncCombobox exception (v0.7).** A single primitive,
   `src/AsyncCombobox.tsx`, is allowed to compose a native `<input
   role="combobox">` with a synthetic `<ul role="listbox">` /
   `<li role="option">` panel. This is the only way to express
   "type-to-search a server-fetched candidate list" — `<select>` and
   `<datalist>` both break at thousands of options
   (see `omksos_web/reports/ui-components-async-combobox-layer/`).

   To keep the exception bounded, the package guarantees:

   - `role="listbox"` / `role="option"` / `role="combobox"` appear in
     `src/AsyncCombobox.tsx` and **nowhere else** under `src/`
     (excluding the aui surface, which is governed by its own
     boundary).
   - `spec/async-combobox-boundary.spec.ts` runs that grep on every
     CI invocation; a future PR that opens a second synthetic widget
     fails before review.
   - The `<input>` half stays native, so IME, mobile soft keyboards,
     and autocomplete behaviors keep working.

   If you find yourself wanting to relax this exception (a second
   synthetic widget, an ARIA dialog inside a primitive, etc.), read
   the report first — the boundary was sized deliberately, and the
   right answer is almost always "rebuild the request on top of
   AsyncCombobox" or "let the consumer own that synthetic widget".

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
been bumped to the new tag and that consumer's gate is green.
(v0.15's consumer is `robot-inspection-web` — see
`omksos_web/reports/robot-inspection-service-bootstrap/`.) The
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
