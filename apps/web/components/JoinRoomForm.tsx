"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assignProfileClone, joinRoom } from "../lib/api";
import { saveRoomSession } from "../lib/session";
import { useAuth } from "../hooks/useAuth";
import { uploadVoiceSampleFromUrl } from "../lib/upload";
import { TargetLanguageField } from "./LanguageFields";

export function JoinRoomForm() {
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
      const session = await joinRoom({
        code: String(formData.get("code") ?? ""),
        name: profile?.name || String(formData.get("name") ?? ""),
        nativeLanguage: profile?.preferredLanguage || String(formData.get("nativeLanguage") ?? ""),
        targetLanguage: String(formData.get("targetLanguage") ?? ""),
        userId: isFirebaseEnabled ? user?.uid : undefined
      });

      saveRoomSession(session.roomState, session.participant);

      // Upload sample and assign existing profile clone in background
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
          .catch(() => undefined);
      }

      router.push(`/rooms/${session.roomState.room.id}/waiting?participantId=${session.participant.id}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not join room");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Join room</p>
        <h1>Join a conversation</h1>
        <p className="lead">Enter the room code and choose the language you want translated output in.</p>
      </div>

      <div className="field">
        <label htmlFor="code">Room code</label>
        <input id="code" name="code" autoCapitalize="characters" required disabled={isSubmitting} />
      </div>

      {!user && (
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input id="name" name="name" required disabled={isSubmitting} placeholder="Enter your name" />
        </div>
      )}

      {profile ? (
        <div className="field">
          <p className="muted">
            Your native language: <strong>{profile.preferredLanguage}</strong>
          </p>
        </div>
      ) : (
        <div className="field">
          <label htmlFor="nativeLanguage">Your language</label>
          <select id="nativeLanguage" name="nativeLanguage" required disabled={isSubmitting} defaultValue="">
            <option value="" disabled>Select a language</option>
            {["English", "Spanish", "French", "German", "Portuguese", "Italian", "Japanese", "Korean", "Chinese (Mandarin)", "Arabic", "Russian", "Hindi"].map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
      )}

      <TargetLanguageField disabled={isSubmitting} />

      {error ? <div className="error">{error}</div> : null}

      <div className="button-row">
        <button className="button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Joining..." : "Join room"}
        </button>
        <Link className="button secondary" href="/presentation/join">
          Join presentation room
        </Link>
      </div>
    </form>
  );
}
