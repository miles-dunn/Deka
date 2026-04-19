"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { storage, db } from "../../lib/firebase";
import { createProfileClone } from "../../lib/api";

type PageState = "checking" | "idle" | "recording" | "ready" | "uploading" | "cloning" | "retry-clone" | "done";


const MIN_SECONDS = 15;

export default function VoiceSetupPage() {
  const router = useRouter();
  const { user, loading, refreshProfile } = useAuth();

  const [state, setState] = useState<PageState>("checking");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Stored between steps so retry-clone can use it
  const savedUrlRef = useRef<string>("");
  const savedDurationRef = useRef<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    if (!db) { setState("idle"); return; }

    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (!snap.exists()) { setState("idle"); return; }
      const data = snap.data();
      if (data.voiceCloneReady) {
        router.push("/");
      } else if (data.voiceSampleRecorded && data.voiceSampleUrl) {
        // Sample exists but clone wasn't created — allow retry
        savedUrlRef.current = data.voiceSampleUrl;
        savedDurationRef.current = data.voiceSampleDuration ?? 0;
        setState("retry-clone");
      } else {
        setState("idle");
      }
    }).catch(() => setState("idle"));
  }, [user, loading, router]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(finalDuration);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setState("ready");
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setState("recording");
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch {
      setError("Microphone access denied. Please allow microphone access and try again.");
    }
  };

  const stopRecording = () => mediaRecorderRef.current?.stop();

  const reRecord = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setDuration(0);
    setState("idle");
  };

  const runClone = async (voiceSampleUrl: string, durationSeconds: number) => {
    if (!user || !db) return;
    setState("cloning");
    setError(null);

    try {
      const result = await createProfileClone({
        userId: user.uid,
        userName: user.displayName ?? user.email ?? "User",
        voiceSampleUrl,
        durationSeconds,
      });

      await updateDoc(doc(db, "users", user.uid), {
        voiceCloneReady: true,
        voiceCloneId: result.providerVoiceId,
        voiceCloneProvider: result.provider,
        voiceCloneCreatedAt: new Date(),
      });

      await refreshProfile();
      setState("done");
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Voice clone failed: ${msg}`);
      setState("retry-clone");
    }
  };

  const submit = async () => {
    if (!audioBlob || !user || !storage || !db) return;
    setState("uploading");
    setError(null);

    try {
      const sampleRef = storageRef(storage, `voice-samples/${user.uid}/sample.webm`);
      await uploadBytes(sampleRef, audioBlob);
      const downloadUrl = await getDownloadURL(sampleRef);

      await updateDoc(doc(db, "users", user.uid), {
        voiceSampleRecorded: true,
        voiceSampleUrl: downloadUrl,
        voiceSampleDuration: duration,
        voiceSampleRecordedAt: new Date(),
      });

      savedUrlRef.current = downloadUrl;
      savedDurationRef.current = duration;
      await runClone(downloadUrl, duration);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Upload failed: ${msg}`);
      setState("ready");
    }
  };

  if (state === "checking") {
    return (
      <div className="page" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main className="page narrow-page stack">
      <header className="topbar">
        <Link className="brand" href="/">Deka</Link>
      </header>

      <div className="form">
        <div>
          <p className="eyebrow">One-time setup</p>
          <h1>Set up your voice</h1>
          <p className="lead">
            Record at least {MIN_SECONDS} seconds of yourself speaking naturally.
            We'll create a personalised voice clone used in all your conversations.
          </p>
        </div>

        {state === "done" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ color: "var(--success)", fontWeight: 700, fontSize: 18, margin: 0 }}>
              Voice clone ready! Taking you home...
            </p>
          </div>
        )}

        {state === "cloning" && (
          <div style={{ display: "grid", gap: 8 }}>
            <p style={{ fontWeight: 700, margin: 0 }}>Creating your voice clone...</p>
            <p className="muted" style={{ margin: 0 }}>This takes a few seconds. Please stay on this page.</p>
          </div>
        )}

        {state === "uploading" && (
          <p style={{ color: "var(--muted)", margin: 0 }}>Uploading voice sample...</p>
        )}

        {state === "retry-clone" && (
          <div style={{ display: "grid", gap: 16 }}>
            <p className="muted">Your voice sample was recorded but the clone wasn't created yet.</p>
            {error && <div className="error">{error}</div>}
            <div className="button-row">
              <button className="button" onClick={() => runClone(savedUrlRef.current, savedDurationRef.current)}>
                Create voice clone
              </button>
              <button className="button secondary" onClick={reRecord}>
                Re-record sample
              </button>
            </div>
          </div>
        )}

        {(state === "idle" || state === "recording" || state === "ready") && (
          <>
            <div style={{ display: "grid", gap: 16 }}>
              {state === "idle" && (
                <div className="button-row">
                  <button className="button" onClick={startRecording}>Start recording</button>
                </div>
              )}

              {state === "recording" && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ alignItems: "center", display: "flex", gap: 12 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: "var(--danger)", display: "inline-block",
                      animation: "voicePulse 1s infinite",
                    }} />
                    <span style={{ fontWeight: 700 }}>Recording — {duration}s</span>
                    {duration >= MIN_SECONDS && (
                      <span style={{ color: "var(--success)", fontSize: 13 }}>Minimum reached</span>
                    )}
                  </div>
                  <div className="button-row">
                    <button className="button" onClick={stopRecording}>Stop recording</button>
                  </div>
                </div>
              )}

              {state === "ready" && (
                <div style={{ display: "grid", gap: 16 }}>
                  <div>
                    <p style={{ fontWeight: 700, marginBottom: 8 }}>Preview ({duration}s)</p>
                    <audio className="audio-preview" src={audioUrl!} controls />
                  </div>
                  {duration < MIN_SECONDS && (
                    <p style={{ color: "var(--warning)", fontSize: 14, margin: 0 }}>
                      Too short — please record at least {MIN_SECONDS} seconds.
                    </p>
                  )}
                  <div className="button-row">
                    <button className="button" onClick={submit} disabled={duration < MIN_SECONDS}>
                      Save &amp; create voice clone
                    </button>
                    <button className="button secondary" onClick={reRecord}>Re-record</button>
                  </div>
                </div>
              )}
            </div>

            {error && <div className="error">{error}</div>}

            <p style={{ fontSize: 13, color: "var(--soft)", margin: 0 }}>
              Your voice sample is recorded once and stored securely.
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes voicePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
      `}</style>
    </main>
  );
}
