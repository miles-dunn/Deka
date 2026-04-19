import type { Participant } from "@translator/shared";

interface VoiceProfileStatusProps {
  participant: Participant;
}

export function VoiceProfileStatus({ participant }: VoiceProfileStatusProps) {
  const isUploaded = participant.voiceProfileStatus === "uploaded" || participant.voiceProfileStatus === "ready";

  return (
    <span className={isUploaded ? "voice-status ready" : "voice-status missing"}>
      {isUploaded ? "Voice sample uploaded" : "Voice sample needed"}
    </span>
  );
}
