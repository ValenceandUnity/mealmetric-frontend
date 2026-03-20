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
    <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
      <button type="button" onClick={handleLogout} disabled={loading}>
        {loading ? "Signing out..." : "Sign out"}
      </button>
      {errorMessage ? <span style={{ color: "#fca5a5" }}>{errorMessage}</span> : null}
    </div>
  );
}
