"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assignProfileClone, createRoom } from "../lib/api";
import { saveRoomSession } from "../lib/session";
import { useAuth } from "../hooks/useAuth";
import { uploadVoiceSampleFromUrl } from "../lib/upload";
import { TargetLanguageField } from "./LanguageFields";

export function CreateRoomForm() {
  const router = useRouter();
  const { user, profile, isFirebaseEnabled } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const session = await createRoom({
        name: profile?.name || String(formData.get("name") ?? ""),
        nativeLanguage: profile?.preferredLanguage || String(formData.get("nativeLanguage") ?? ""),
        targetLanguage: String(formData.get("targetLanguage") ?? ""),
        mode: "conversation",
        userId: isFirebaseEnabled ? user?.uid : undefined
      });

      saveRoomSession(session.roomState, session.participant);

      // Upload sample and assign the existing profile clone — no re-cloning needed
      if (profile?.voiceSampleUrl && profile.voiceCloneId) {
        uploadVoiceSampleFromUrl({
          roomId: session.roomState.room.id,
          participantId: session.participant.id,
          voiceSampleUrl: profile.voiceSampleUrl,
          durationSeconds: profile.voiceSampleDuration,
        })
          .then(() => assignProfileClone(session.participant.id, {
            providerVoiceId: profile.voiceCloneId!,
            provider: profile.voiceCloneProvider ?? "elevenlabs",
          }))
          .catch(() => undefined); // WaitingRoomClient will retry if this fails
      }

      router.push(`/rooms/${session.roomState.room.id}/waiting?participantId=${session.participant.id}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not create room");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">New room</p>
        <h1>Start a conversation</h1>
        <p className="lead">Create a one-on-one room and choose the language you want translated output in.</p>
      </div>

      {profile && (
        <div className="field">
          <p className="muted">
            Your native language: <strong>{profile.preferredLanguage}</strong>
          </p>
        </div>
      )}

      <TargetLanguageField disabled={isSubmitting} />

      {error ? <div className="error">{error}</div> : null}

      <div className="button-row">
        <button className="button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create room"}
        </button>
        <Link className="button secondary" href="/presentation/create">
          Create presentation room
        </Link>
      </div>
    </form>
  );
}
