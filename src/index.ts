/**
 * @file Public surface of @omakase-robotics/ui-components.
 *
 * v0.1–v0.2: status-monitor primitives (StatusBadge, Card, Fact, ButtonRow).
 * v0.3:      basic form & layout primitives (Input, Select, Textarea,
 *            Heading, Toolbar, Button, Checkbox, Switch, Slider).
 * v0.4:      Conversation-log primitives (MessageBubble, Transcript,
 *            TypingIndicator, ToolCallTrace, RealtimeEventLog) — past-tense
 *            transcript view of OpenAI Realtime API events.
 * v0.5:      Live-conversation primitives (ConversationStage, ParticipantTile,
 *            LiveCaption) — Google Meet 1:n in-progress stage view.
 *            Distinct from v0.4: a Transcript renders what was said; a
 *            ConversationStage renders who is in the room right now.
 * v0.7:      AsyncCombobox — type-to-search single-choice picker over
 *            an async candidate list. The library's only synthetic
 *            ARIA widget; bounded by `spec/async-combobox-boundary.spec.ts`.
 * v0.10:     ToggleSwitch, SignalBars, ReservedText — promoted from
 *            `robot-status-server-app`'s self-contained `components/ui/`
 *            CSS modules (an SoT audit finding: three genuine L1 visual
 *            primitives living outside the shared design system). See
 *            `omksos_web/reports/ui-primitives-promotion/README.md`.
 * v0.11:     Spinner, Toast — the two feedback primitives both apps had
 *            re-implemented locally (the robot console carried three
 *            private spinner keyframes and its own toast card; the
 *            dashboard its own toast card). Panel — the titled page-grid
 *            section the robot console builds every screen out of (39 call
 *            sites), distinct from Card. FactGrid + Fact `size` — the
 *            missing half of the tile pattern the `column` direction was
 *            added for. Plus StatusBadge's opt-in `live` region. See
 *            `omksos_web/reports/rssa-ui-unification/README.md`.
 * v0.14:     Section — a heading, its content and the rhythm around it, with
 *            no surface of its own: the way to divide a `Panel`'s body now
 *            that a container inside a container is refused rather than
 *            restyled (`Card` and `Panel` throw inside a panel's scope). See
 *            `omksos_web/reports/monitor-scope-coherence/`, ruling B, and
 *            `src/PanelScope.tsx` for why the check is a context read.
 *
 * v0.15:     StatusGlyph, RankChip, SegmentedMeter — the shape-carried Status
 *            vocabulary, plus a third host alias
 *            (`aliases/robot-inspection-web.css`). The acceptance-inspection
 *            web app is fully desaturated by design, so a register cannot be
 *            stated as a hue: these three state it as fill, line style and
 *            opacity instead, which also survives a greyscale printout and
 *            colour-vision deficiency on the two existing hosts. See
 *            `omksos_web/reports/ui-components-inspect-theme/README.md`.
 *
 * v0.18:     Popover, Menu — the two anchored floating-panel primitives the
 *            dashboard hand-rolled per call site (`.codex/ref/Popover.tsx` /
 *            `.codex/ref/Menu.tsx`, verbatim-identical `panelPosition`
 *            functions). Both now consume `src/floating/anchoredPanelPosition`
 *            — an INTERNAL, four-sided placement core (not exported here;
 *            Tooltip will be the next consumer) that reproduces the refs'
 *            math byte-for-byte for their fixed call shape. Portal to
 *            document.body and reset `PanelScope` around their content
 *            (`src/PanelScope.tsx`) — an overlay opened from inside a Panel
 *            is its own top-level surface, not the panel's content.
 *            Dialog — the native `<dialog>` modal (`.codex/ref/Dialog.tsx`),
 *            same portal + PanelScope-reset shape, plus `footerStart`: a
 *            real start-aligned footer slot the dashboard's `FormDialog`
 *            only ever promised (its `extraActions` doc says "left of the
 *            footer" but the CSS never pulled it there). ConfirmDialog — a
 *            presentational confirm shell (Dialog + Button) with no async
 *            lifecycle, no toast, no i18n; the dashboard's own async
 *            confirm flow (renamed `ConfirmAction`) composes it instead of
 *            owning the dialog shape.
 *
 * L2 (BatteryBadge, ConnectionBadge) and L3 (RobotStatePanel, ServicePanel)
 * remain deferred until the contract is proven across both consuming apps.
 */

// Status-monitor primitives
export { StatusBadge } from "./StatusBadge";
export type { BadgeTone, BadgeSize, StatusBadgeProps } from "./StatusBadge";

export { Card, CardHeader } from "./Card";
export type { CardProps, CardHeaderProps } from "./Card";

// v0.14: the grouping vocabulary for the inside of a Panel — a headed group
// that is not a container, so it can divide a panel body without drawing a
// second surface in it. Legal anywhere; the only grouping legal in a panel.
export { Section, SectionHeader } from "./Section";
export type { SectionProps, SectionHeaderProps } from "./Section";

// FactGrid (v0.11) is the tile reading of a set of facts; FactList the list
// reading; FactColumns the page-scale, surfaceless reading. See the file
// header for which to reach for.
export { Fact, FactList, FactGrid, FactColumns } from "./Fact";
export type { FactDirection, FactSize, FactTone, FactProps } from "./Fact";

// v0.11: a titled section of a page grid. NOT a Card variant — see the
// file header for the distinction (grid cell vs surface within a page).
export { Panel } from "./Panel";
export type { PanelProps } from "./Panel";

// v0.15: the shape-carried Status vocabulary — a register, a rank and a
// division stated without hue. Reach for StatusGlyph over StatusBadge where
// the register is one cell of a dense table and the word does not fit; see
// each file's header for the shape-to-meaning table.
export { StatusGlyph } from "./StatusGlyph";
export type { GlyphTone, GlyphSize, StatusGlyphProps } from "./StatusGlyph";

export { Avatar } from "./Avatar";
export type { AvatarSize } from "./Avatar";

export { RankChip } from "./RankChip";
export type { RankLevel, RankChipSize, RankChipProps } from "./RankChip";

export { SegmentedMeter } from "./SegmentedMeter";
export type {
  SegmentWeight,
  MeterSegment,
  SegmentedMeterSize,
  SegmentedMeterProps,
} from "./SegmentedMeter";

// v0.16: direct-manipulation visual vocabulary. These are SVG fragments;
// the headless geometry / grammar surface is exported from ./direct-manipulation.
export { EditHandle } from "./EditHandle";
export type { EditHandleProps } from "./EditHandle";

export { EditGhostHandle } from "./EditGhostHandle";
export type { EditGhostHandleProps } from "./EditGhostHandle";

export { EditHeadingKnob } from "./EditHeadingKnob";
export type { EditHeadingKnobProps } from "./EditHeadingKnob";

export { EditRemoveBadge } from "./EditRemoveBadge";
export type { EditRemoveBadgeProps } from "./EditRemoveBadge";

/* The editing glyphs live in the ROOT barrel, never in the
 * `./direct-manipulation` subpath: that subpath is classified
 * "kernel-no-components" and mechanically verified to export zero
 * component-shaped runtime values (spec/storybook-coverage.spec.ts). */
export { EditMarquee } from "./EditMarquee";
export type { EditMarqueeProps } from "./EditMarquee";

export { EditSnapGuide } from "./EditSnapGuide";
export type { EditSnapGuideProps } from "./EditSnapGuide";

export { EditRubberBand } from "./EditRubberBand";
export type { EditRubberBandProps } from "./EditRubberBand";

export { ButtonRow } from "./ButtonRow";

// v0.10: promoted from robot-status-server-app — see the file header above.
export { SignalBars } from "./SignalBars";
export type { SignalBarsProps } from "./SignalBars";

export { ReservedText } from "./ReservedText";
export type { ReservedTextTone, ReservedTextProps } from "./ReservedText";

export { EmptyNote } from "./EmptyNote";

// v0.11: feedback primitives. Both are presentational — the host owns the
// timer and the placement; see each file's header.
export { Spinner } from "./Spinner";
export type { SpinnerProps, SpinnerSize } from "./Spinner";

export { Toast } from "./Toast";
export type { ToastProps, ToastTone } from "./Toast";

// Form & layout primitives (v0.3)
export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { RemovableChip } from "./RemovableChip";

export { Input } from "./Input";
export type { InputProps, InputSize } from "./Input";

// Box-owns-the-chrome search field (ported from the dashboard FilterBar
// prominent-register search box). Label-less by design — see the file
// header for why `ariaLabel` is required and `type` is not a prop.
export { SearchInput } from "./SearchInput";
export type { SearchInputProps, SearchInputSize } from "./SearchInput";

export { Select } from "./Select";
export type { SelectProps, SelectSize } from "./Select";

export { Textarea } from "./Textarea";
export type { TextareaProps } from "./Textarea";

export { Heading } from "./Heading";
export type { HeadingProps, HeadingLevel } from "./Heading";

export { Field } from "./Field";
export type { FieldProps } from "./Field";

export { TextField } from "./TextField";

export { SelectField } from "./SelectField";
export type { SelectOption } from "./SelectField";

export { TextAreaField } from "./TextAreaField";

export { Toolbar } from "./Toolbar";
export type { ToolbarProps, ToolbarAlign } from "./Toolbar";

export { Checkbox } from "./Checkbox";
export type { CheckboxProps } from "./Checkbox";

export { Switch } from "./Switch";
export type { SwitchProps } from "./Switch";

// v0.10: promoted from robot-status-server-app — see the file header above.
// Distinct from Switch — see ToggleSwitch.tsx's header for why both exist.
export { ToggleSwitch } from "./ToggleSwitch";
export type { ToggleSwitchProps } from "./ToggleSwitch";

export { Slider } from "./Slider";
export type { SliderProps } from "./Slider";

// v0.7: synthetic ARIA combobox over an async candidate list. The
// library's only synthetic widget — see the AsyncCombobox exception
// in AGENTS.md and `spec/async-combobox-boundary.spec.ts` for the
// scope. Use this when a `<select>` would break at the data scale
// (server-fetched candidate lists with thousands of rows).
export { AsyncCombobox } from "./AsyncCombobox";
export type {
  AsyncComboboxProps,
  AsyncComboboxOption,
  AsyncComboboxSearchFn,
  AsyncComboboxSize,
} from "./AsyncCombobox";

// Headless race guard AsyncCombobox is built on — see the file header
// for why this now exists as a standalone export (v0.7's internal
// race-guard machinery, previously duplicated by the dashboard's own
// `useResourceCandidates`, is lifted here so both call sites share one
// tested implementation).
export { useAsyncCandidates } from "./useAsyncCandidates";
export type {
  CandidateScheduler,
  UseAsyncCandidatesOptions,
  UseAsyncCandidatesResult,
} from "./useAsyncCandidates";

// Navigation primitives — number-pager (ordinal traversal through one
// dataset's pages) and the shared inline-link appearance (drill-down /
// back-link registers). See each file's header for its dedup notes
// against ButtonRow / Toolbar / TabStrip / Button / StatusBadge.
export { Pager } from "./Pager";
export type { PagerProps, PagerLabels } from "./Pager";

// v1.13: the tab pattern — a panel-less tablist (roving tabindex,
// arrow/Home/End traversal, in-place rename) that view switchers share
// with the strip+panel pair (Tabs). See TabStrip.tsx's file header for
// the dedup note against Pager (ordinal page traversal, not view
// selection) and Toolbar (no selection state at all).
export { TabStrip } from "./TabStrip";
export type { TabStripItem, TabStripEditing } from "./TabStrip";

export { Tabs } from "./Tabs";
export type { TabItem } from "./Tabs";

// Pure page-window math Pager is built on. Exported at the barrel because
// the barrel already exports other lowercase pure helpers this way
// (`pickStageColumns`, `useAsyncCandidates` above) — not a one-off.
export { pageWindow } from "./page-window";

export { LinkAppearance } from "./LinkAppearance";
export type { LinkAppearanceTone, LinkAppearanceProps } from "./LinkAppearance";

// Conversation log primitives (v0.4) — past-tense transcript.
// Use these when rendering a sequence of finalized utterances the user
// can scroll through. For the LIVE 1:n stage, see v0.5 below.
export { MessageBubble } from "./MessageBubble";
export type {
  MessageBubbleProps,
  MessageRole,
  MessageAlign,
} from "./MessageBubble";

export { Transcript } from "./Transcript";
export type { TranscriptProps } from "./Transcript";

export { TypingIndicator } from "./TypingIndicator";
export type { TypingIndicatorProps } from "./TypingIndicator";

export { ToolCallTrace } from "./ToolCallTrace";
export type {
  ToolCallTraceProps,
  ToolCallStatus,
} from "./ToolCallTrace";

export { RealtimeEventLog } from "./RealtimeEventLog";
export type {
  RealtimeEventLogProps,
  RealtimeEventEntry,
} from "./RealtimeEventLog";

// Live conversation primitives (v0.5) — Google Meet 1:n live stage.
// Use these when the surface represents the IN-PROGRESS conversation
// (participant grid, speaking indicators, live caption). For the
// past-tense log, see v0.4 above.
export { ConversationStage, pickStageColumns } from "./ConversationStage";
export type { ConversationStageProps } from "./ConversationStage";

export { ParticipantTile } from "./ParticipantTile";
export type { ParticipantTileProps } from "./ParticipantTile";

export { LiveCaption } from "./LiveCaption";
export type { LiveCaptionProps } from "./LiveCaption";

// Table skin family — a bordered scroller (TableSurface), the <table>
// that owns all descendant skin (Table), a header cell that carries the
// span-vs-button sort rule (TableHeaderCell), a ref-forwarding body row
// (TableRow), a cell (TableCell), and the overflow-notice strip look
// (TableNotice). See Table.tsx's file header for the shape ruling this
// family follows (skin from `.table` down via descendant selectors, so a
// consumer's collection engine can render raw <tr>/<td> DOM underneath it).
export {
  TableSurface,
  Table,
  TableHeaderCell,
  TableRow,
  TableCell,
  TableNotice,
} from "./Table";
export type {
  TableSurfaceProps,
  TableProps,
  TableDensity,
  TableHeaderCellProps,
  TableHeaderCellSort,
  TableSortDirection,
  TableRowProps,
  TableCellProps,
  TableNoticeProps,
} from "./Table";

// v0.18: anchored floating panels — Popover (controlled, free-content,
// role="dialog") and Menu (uncontrolled, role="menu", roving focus). Both
// consume the internal `src/floating/anchoredPanelPosition` core; see each
// file's header for why they are not merged into one component.
export { Popover } from "./Popover";

export { Menu } from "./Menu";
export type { MenuItem, MenuTriggerProps } from "./Menu";

// v0.18: Dialog (native <dialog>, portal, footer/footerStart) and
// ConfirmDialog (a presentational confirm shell composed from Dialog +
// Button — no async lifecycle, toast, or i18n; that stays app-side).
export { Dialog } from "./Dialog";
export type { DialogProps, DialogSize } from "./Dialog";

export { ConfirmDialog } from "./ConfirmDialog";
export type { ConfirmDialogProps } from "./ConfirmDialog";

import "./tokens.css";
