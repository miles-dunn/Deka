import type { Participant, ParticipantReadiness, ReadinessRequirement, RoomReadiness } from "@translator/shared";
import type { RoomRecord } from "./room.store";

const hasLanguageSelections = (participant: Participant) =>
  participant.nativeLanguage.trim().length > 0 && participant.targetLanguage.trim().length > 0;

const hasVoiceSample = (participant: Participant) =>
  participant.voiceProfileStatus === "uploaded" || participant.voiceProfileStatus === "ready";

export const evaluateParticipantReadiness = (participant: Participant): ParticipantReadiness => {
  const missingRequirements: ReadinessRequirement[] = [];
  const connected = participant.connectionStatus === "online";
  const languagesSelected = hasLanguageSelections(participant);
  const voiceSampleUploaded = hasVoiceSample(participant);
  const headphonesConfirmed = participant.headphoneConfirmed;

  if (!connected) {
    missingRequirements.push("connected");
  }

  if (!languagesSelected) {
    missingRequirements.push("languages_selected");
  }

  if (!headphonesConfirmed) {
    missingRequirements.push("headphones_confirmed");
  }

  return {
    participantId: participant.id,
    connected,
    languagesSelected,
    voiceSampleUploaded,
    headphonesConfirmed,
    ready: missingRequirements.length === 0,
    missingRequirements
  };
};

export const evaluateRoomReadiness = (record: RoomRecord): RoomReadiness => {
  const participants = Array.from(record.participants.values());
  const participantReadiness = participants.map(evaluateParticipantReadiness);
  const missingRequirements: ReadinessRequirement[] = [];

  if (record.room.mode === "conversation") {
    if (participants.length !== 2) {
      missingRequirements.push("two_participants");
    }

    for (const participant of participantReadiness) {
      for (const requirement of participant.missingRequirements) {
        if (!missingRequirements.includes(requirement)) {
          missingRequirements.push(requirement);
        }
      }
    }

    const ready = participants.length === 2 && participantReadiness.length === 2 && participantReadiness.every((participant) => participant.ready);

    return {
      ready,
      canStart: ready && record.room.status !== "active",
      missingRequirements,
      participants: participantReadiness
    };
  }

  const activeSpeakerId = record.room.activeSpeakerParticipantId;
  const activeSpeakerReadiness = activeSpeakerId ? participantReadiness.find((item) => item.participantId === activeSpeakerId) : undefined;

  if (!activeSpeakerId || !activeSpeakerReadiness) {
    missingRequirements.push("active_speaker_assigned");
  } else if (!activeSpeakerReadiness.ready) {
    missingRequirements.push("active_speaker_ready");
  }

  const ready = Boolean(activeSpeakerReadiness?.ready);

  return {
    ready,
    canStart: ready && record.room.status !== "active",
    missingRequirements,
    participants: participantReadiness
  };
};
