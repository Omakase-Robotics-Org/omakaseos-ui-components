/**
 * @file PanelScope — the React scope a `Panel` opens around its body, and the
 * one mechanism by which this library refuses an illegal composition.
 *
 * ## What the scope is for
 *
 * `Panel` and `Card` are both drawn from the surface recipe (a `--ds-surface`
 * fill inside a `--ds-border` outline, rounded and lifted by
 * `--ds-shadow-card`), so a `Card` in a `Panel` body is a frame inside a frame:
 * the reader has to count boxes to know what contains what. Two releases tried
 * to answer that by changing how the inner box is *drawn* — v0.12 relaxed the
 * nested recipe, v0.13 removed the surface from it altogether — and both were
 * rejected for the same reason, stated most sharply the second time: repainting
 * a violation until it looks legal keeps the structure it was supposed to
 * prevent, and makes the call site lie (the same `<Card>` renders as two
 * different things depending on where it sits, so moving it is a silent visual
 * change and a `<div>` in the way is a silent behavioural one). See omksos_web
 * `reports/monitor-scope-coherence/`, ruling B.
 *
 * v0.14 therefore does not restyle the nested case. It **forbids** it and
 * supplies the vocabulary the caller actually wanted: `Section`, a heading with
 * its content and the rhythm around it, which draws no surface because it is
 * not a container. A `Panel` body may hold `Section`s; it may not hold another
 * container.
 *
 * ## Why a React context and not a DOM ancestor
 *
 * The rule is about **composition** — "this component was rendered as part of
 * that panel's content" — and composition is what React context reports. A DOM
 * ancestor reports position instead, and the two come apart in both directions;
 * context is deliberately the one this contract follows.
 *
 *  - **Rendered elsewhere, portalled in.** A component outside a panel's
 *    subtree that portals its output into the panel's body is, in the DOM,
 *    inside it — and does NOT throw. That is right: it was not composed into
 *    the panel, the placement is the portal's business, and the call site the
 *    contract would be complaining about does not exist.
 *  - **Rendered inside, portalled out.** The reverse holds too, because React
 *    context passes through a portal: a `Card` rendered from within a panel's
 *    subtree throws even when its DOM lands in an overlay layer. This is a real
 *    consequence to know at a call site — an overlay opened from inside a
 *    panel and painted on a `Card` is refused. The resolution is the one an
 *    overlay wants anyway: raise it to a layer the host owns, outside the
 *    panel, so the panel's subtree describes only what the panel contains.
 *  - Meanwhile an ancestor selector goes vacuous the moment a call site wraps
 *    things in an element it does not expect, which is how a CSS-only rule
 *    silently stops applying.
 *
 * Both directions are pinned in `PanelScope.spec.tsx`.
 *
 * `Panel` also keeps its `data-panel-body` marker on the same element. That
 * attribute is no longer a style hook: it is what the browser-level container
 * scans in the consuming apps address (omksos_web's container-nesting guard) and
 * what consumer specs select a panel's content by. The contract itself is this
 * context.
 *
 * ## Where the provider starts
 *
 * The provider wraps a panel's **children only**, not its `headerRight` slot.
 * A control placed in the header is chrome belonging to the panel itself rather
 * than content within it, so a surface there is not a nested container — and
 * because context follows the render position rather than where the element was
 * created, `headerRight={<Card/>}` is outside the scope for the same reason it
 * is outside the body in the DOM.
 */
import { createContext, useContext, type ReactNode } from "react";

/**
 * True while rendering inside a `Panel`'s body. Read by every container in this
 * library, at the top of its render, to refuse the composition.
 */
const PanelScopeContext = createContext(false);

/** Opens the scope around a panel's content. Used by `Panel`; not public API. */
export function PanelScope({ children }: { children: ReactNode }) {
  return <PanelScopeContext.Provider value={true}>{children}</PanelScopeContext.Provider>;
}

/**
 * Whether the component calling this is being rendered as part of a `Panel`'s
 * content.
 *
 * A container calls it at the top of its render and throws when it is true —
 * the same shape as the `useX must be used inside XProvider` throws a consumer
 * already knows, in the other direction: a misuse the component itself can see,
 * reported by the component itself, at the moment it happens rather than as a
 * layout that looks slightly wrong. It throws in production too, deliberately:
 * a contract that only holds in development is a contract the shipped app does
 * not have, and the failure is a composition error in the caller's own tree,
 * which is fixed by writing the call differently — not by data.
 */
export function useInsidePanel(): boolean {
  return useContext(PanelScopeContext);
}
