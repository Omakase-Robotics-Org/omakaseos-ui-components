/**
 * @file Demo harness: render the same library components under two themes.
 *
 * The point is to prove that a single set of components, parameterized only
 * via `--ds-*` tokens, can sit inside two visually distinct host environments
 * — status_server_webui (dark, mono, dense) and source/packages/web (light,
 * sans, airy) — without per-host code branches.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  ButtonRow,
  Card,
  CardHeader,
  Fact,
  FactList,
  StatusBadge,
} from "../src/index";

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
      <hr style={{ border: 0, borderTop: "1px solid var(--ds-border)", margin: "16px 0" }} />
      <ButtonRow>
        <button>Restart</button>
        <button>Stop</button>
        <button>Refresh</button>
      </ButtonRow>
    </Card>
  );
}

function App() {
  return (
    <div className="harness">
      <section className="host host--status-webui" data-theme="dark">
        <h1>host: status_server_webui (dark)</h1>
        <MonitorPanel />
      </section>
      <section className="host host--omks-web">
        <h1>host: @omks-robo/web (light)</h1>
        <MonitorPanel />
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
