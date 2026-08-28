/**
 * @file Storybook stories for the voice surface (`VoiceOrb`, `VoiceControl`,
 * `VoiceStatusDot`, `VoiceConnectButton`, `VoiceMuteButton`,
 * `VoiceDisconnectButton`).
 *
 * `VoiceOrb` calls `useVoiceState()` unconditionally even when a `state`
 * prop is supplied, and `VoiceControl` reads `useVoiceControls()` /
 * `useVoiceState()` — both need an `AssistantRuntimeProvider` ancestor with
 * a `voice` adapter registered, confirmed by reading `src/aui/voice.tsx`
 * and matching `demo/aui-main.tsx`'s `ThreadVoiceScene`. `createFakeVoiceAdapter`
 * (`AuiStoryStage.tsx`) is a synchronous, network-free `RealtimeVoiceAdapter`
 * — no microphone, no WebRTC.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { VoiceControl, VoiceOrb } from "./voice";
import type { VoiceOrbState } from "./voice";
import { AuiThreadStage, createFakeVoiceAdapter } from "./AuiStoryStage";

const VOICE_ORB_STATES: VoiceOrbState[] = ["idle", "connecting", "listening", "speaking", "muted"];

function ControlPreview() {
  return (
    <AuiThreadStage messages={[]} height={120} voice={createFakeVoiceAdapter()}>
      <VoiceControl />
    </AuiThreadStage>
  );
}

function OrbStatesPreview() {
  return (
    <AuiThreadStage messages={[]} height={220} voice={createFakeVoiceAdapter()}>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {VOICE_ORB_STATES.map((state) => (
          <figure key={state} style={{ margin: 0, textAlign: "center" }}>
            <div style={{ width: 96, height: 96 }}>
              <VoiceOrb state={state} />
            </div>
            <figcaption>{state}</figcaption>
          </figure>
        ))}
      </div>
    </AuiThreadStage>
  );
}

const meta = {
  title: "Aui/Voice",
  component: ControlPreview,
  tags: ["autodocs"],
} satisfies Meta<typeof ControlPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Control: Story = {};

export const OrbStates: StoryObj<typeof OrbStatesPreview> = {
  render: () => <OrbStatesPreview />,
};
