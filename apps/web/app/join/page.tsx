"use client";

import Link from "next/link";
import { JoinRoomForm } from "../../components/JoinRoomForm";

export default function JoinRoomPage() {
  return (
    <main className="page narrow-page stack">
      <header className="topbar">
        <Link className="brand" href="/">
          Deka
        </Link>
        <Link className="nav-link" href="/create">
          Create instead
        </Link>
      </header>
      <JoinRoomForm />
    </main>
  );
}
