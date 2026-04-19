"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { COMMON_LANGUAGES } from "@translator/shared";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const language = String(formData.get("language") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsSubmitting(false);
      return;
    }

    if (!name) {
      setError("Name is required");
      setIsSubmitting(false);
      return;
    }

    if (!language) {
      setError("Please select your preferred language");
      setIsSubmitting(false);
      return;
    }

    try {
      await signup(email, password, name, language);
      router.push("/voice-setup");
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error ? caughtError.message : "Signup failed";
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
          <p className="eyebrow">Get started</p>
          <h1>Create account</h1>
          <p className="lead">Sign up to start using Deka.</p>
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
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="field">
          <label htmlFor="language">Preferred Language</label>
          <select
            id="language"
            name="language"
            required
            disabled={isSubmitting}
          >
            <option value="">Select your preferred language</option>
            {COMMON_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            disabled={isSubmitting}
          />
          <p className="muted">Must be at least 6 characters.</p>
        </div>

        <div className="field">
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            disabled={isSubmitting}
          />
        </div>

        {error ? <div className="error">{error}</div> : null}

        <div className="button-row">
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </div>

        <p className="text-center">
          Already have an account?{" "}
          <Link href="/login" className="link">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
