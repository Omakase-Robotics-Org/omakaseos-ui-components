import { useVoiceState } from '@assistant-ui/react';
import { FC } from 'react';
export type VoiceOrbState = "idle" | "connecting" | "listening" | "speaking" | "muted";
export type VoiceOrbVariant = "default" | "blue" | "violet" | "emerald";
export type VoiceOrbProps = {
    state?: VoiceOrbState;
    variant?: VoiceOrbVariant;
    className?: string;
};
export declare function deriveVoiceOrbState(voiceState: ReturnType<typeof useVoiceState>): VoiceOrbState;
export declare const VoiceOrb: FC<VoiceOrbProps>;
export declare const VoiceControl: FC<{
    className?: string;
}>;
export declare const VoiceStatusDot: FC;
export declare const VoiceConnectButton: FC;
export declare const VoiceMuteButton: FC;
export declare const VoiceDisconnectButton: FC;
