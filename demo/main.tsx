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
  Fact,
  FactList,
  Heading,
  Input,
  MessageBubble,
  RealtimeEventLog,
  Select,
  Slider,
  StatusBadge,
  Switch,
  Textarea,
  ToolCallTrace,
  Toolbar,
  Transcript,
  TypingIndicator,
} from "../src/index";
import type { RealtimeEventEntry } from "../src/index";

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

function App() {
  return (
    <div className="harness">
      <section className="host host--status-webui" data-theme="dark">
        <h1>host: status_server_webui (dark)</h1>
        <MonitorPanel />
        <BasicsPanel />
        <RealtimeChatPanel />
      </section>
      <section className="host host--omks-web">
        <h1>host: @omks-robo/web (light)</h1>
        <MonitorPanel />
        <BasicsPanel />
        <RealtimeChatPanel />
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
