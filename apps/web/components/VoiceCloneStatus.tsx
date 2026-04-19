"use client";

import { useEffect, useState } from "react";
import type { Participant, VoiceCloneStatusResponse } from "@translator/shared";
import { getVoiceCloneStatus, startVoiceClone } from "../lib/api";

interface VoiceCloneStatusProps {
  participant: Participant;
  compact?: boolean;
}

export function VoiceCloneStatus({ participant, compact }: VoiceCloneStatusProps) {
  const [cloneStatus, setCloneStatus] = useState<VoiceCloneStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const refresh = async () => {
    if (participant.voiceProfileStatus === "missing") {
      setCloneStatus(null);
      setError(null);
      return;
    }

    try {
      const response = await getVoiceCloneStatus(participant.id);
      setCloneStatus(response);
      setError(null);
    } catch (caughtError) {
      setCloneStatus(null);
      setError(caughtError instanceof Error ? caughtError.message : "Clone status unavailable");
    }
  };

  useEffect(() => {
    refresh();
    const interval = window.setInterval(() => {
      if (cloneStatus?.voiceProfile.providerStatus === "creating") {
        refresh();
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [participant.id, participant.voiceProfileStatus, cloneStatus?.voiceProfile.providerStatus]);

  const handleStartClone = async () => {
    setIsStarting(true);
    setError(null);

    try {
      setCloneStatus(await startVoiceClone(participant.id));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not start voice clone");
    } finally {
      setIsStarting(false);
    }
  };

  const profile = cloneStatus?.voiceProfile;
  const sampleStatus = cloneStatus?.sampleStatus ?? (participant.voiceProfileStatus === "missing" ? "no_sample" : "uploaded");
  const status = cloneStatus?.cloneStatus ?? profile?.providerStatus ?? "not_started";
  const routing = profile?.outputRouting ?? "fallback_default";
  const ready = status === "ready";
  const eligible = cloneStatus?.eligibleForClone ?? false;
  const reason = cloneStatus?.reason ?? (participant.voiceProfileStatus === "missing" ? "No uploaded voice sample found." : "Checking voice sample eligibility.");
  const sampleReason = profile?.sampleValidationMessage ?? (participant.voiceProfileStatus === "missing" ? "No uploaded voice sample found." : "Checking voice sample eligibility.");
  const duration = cloneStatus?.durationSeconds;
  const minimumRequiredSeconds = cloneStatus?.minimumRequiredSeconds ?? 15;

  const sampleLabel =
    sampleStatus === "ready_for_clone"
      ? "Sample ready for clone"
      : sampleStatus === "too_short"
        ? "Sample too short"
        : sampleStatus === "invalid"
          ? "Sample invalid"
          : sampleStatus === "uploaded"
            ? "Sample uploaded"
            : "No sample uploaded";

  const cloneLabel =
    status === "ready"
      ? "Clone created successfully"
      : status === "creating"
        ? "Creating clone"
        : status === "failed"
          ? "Clone failed"
          : "Clone not started";

  const buttonText =
    participant.voiceProfileStatus === "missing"
      ? "Upload sample first"
      : sampleStatus === "too_short"
        ? "Sample too short"
        : sampleStatus === "invalid" || !eligible
          ? "Sample not eligible"
          : status === "creating"
            ? "Creating clone..."
            : status === "ready"
              ? "Clone ready"
              : "Create voice clone";

  const buttonDisabled =
    isStarting ||
    participant.voiceProfileStatus === "missing" ||
    !eligible ||
    status === "ready" ||
    status === "creating";

  return (
    <div className={compact ? "clone-status compact" : "clone-status"}>
      <div>
        <strong>{participant.name}</strong>
        <span className={ready ? "voice-status ready" : status === "failed" ? "voice-status missing" : "voice-status pending"}>
          {ready ? "clone ready" : status === "creating" ? "clone creating" : status === "failed" ? "clone failed" : "clone not started"}
        </span>
      </div>

      {!compact ? (
        <>
          <div className="voice-step-list">
            <div>
              <span className={eligible ? "voice-status ready" : sampleStatus === "too_short" || sampleStatus === "invalid" ? "voice-status missing" : "voice-status pending"}>
                Step 1: {sampleLabel}
              </span>
              <p className="muted">
                {duration ? `${duration.toFixed(1)}s detected. ` : ""}
                {sampleReason}
              </p>
              <p className="muted">Use 1-2 minutes of clear speech for best results. Minimum: {minimumRequiredSeconds}s.</p>
            </div>
            <div>
              <span className={ready ? "voice-status ready" : status === "failed" ? "voice-status missing" : "voice-status pending"}>
                Step 2: {cloneLabel}
              </span>
              <p className="muted">
                {ready
                  ? "Translated speech can now use this cloned voice."
                  : status === "creating"
                    ? "Clone creation is processing."
                    : status === "failed"
                      ? reason
                    : routing === "cloned_voice"
                      ? "Cloned voice routing is available."
                      : "Fallback/default voice remains available."}
              </p>
            </div>
          </div>
          {profile?.errorMessage ? <p className="muted">{profile.errorMessage}</p> : null}
          {error ? <div className="error">{error}</div> : null}
          <button className="button secondary" type="button" onClick={handleStartClone} disabled={buttonDisabled}>
            {isStarting ? "Starting..." : buttonText}
          </button>
        </>
      ) : null}
    </div>
  );
}
