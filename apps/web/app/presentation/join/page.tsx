"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { JoinPresentationRoomForm } from "../../../components/JoinPresentationRoomForm";
import { useAuth } from "../../../hooks/useAuth";

export default function JoinPresentationRoomPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="page narrow-page stack">
        <header className="topbar">
          <Link className="brand" href="/">
            Deka
          </Link>
        </header>
        <p>Loading...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (profile && !profile.voiceCloneReady) {
    return (
      <main className="page narrow-page stack">
        <header className="topbar">
          <Link className="brand" href="/">
            Deka
          </Link>
        </header>
        <div className="form">
          <div>
            <p className="eyebrow">Setup required</p>
            <h1>Voice clone needed</h1>
            <p className="lead">You need a verified voice clone before joining a presentation room.</p>
          </div>
          <div className="button-row">
            <Link className="button" href="/voice-setup">
              Set up your voice
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page narrow-page stack">
      <header className="topbar">
        <Link className="brand" href="/">
          Deka
        </Link>
        <div className="button-row">
          <Link className="nav-link" href="/join">
            Conversation join
          </Link>
          <Link className="nav-link" href="/presentation/create">
            Presentation create
          </Link>
        </div>
      </header>
      <JoinPresentationRoomForm />
    </main>
  );
}
