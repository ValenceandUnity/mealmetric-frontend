"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { logoutViaBff } from "@/lib/client/session";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLogout() {
    setLoading(true);
    setErrorMessage(null);

    try {
      await logoutViaBff();
      router.replace("/login");
      router.refresh();
    } catch {
      setErrorMessage("Unable to sign out.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid">
      <button type="button" onClick={handleLogout} disabled={loading}>
        {loading ? "Signing out..." : "Sign out"}
      </button>
      {errorMessage ? (
        <span className="status-text" style={{ color: "var(--danger)" }}>
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}
