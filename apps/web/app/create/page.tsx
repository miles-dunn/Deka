"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CreateRoomForm } from "../../components/CreateRoomForm";
import { useAuth } from "../../hooks/useAuth";

export default function CreateRoomPage() {
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
          <Link className="brand" href="/">Deka</Link>
        </header>
        <div className="form">
          <div>
            <p className="eyebrow">Setup required</p>
            <h1>Voice clone needed</h1>
            <p className="lead">You need a verified voice clone before you can create a room.</p>
          </div>
          <div className="button-row">
            <Link className="button" href="/voice-setup">Set up your voice</Link>
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
        <Link className="nav-link" href="/join">
          Join instead
        </Link>
      </header>
      <CreateRoomForm />
    </main>
  );
}
