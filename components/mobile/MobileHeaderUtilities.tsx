"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent as ReactMouseEvent, useState } from "react";

import { logoutViaBff } from "@/lib/client/session";

type MobileHeaderUtilitiesProps = {
  settingsHref: string;
};

export function MobileHeaderUtilities({ settingsHref }: MobileHeaderUtilitiesProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignOut(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    setErrorMessage(null);

    try {
      await logoutViaBff();
      router.replace("/login");
      router.refresh();
    } catch {
      setErrorMessage("Unable to sign out.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="mobile-header-utilities">
      <Link
        href={settingsHref}
        className="mobile-header-utilities__settings-link mobile-pill mobile-pill--purple mobile-focus-ring"
      >
        Settings
      </Link>
      <button
        type="button"
        className="mobile-header-utilities__sign-out mobile-pill mobile-pill--purple mobile-focus-ring"
        onClick={handleSignOut}
        disabled={signingOut}
        aria-busy={signingOut}
      >
        Sign Out
      </button>
      {errorMessage ? (
        <p className="mobile-header-utilities__error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
