import type { Participant } from "@translator/shared";

interface ActiveSpeakerBannerProps {
  activeSpeaker: Participant | undefined;
  isYou: boolean;
}

export function ActiveSpeakerBanner({ activeSpeaker, isYou }: ActiveSpeakerBannerProps) {
  return (
    <section className="panel presentation-speaker-banner">
      <p className="eyebrow">Active speaker</p>
      <h2>{activeSpeaker ? activeSpeaker.name : "No active speaker yet"}</h2>
      {activeSpeaker ? (
        <p className="muted">
          {activeSpeaker.nativeLanguage} to {activeSpeaker.targetLanguage}
          {isYou ? " - You have the floor." : ""}
        </p>
      ) : (
        <p className="muted">Host can assign a speaker when requests come in.</p>
      )}
    </section>
  );
}
