"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

export function HomeContent() {
  const { user, loading, logout, isFirebaseEnabled } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return (
      <section className="hero">
        <div className="hero-content">
          <p style={{ textAlign: "center" }}>Loading...</p>
        </div>
      </section>
    );
  }

  if (!isFirebaseEnabled) {
    return (
      <section className="hero">
        <div className="hero-content">
          <div style={{ background: "#fff3cd", border: "1px solid #ffeaa7", borderRadius: "8px", padding: "12px", marginBottom: "24px" }}>
            <p style={{ color: "#856404", margin: 0 }}>
              <strong>Note:</strong> Authentication is disabled. Configure Firebase credentials to enable user accounts.
            </p>
          </div>
          <nav className="hero-actions" aria-label="Room actions">
            <Link className="button" href="/create">
              Create room
            </Link>
            <Link className="button secondary" href="/join">
              Join room
            </Link>
          </nav>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="hero">
        <div className="hero-content">
          <nav className="hero-actions" aria-label="Auth actions">
            <Link className="button" href="/login">
              Sign in
            </Link>
            <Link className="button secondary" href="/signup">
              Create account
            </Link>
          </nav>
        </div>
      </section>
    );
  }

  return (
    <section className="hero">
      <div className="hero-content">
        <nav className="hero-actions" aria-label="Room actions">
          <Link className="button" href="/create">
            Create room
          </Link>
          <Link className="button secondary" href="/join">
            Join room
          </Link>
        </nav>
        <button
          onClick={handleLogout}
          className="button logout-button"
          style={{ marginTop: "1rem" }}
        >
          Sign out
        </button>
      </div>
    </section>
  );
}
