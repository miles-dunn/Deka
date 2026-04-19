"use client";

import Link from "next/link";
import { useAuth } from "../hooks/useAuth";

export function HeroAuthButtons() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return (
      <div className="hero-actions" aria-label="Primary actions">
        <Link className="button button-primary" href="/create">
          Create room
        </Link>
        <Link className="button button-secondary" href="/join">
          Join room
        </Link>
      </div>
    );
  }

  return (
    <div className="hero-actions" aria-label="Primary actions">
      <Link className="button button-primary" href="/login">
        Sign in
      </Link>
      <Link className="button button-secondary" href="/signup">
        Create account
      </Link>
    </div>
  );
}
