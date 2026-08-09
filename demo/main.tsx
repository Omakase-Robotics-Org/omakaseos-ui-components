/**
 * @file Demo harness: render the same library components under two themes.
 *
 * The point is to prove that a single set of components, parameterized only
 * via `--ds-*` tokens, can sit inside two visually distinct host environments
 * — status_server_webui (dark, mono, dense) and source/packages/web (light,
 * sans, airy) — without per-host code branches.
 *
 * The basics demo (BasicsPanel) places every v0.3 control under deliberately
 * adverse layout conditions:
 *   - Toolbar with a flex-grow Input next to fixed-width Buttons + Switch
 *   - Heading with a long unbroken token to verify it wraps inside a
 *     narrow parent rather than overflowing
 *   - Select with a long option label to verify ellipsis in the closed state
 *   - Checkbox / Switch / Slider with labels longer than their flex cell
 *     to verify min-width: 0 + ellipsis truncate the LABEL, not push the
 *     control out of view
 */
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Button,
  ButtonRow,
  Card,
  CardHeader,
  Checkbox,
  ConversationStage,
  Fact,
  FactGrid,
  FactList,
  Heading,
  Input,
  LiveCaption,
  MessageBubble,
  Panel,
  ParticipantTile,
  RealtimeEventLog,
  ReservedText,
  Select,
  SignalBars,
  Slider,
  Spinner,
  StatusBadge,
  Switch,
  Textarea,
  Toast,
  ToggleSwitch,
  ToolCallTrace,
  Toolbar,
  Transcript,
  TypingIndicator,
} from "../src/index";
import type { BadgeTone, RealtimeEventEntry } from "../src/index";

import "./hosts.css";

function MonitorPanel() {
  return (
    <Card>
      <CardHeader
        title="Robot State"
        hint="last update: 2s ago"
        right={<StatusBadge tone="success" pulse>Live</StatusBadge>}
      />
      <FactList>
        <Fact label="Name">
          <StatusBadge tone="info" size="sm">G1-042</StatusBadge>
        </Fact>
        <Fact label="Connection">
          <StatusBadge tone="success">Connected</StatusBadge>
        </Fact>
        <Fact label="Battery">
          <StatusBadge tone="warning">38%</StatusBadge>
        </Fact>
        <Fact label="Posture">Standing</Fact>
      </FactList>
    </Card>
  );
}

const LONG_VALUE =
  "a-very-long-search-query-that-would-otherwise-overflow-the-toolbar-and-push-the-buttons-out-of-view-and-also-keep-going";

const LONG_HEADING =
  "Robot configuration for THIS_IS_A_VERY_LONG_UNBROKEN_IDENTIFIER_THAT_SHOULD_WRAP_INSIDE_THE_CARD";

const LONG_OPTION =
  "Option with a label far longer than the select control width — must ellipsize";

function BasicsPanel() {
  const [searchValue, setSearchValue] = useState(LONG_VALUE);
  const [textareaValue, setTextareaValue] = useState(
    "Multi-line note. Long line below to verify wrap, not horizontal overflow:\nLOREMIPSUMDOLORSITAMETCONSECTETURADIPISCINGELITSEDDOEIUSMODTEMPOR",
  );
  const [accept, setAccept] = useState(true);
  const [autosave, setAutosave] = useState(false);
  const [volume, setVolume] = useState(60);
  const [region, setRegion] = useState("ja");

  return (
    <Card>
      <CardHeader title="Form basics (v0.3)" hint="overflow stress test" />
      <Heading level={2} data-testid="long-heading">
        {LONG_HEADING}
      </Heading>
      <Toolbar
        ariaLabel="filters"
        align="start"
      >
        <div data-grow="true" data-testid="toolbar-grow">
          <Input
            aria-label="search"
            placeholder="search…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
        <Button variant="primary" data-testid="toolbar-primary">Apply</Button>
        <Button>Clear</Button>
        <Switch
          id="autosave"
          label="Autosave"
          checked={autosave}
          onChange={(e) => setAutosave(e.target.checked)}
        />
      </Toolbar>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <span style={{ display: "grid", gap: 4 }}>
          <label style={{ fontSize: 12, color: "var(--ds-text-muted)" }} htmlFor="region">
            Region
          </label>
          <Select
            id="region"
            aria-label="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            data-testid="long-option-select-inner"
          >
            <option value="jp">日本</option>
            <option value="us">United States</option>
            <option value="long">{LONG_OPTION}</option>
          </Select>
        </span>

        <span style={{ display: "grid", gap: 4 }}>
          <label style={{ fontSize: 12, color: "var(--ds-text-muted)" }} htmlFor="notes">
            Notes
          </label>
          <Textarea
            id="notes"
            value={textareaValue}
            onChange={(e) => setTextareaValue(e.target.value)}
          />
        </span>

        <div data-testid="long-checkbox">
          <Checkbox
            id="accept"
            label="I accept the terms (with a long label that will truncate inside narrow parents)"
            checked={accept}
            onChange={(e) => setAccept(e.target.checked)}
          />
        </div>

        <Slider
          id="vol"
          label="Volume"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
        <span style={{ fontSize: 12, color: "var(--ds-text-muted)" }}>
          {volume}%
        </span>
      </div>

      <hr style={{ border: 0, borderTop: "1px solid var(--ds-border)", margin: "16px 0" }} />
      <ButtonRow>
        <Button variant="primary">Save</Button>
        <Button>Cancel</Button>
        <Button variant="ghost">Reset</Button>
        <Button variant="danger">Delete</Button>
      </ButtonRow>
    </Card>
  );
}

const LONG_ASSISTANT_TEXT =
  "Sure — to summarize: SUPERCALIFRAGILISTICEXPIALIDOCIOUS_BUT_WITH_AN_EVEN_LONGER_UNBROKEN_TOKEN_THAT_MUST_WRAP_INSIDE_THE_BUBBLE rather than overflow it. Also: line breaks\nshould be preserved.";

const REALTIME_EVENTS: RealtimeEventEntry[] = [
  { id: "evt-1", type: "session.created", at: "12:00:00.001" },
  { id: "evt-2", type: "conversation.item.added", at: "12:00:00.123", summary: "user: where's the manual?" },
  { id: "evt-3", type: "response.created", at: "12:00:00.130" },
  { id: "evt-4", type: "response.output_text.delta", at: "12:00:00.150", summary: '"Sure"' },
  { id: "evt-5", type: "response.output_text.delta", at: "12:00:00.180", summary: '" — to"' },
  { id: "evt-6", type: "response.output_audio_transcript.delta", at: "12:00:00.200" },
  { id: "evt-7", type: "response.function_call_arguments.delta", at: "12:00:00.260", summary: "search_inventory({" },
  { id: "evt-8", type: "response.function_call_arguments.done", at: "12:00:00.310", summary: "search_inventory(...) finalized" },
  { id: "evt-9", type: "response.done", at: "12:00:00.420" },
  { id: "evt-10", type: "error", at: "12:00:01.000", summary: "rate_limit_exceeded — see retry-after" },
];

function RealtimeChatPanel() {
  return (
    <Card>
      <CardHeader title="Realtime conversation (v0.4)" hint="OpenAI Realtime event stream" />
      <Transcript ariaLabel="conversation" data-testid="realtime-transcript">
        <MessageBubble role="system" timestamp="12:00:00.001" data-testid="bubble-system">
          Session started — model gpt-4o-realtime
        </MessageBubble>
        <MessageBubble role="user" timestamp="12:00:00.123" data-testid="bubble-user">
          Where is the operator manual for G1-042?
        </MessageBubble>
        <MessageBubble role="assistant" timestamp="12:00:00.420" data-testid="bubble-assistant-long">
          {LONG_ASSISTANT_TEXT}
        </MessageBubble>
        <MessageBubble role="assistant" streaming data-testid="bubble-streaming">
          The model is mid-utterance and will append more
        </MessageBubble>
        <ToolCallTrace
          name="search_inventory"
          args={{ q: "manual G1-042", limit: 3 }}
          status="succeeded"
          result={<span>found 3 documents</span>}
          data-testid="tool-trace"
        />
        <MessageBubble role="tool" timestamp="12:00:00.500" data-testid="bubble-tool">
          tool_result: 3 docs returned, top match score 0.91
        </MessageBubble>
        <MessageBubble role="system" tone="danger" data-testid="bubble-error">
          error: rate_limit_exceeded — retry after 1.5s
        </MessageBubble>
      </Transcript>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: "var(--ds-text-muted)" }}>
          assistant is preparing:
        </span>
        <TypingIndicator role="assistant" data-testid="typing" />
      </div>
      <hr style={{ border: 0, borderTop: "1px solid var(--ds-border)", margin: "16px 0" }} />
      <Heading level={3}>Event log</Heading>
      <RealtimeEventLog entries={REALTIME_EVENTS} data-testid="event-log" />
    </Card>
  );
}

function LiveStagePanel() {
  // 1:n live conversation — Google Meet aesthetic. 4 participants so the
  // grid lands on a 2-col layout (pickStageColumns(4) === 2). The "Bot"
  // participant is the speaker; the operator is also connected; one robot
  // is connected; one is dropped (data-connected=false).
  return (
    <Card>
      <CardHeader title="Live conversation (v0.5)" hint="Google Meet 1:n stage" />
      <ConversationStage
        ariaLabel="demo-live-stage"
        tileCount={4}
        data-testid="demo-stage"
        tiles={[
          <ParticipantTile
            key="op"
            name="Operator"
            role="user"
            connected
            avatar={<span style={{ fontSize: 28, fontWeight: 600 }}>OP</span>}
            data-testid="tile-operator"
          />,
          <ParticipantTile
            key="bot"
            name="Robotics Agent"
            role="assistant"
            speaking
            connected
            avatar={<span style={{ fontSize: 28, fontWeight: 600 }}>RA</span>}
            data-testid="tile-bot"
          />,
          <ParticipantTile
            key="g1"
            name="G1-042"
            role="tool"
            connected
            avatar={<span style={{ fontSize: 28, fontWeight: 600 }}>G1</span>}
            hint={<>online</>}
            data-testid="tile-robot"
          />,
          <ParticipantTile
            key="g2"
            name="G1-043 (dropped)"
            role="tool"
            connected={false}
            avatar={<span style={{ fontSize: 28, fontWeight: 600 }}>G1</span>}
            hint={<>reconnecting</>}
            data-testid="tile-robot-dropped"
          />,
        ]}
        caption={
          <LiveCaption
            speaker="Robotics Agent"
            role="assistant"
            text="Looking up the manual for G1-042 and the operator can also see it on their tablet now."
            streaming
            data-testid="demo-caption"
          />
        }
      />
    </Card>
  );
}

/** ToggleSwitch (v0.10) — on / off / disabled, the three states every
 * feature-flag call site on the robot console needs. */
function ToggleSwitchDemo() {
  const [gestureOn, setGestureOn] = useState(true);
  const [autopilotOff, setAutopilotOff] = useState(false);
  return (
    <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
      <span
        data-testid="toggle-on"
        style={{ display: "grid", gap: 4, justifyItems: "center", fontSize: 11, color: "var(--ds-text-muted)" }}
      >
        <ToggleSwitch checked={gestureOn} onChange={setGestureOn} ariaLabel="Gesture mode" />
        on
      </span>
      <span
        data-testid="toggle-off"
        style={{ display: "grid", gap: 4, justifyItems: "center", fontSize: 11, color: "var(--ds-text-muted)" }}
      >
        <ToggleSwitch checked={autopilotOff} onChange={setAutopilotOff} ariaLabel="Autopilot" />
        off
      </span>
      <span
        data-testid="toggle-disabled"
        style={{ display: "grid", gap: 4, justifyItems: "center", fontSize: 11, color: "var(--ds-text-muted)" }}
      >
        <ToggleSwitch checked disabled onChange={() => {}} ariaLabel="Locked feature" />
        disabled
      </span>
    </div>
  );
}

const SIGNAL_LEVELS: ReadonlyArray<{ testid: string; label: string; signal: number }> = [
  { testid: "signalbars-zero", label: "0%", signal: 0 },
  { testid: "signalbars-low", label: "25%", signal: 25 },
  { testid: "signalbars-mid", label: "50%", signal: 50 },
  { testid: "signalbars-high", label: "75%", signal: 75 },
  { testid: "signalbars-full", label: "100%", signal: 100 },
];

/** SignalBars (v0.10) — every threshold crossing (0/1/2/3/4 active bars),
 * plus the "unknown" contract: the source app's callers render nothing at
 * all rather than asking this component to guess. */
function SignalBarsDemo() {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
      {SIGNAL_LEVELS.map((level) => (
        <div
          key={level.testid}
          data-testid={level.testid}
          style={{ display: "grid", gap: 4, justifyItems: "center" }}
        >
          <SignalBars signal={level.signal} />
          <span style={{ fontSize: 11, color: "var(--ds-text-muted)" }}>{level.label}</span>
        </div>
      ))}
      <div data-testid="signalbars-unknown" style={{ display: "grid", gap: 4, justifyItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--ds-text-muted)" }}>—</span>
        <span style={{ fontSize: 11, color: "var(--ds-text-muted)" }}>unknown</span>
      </div>
    </div>
  );
}

/** ReservedText (v0.10) — with and without content, side by side. The
 * point of this primitive is that these two boxes are the same height. */
function ReservedTextDemo() {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div data-testid="reserved-text-empty">
        <ReservedText tone="muted" />
      </div>
      <div data-testid="reserved-text-filled">
        <ReservedText tone="warning">Guard rejected: arm is outside the safety envelope.</ReservedText>
      </div>
    </div>
  );
}

function RobotConsolePrimitivesPanel() {
  return (
    <Card>
      <CardHeader
        title="Robot console primitives (v0.10)"
        hint="promoted from robot-status-server-app"
      />
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <Heading level={3}>ToggleSwitch</Heading>
          <ToggleSwitchDemo />
        </div>
        <div>
          <Heading level={3}>SignalBars</Heading>
          <SignalBarsDemo />
        </div>
        <div>
          <Heading level={3}>ReservedText</Heading>
          <ReservedTextDemo />
        </div>
      </div>
    </Card>
  );
}

/** Spinner (v0.11) — the three sizes (a real browser is the only place the
 * diameters and the rotation exist), the tone vocabulary, and the default
 * head that inherits the surrounding ink. */
function SpinnerDemo() {
  return (
    <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
      {(["sm", "md", "lg"] as const).map((size) => (
        <span
          key={size}
          data-testid={`spinner-${size}`}
          style={{ display: "grid", gap: 4, justifyItems: "center", fontSize: 11, color: "var(--ds-text-muted)" }}
        >
          <Spinner size={size} />
          {size}
        </span>
      ))}
      <span
        data-testid="spinner-tone-success"
        style={{ display: "grid", gap: 4, justifyItems: "center", fontSize: 11, color: "var(--ds-text-muted)" }}
      >
        <Spinner size="lg" tone="success" ariaLabel="Recording the map" />
        wizard ring
      </span>
      <span
        data-testid="spinner-inherit"
        style={{
          display: "grid",
          gap: 4,
          justifyItems: "center",
          fontSize: 11,
          color: "var(--ds-tone-danger-fg)",
        }}
      >
        <Spinner />
        currentColor
      </span>
    </div>
  );
}

const TOAST_TONES: ReadonlyArray<{ tone: BadgeTone; message: string }> = [
  { tone: "success", message: "Command accepted." },
  { tone: "warning", message: "Navigation accepted in degraded mode." },
  { tone: "danger", message: "Map switch failed: recording is still running." },
  { tone: "info", message: "Map switched to floor 2." },
  { tone: "neutral", message: "Nothing to report." },
];

/** Toast (v0.11) — one card per register, plus the closed state. The card
 * does not position itself: here it sits in normal flow, which is what a
 * host viewport element stacks. */
function ToastDemo() {
  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
      {TOAST_TONES.map(({ tone, message }) => (
        <span key={tone} data-testid={`toast-${tone}`}>
          <Toast tone={tone}>{message}</Toast>
        </span>
      ))}
      <span data-testid="toast-closed">
        <Toast tone="info" open={false}>
          Dismissed — faded out, and no longer in the way of a click.
        </Toast>
      </span>
    </div>
  );
}

/** StatusBadge's opt-in live region (v0.11) next to the default badge:
 * same markup, one of them a `role="status"` because its value changes. */
function StatusBadgeSemanticsDemo() {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <span data-testid="badge-plain">
        <StatusBadge tone="neutral">G1-042</StatusBadge>
      </span>
      <span data-testid="badge-live">
        <StatusBadge tone="danger" live pulse>
          Disconnected
        </StatusBadge>
      </span>
    </div>
  );
}

function FeedbackPrimitivesPanel() {
  return (
    <Card>
      <CardHeader
        title="Feedback primitives (v0.11)"
        hint="host owns the timer and the placement"
      />
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <Heading level={3}>Spinner</Heading>
          <SpinnerDemo />
        </div>
        <div>
          <Heading level={3}>Toast</Heading>
          <ToastDemo />
        </div>
        <div>
          <Heading level={3}>StatusBadge semantics</Heading>
          <StatusBadgeSemanticsDemo />
        </div>
      </div>
    </Card>
  );
}

const TILE_FACTS: ReadonlyArray<{ label: string; value: string; small?: boolean }> = [
  { label: "Battery", value: "38%" },
  { label: "Uptime", value: "14:32" },
  { label: "Pose x", value: "1.204 m", small: true },
  { label: "Root", value: "/var/lib/omakase/recordings", small: true },
];

/** Panel (v0.11) in the layout it exists for — a grid of peer sections,
 * one of them spanning every column — with the FactGrid tile pattern
 * inside it. Both are only really visible in a real browser: a grid span
 * and a two-column track have no meaning in jsdom. */
function PanelGridDemo({ host }: { host: string }) {
  return (
    <div
      data-testid="panel-grid"
      style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}
    >
      {/* The anchor id is per host: the harness renders this section twice,
          and a document may only contain each id once. */}
      <Panel title="Robot state" id={`${host}-robot-state`}>
        <div data-testid="fact-grid">
          <FactGrid>
            {TILE_FACTS.map((fact) => (
              <Fact
                key={fact.label}
                label={fact.label}
                direction="column"
                size={fact.small ? "sm" : "md"}
              >
                {fact.value}
              </Fact>
            ))}
          </FactGrid>
        </div>
      </Panel>
      <Panel title="Network" headerRight={<StatusBadge tone="success">online</StatusBadge>}>
        <FactList>
          <Fact label="SSID">omakase-5g</Fact>
          <Fact label="Signal">
            <SignalBars signal={75} />
          </Fact>
        </FactList>
      </Panel>
      <Panel title="Teleop session" fullWidth headerRight={<Spinner size="sm" tone="info" />}>
        A panel that spans every column of the grid it sits in.
      </Panel>
      {/* v0.12 "elevation is not nested": the two cards below are written
          exactly like the bare one outside the grid — same call shape, no prop
          — and the ancestor rule drops their shadow and steps their border down
          because they sit in a panel body. Only a real browser can show it, so
          the pair (nested vs bare) is what spec/elevation-nesting.e2e.spec.ts
          measures. */}
      {/* One cell of the grid, not fullWidth — that is the shape the rule was
          measured in (the dashboard's conversation-state panel is a grid cell),
          and the spanning panel above stays the grid's only one. */}
      <Panel title="Conversation state">
        <div style={{ display: "grid", gap: 12 }}>
          <div data-testid="nested-card-first">
            <Card title="Prompt">The card a panel body holds: grouping, not elevation.</Card>
          </div>
          <div data-testid="nested-card-second">
            <Card>
              <CardHeader title="Turn" hint="last update: 2s ago" />
              A second grouping in the same section.
            </Card>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function PageSectionsPanel({ host }: { host: string }) {
  return (
    <Card>
      <CardHeader
        title="Page sections (v0.11)"
        hint="Panel + FactGrid — the robot console's screen composition, with v0.12's nested-card rule"
      />
      <PanelGridDemo host={host} />
      {/* The control for the nested pair above: the same card, same call shape,
          outside any panel body — it keeps its shadow and its --ds-border. */}
      <div data-testid="bare-card" style={{ marginTop: 16 }}>
        <Card title="Prompt">The card a page holds directly: still elevated.</Card>
      </div>
    </Card>
  );
}

function App() {
  return (
    <div className="harness">
      <section className="host host--status-webui" data-theme="dark">
        <h1>host: status_server_webui (dark)</h1>
        <MonitorPanel />
        <BasicsPanel />
        <RealtimeChatPanel />
        <LiveStagePanel />
        <RobotConsolePrimitivesPanel />
        <FeedbackPrimitivesPanel />
        <PageSectionsPanel host="status-webui" />
      </section>
      <section className="host host--omks-web">
        <h1>host: @omks-robo/web (light)</h1>
        <MonitorPanel />
        <BasicsPanel />
        <RealtimeChatPanel />
        <LiveStagePanel />
        <RobotConsolePrimitivesPanel />
        <FeedbackPrimitivesPanel />
        <PageSectionsPanel host="omks-web" />
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
