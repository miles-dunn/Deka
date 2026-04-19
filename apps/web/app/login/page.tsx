"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      await login(email, password);
      router.push("/");
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error ? caughtError.message : "Login failed";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page narrow-page stack">
      <header className="topbar">
        <Link className="brand" href="/">
          Deka
        </Link>
      </header>

      <form className="form" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1>Sign in</h1>
          <p className="lead">Enter your credentials to continue.</p>
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isSubmitting}
          />
        </div>

        {error ? <div className="error">{error}</div> : null}

        <div className="button-row">
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </div>

        <p className="text-center">
          Don't have an account?{" "}
          <Link href="/signup" className="link">
            Create one
          </Link>
        </p>
      </form>
    </main>
  );
}
