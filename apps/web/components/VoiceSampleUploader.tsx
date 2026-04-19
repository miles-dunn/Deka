"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { VoiceProfileResponse, VoiceProfileUploadResponse, VoiceSampleStatus } from "@translator/shared";
import { getVoiceProfile, uploadVoiceSample } from "../lib/upload";

interface VoiceSampleUploaderProps {
  roomId: string;
  participantId: string;
  onUploaded: (response: VoiceProfileUploadResponse) => void;
}

type UploadState = "idle" | "recording" | "ready" | "uploading" | "success" | "failed";

export function VoiceSampleUploader({ roomId, participantId, onUploaded }: VoiceSampleUploaderProps) {
  const [audio, setAudio] = useState<File | Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<VoiceProfileResponse | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const canRecord = typeof window !== "undefined" && Boolean(navigator.mediaDevices && window.MediaRecorder);

  const voiceReady = profile?.voiceReady || state === "success";
  const sampleStatus = profile?.sampleStatus ?? "no_sample";
  const minimumRequiredSeconds = profile?.minimumRequiredSeconds ?? 15;
  const eligibleForClone = profile?.eligibleForClone ?? false;

  const sampleStatusText: Record<VoiceSampleStatus, string> = {
    no_sample: "No sample uploaded.",
    uploaded: "Voice sample uploaded successfully, but clone eligibility needs a clearer recording.",
    invalid: "Voice sample is invalid.",
    too_short: "Voice sample uploaded successfully, but it is too short for cloning.",
    ready_for_clone: "Voice sample uploaded successfully. Ready for clone."
  };

  const getAudioDuration = (nextAudio: File | Blob) =>
    new Promise<number | null>((resolve) => {
      const url = URL.createObjectURL(nextAudio);
      const element = new Audio();

      element.preload = "metadata";
      element.onloadedmetadata = () => {
        const duration = Number.isFinite(element.duration) ? Math.round(element.duration * 10) / 10 : null;
        URL.revokeObjectURL(url);
        resolve(duration);
      };
      element.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      element.src = url;
    });

  useEffect(() => {
    getVoiceProfile(participantId)
      .then((response) => {
        setProfile(response);
        if (response.voiceReady) {
          setState("success");
        }
      })
      .catch(() => undefined);
  }, [participantId]);

  useEffect(() => {
    if (!audio) {
      setAudioUrl(null);
      return;
    }

    const nextAudioUrl = URL.createObjectURL(audio);
    setAudioUrl(nextAudioUrl);

    return () => {
      URL.revokeObjectURL(nextAudioUrl);
    };
  }, [audio]);

  const statusText = useMemo(() => {
    if (state === "recording") {
      return "Recording...";
    }

    if (state === "uploading") {
      return "Uploading sample...";
    }

    if (state === "failed") {
      return "Upload failed.";
    }

    if (state === "ready") {
      return "Sample ready to upload.";
    }

    if (voiceReady || profile?.voiceProfile) {
      return profile?.reason ?? sampleStatusText[sampleStatus];
    }

    return `Record or upload at least ${minimumRequiredSeconds} seconds of clear speech. Use 1-2 minutes for best results.`;
  }, [minimumRequiredSeconds, profile, sampleStatus, state, voiceReady]);

  const startRecording = async () => {
    setError(null);

    if (!canRecord) {
      setError("Recording is not available in this browser. Upload an audio file instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const measuredDuration = recordingStartedAtRef.current ? Math.max(0.1, (Date.now() - recordingStartedAtRef.current) / 1000) : null;
        setDurationSeconds(measuredDuration ? Math.round(measuredDuration * 10) / 10 : null);
        recordingStartedAtRef.current = null;
        setAudio(blob);
        setState("ready");
      };

      recorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      recorder.start();
      setState("recording");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not start recording");
      setState("failed");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setAudio(file);
    setDurationSeconds(await getAudioDuration(file));
    setError(null);
    setState("ready");
  };

  const submitSample = async () => {
    if (!audio) {
      setError("Choose or record an audio sample first.");
      return;
    }

    setError(null);
    setState("uploading");

    try {
      const response = await uploadVoiceSample({ roomId, participantId, audio, durationSeconds });
      setProfile(response);
      setState("success");
      onUploaded(response);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not upload voice sample");
      setState("failed");
    }
  };

  return (
    <div className="voice-uploader stack">
      <div>
        <h2>Voice sample</h2>
        <p className="muted">{statusText}</p>
      </div>

      <div className="button-row">
        {state === "recording" ? (
          <button className="button warning" type="button" onClick={stopRecording}>
            Stop recording
          </button>
        ) : (
          <button className="button secondary" type="button" onClick={startRecording}>
            Record sample
          </button>
        )}
      </div>

      <div className="field">
        <label htmlFor="voiceSample">Or upload audio</label>
        <input id="voiceSample" type="file" accept="audio/*,.webm,.wav,.mp3,.m4a,.mp4,.aac,.ogg" onChange={handleFileChange} />
      </div>

      {audioUrl ? (
        <audio className="audio-preview" controls src={audioUrl}>
          <track kind="captions" />
        </audio>
      ) : null}

      {durationSeconds ? <p className="muted">Detected duration: {durationSeconds.toFixed(1)} seconds</p> : null}
      {profile?.voiceProfile ? (
        <div className="voice-progress">
          <div>
            <span className={sampleStatus === "ready_for_clone" ? "voice-status ready" : sampleStatus === "too_short" || sampleStatus === "invalid" ? "voice-status missing" : "voice-status pending"}>
              {sampleStatusText[sampleStatus]}
            </span>
          </div>
          <p className="muted">
            {eligibleForClone
              ? "Clone creation can be started from the voice clone card."
              : `Minimum required duration: ${minimumRequiredSeconds} seconds.`}
          </p>
        </div>
      ) : null}
      {error ? <div className="error">{error}</div> : null}

      <button className="button" type="button" onClick={submitSample} disabled={!audio || state === "uploading" || state === "recording"}>
        {state === "uploading" ? "Uploading..." : "Submit voice sample"}
      </button>
    </div>
  );
}
