"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { assignProfileClone, createRoom } from "../lib/api";
import { saveRoomSession } from "../lib/session";
import { useAuth } from "../hooks/useAuth";
import { uploadVoiceSampleFromUrl } from "../lib/upload";

export function CreatePresentationRoomForm() {
  const router = useRouter();
  const { user, profile, isFirebaseEnabled } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const preferredLanguage = profile?.preferredLanguage?.trim();

      if (!preferredLanguage) {
        throw new Error("Your profile language is required to create a presentation room.");
      }

      const session = await createRoom({
        name: profile?.name || "Host",
        nativeLanguage: preferredLanguage,
        targetLanguage: preferredLanguage,
        mode: "presentation",
        userId: isFirebaseEnabled ? user?.uid : undefined
      });

      saveRoomSession(session.roomState, session.participant);

      if (profile?.voiceSampleUrl && profile.voiceCloneId) {
        uploadVoiceSampleFromUrl({
          roomId: session.roomState.room.id,
          participantId: session.participant.id,
          voiceSampleUrl: profile.voiceSampleUrl,
          durationSeconds: profile.voiceSampleDuration
        })
          .then(() =>
            assignProfileClone(session.participant.id, {
              providerVoiceId: profile.voiceCloneId!,
              provider: profile.voiceCloneProvider ?? "elevenlabs"
            })
          )
          .catch(() => undefined);
      }

      router.push(`/rooms/${session.roomState.room.id}/waiting?participantId=${session.participant.id}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not create presentation room");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Presentation</p>
        <h1>Create presentation room</h1>
        <p className="lead">Language is pulled from your profile. Audience members will hear the active speaker in their own profile language.</p>
      </div>

      <div className="field">
        <p className="muted">
          Profile language: <strong>{profile?.preferredLanguage ?? "Not set"}</strong>
        </p>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="button-row">
        <button className="button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create presentation room"}
        </button>
      </div>
    </form>
  );
}
