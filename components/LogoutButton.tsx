"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
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
    <div className="logout-button">
      <button
        type="button"
        className="logout-button__control"
        onClick={handleLogout}
        disabled={loading}
      >
        {loading ? "Signing out..." : "Sign out"}
      </button>
      {errorMessage ? <div className="logout-button__feedback"><FeedbackBanner tone="error" title="Sign out failed" message={errorMessage} /></div> : null}
    </div>
  );
}
