import { memo } from "react";
import type { ResponseLifecycleState, SpeakingTurnState, TranscriptEntry } from "../types/realtime";
import type { VoiceOutputRouting } from "@translator/shared";

interface TranscriptPanelProps {
  transcripts: TranscriptEntry[];
  responseLifecycle: ResponseLifecycleState;
  speakingTurnState: SpeakingTurnState;
  voiceOutputRouting: VoiceOutputRouting;
  voiceRoutingMessage: string | null;
  voicePlaybackState: "idle" | "preparing" | "playing" | "ready" | "fallback_playing" | "failed";
}

export const TranscriptPanel = memo(function TranscriptPanel({
  transcripts,
  responseLifecycle,
  speakingTurnState,
  voiceOutputRouting,
  voiceRoutingMessage,
  voicePlaybackState
}: TranscriptPanelProps) {
  const latestUser = transcripts.find((entry) => entry.role === "user");
  const latestTranslation = transcripts.find((entry) => entry.role === "assistant");

  return (
    <div className="transcript-panel stack">
      <div>
        <h2>Live conversation</h2>
        <div className="call-badges">
          <span className="voice-status pending">response {responseLifecycle}</span>
          <span className="voice-status pending">turn {speakingTurnState}</span>
          <span className={voicePlaybackState === "failed" ? "voice-status missing" : voicePlaybackState === "idle" ? "voice-status pending" : "voice-status ready"}>
            {voicePlaybackState === "preparing"
              ? "voice preparing"
              : voicePlaybackState === "playing"
                ? "cloned audio playing"
                : voicePlaybackState === "fallback_playing"
                  ? "fallback audio playing"
                  : voiceOutputRouting === "cloned_voice"
                    ? "cloned audio ready"
                    : "audio ready"}
          </span>
        </div>
        {voiceRoutingMessage ? <p className="muted voice-route-message">{voiceRoutingMessage}</p> : null}
      </div>

      <div className="translation-pair">
        <article className="transcript-item user">
          <div>
            <strong>What you said</strong>
            {latestUser ? <span className="muted">{latestUser.isFinal ? "final" : "listening"}</span> : null}
          </div>
          <p>{latestUser?.text ?? "Hold the button and speak."}</p>
        </article>

        <article className="transcript-item assistant">
          <div>
            <strong>Translation</strong>
            {latestTranslation ? <span className="muted">{latestTranslation.isFinal ? "final" : "translating"}</span> : null}
          </div>
          <p>{latestTranslation?.text ?? "Your translated output will appear here."}</p>
        </article>
      </div>
    </div>
  );
});
