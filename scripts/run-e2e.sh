#!/usr/bin/env bash
# Demo-harness e2e runner for @omakase-robotics/ui-components.
#
# Brings up the demo vite dev server on a deterministic port, waits for it
# to listen, runs the Playwright spec against it, and tears the server
# down regardless of pass/fail.
#
# Mirrors the shape of source/scripts/wt-e2e.sh. No throwaway DB; the
# library has no backend.

set -euo pipefail

PORT="${LIB_E2E_PORT:-5198}"
BASE_URL="http://localhost:${PORT}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

VITE_PIDFILE="$(mktemp)"
LOG="$(mktemp)"

cleanup() {
  if [[ -s "$VITE_PIDFILE" ]]; then
    kill "$(cat "$VITE_PIDFILE")" 2>/dev/null || true
  fi
  rm -f "$VITE_PIDFILE"
}
trap cleanup EXIT INT TERM

echo "→ starting vite at $BASE_URL"
(bun run dev --port "$PORT" --strictPort > "$LOG" 2>&1 & echo $! > "$VITE_PIDFILE") &
sleep 1

echo "→ waiting for vite to listen on $BASE_URL"
for _ in $(seq 1 30); do
  if curl -fs -o /dev/null "$BASE_URL/"; then
    break
  fi
  sleep 0.5
done
if ! curl -fs -o /dev/null "$BASE_URL/"; then
  echo "✗ vite did not come up in 15s — last 30 log lines:" >&2
  tail -30 "$LOG" >&2 || true
  exit 2
fi

echo "→ running playwright e2e against $BASE_URL"
LIB_E2E_BASE_URL="$BASE_URL" bun run playwright test --config playwright.config.ts "$@"
