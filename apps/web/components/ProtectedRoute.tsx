"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

const PUBLIC_ROUTES = ["/login", "/signup"];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return children;
}
