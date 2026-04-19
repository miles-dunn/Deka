import type { StoredVoiceProfile } from "./voice.types";

const profilesByParticipantId = new Map<string, StoredVoiceProfile>();
const profilesById = new Map<string, StoredVoiceProfile>();

export const saveVoiceProfile = (profile: StoredVoiceProfile) => {
  const previousProfile = profilesByParticipantId.get(profile.participantId);

  if (previousProfile) {
    profilesById.delete(previousProfile.id);
  }

  profilesByParticipantId.set(profile.participantId, profile);
  profilesById.set(profile.id, profile);
};

export const getVoiceProfileByParticipantId = (participantId: string) => profilesByParticipantId.get(participantId) ?? null;

export const updateVoiceProfile = (participantId: string, updater: (profile: StoredVoiceProfile) => StoredVoiceProfile) => {
  const profile = profilesByParticipantId.get(participantId);

  if (!profile) {
    return null;
  }

  const nextProfile = updater(profile);
  profilesByParticipantId.set(participantId, nextProfile);
  profilesById.set(nextProfile.id, nextProfile);

  return nextProfile;
};
