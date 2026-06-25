"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { logoutViaBff } from "@/lib/client/session";
import type { HeaderBackgroundRole } from "@/lib/client/header-background";

type MobileHeaderUtilitiesProps = {
  role: HeaderBackgroundRole;
  settingsHref: string;
  leadingSlot?: ReactNode;
};

export function MobileHeaderUtilities({
  role,
  settingsHref,
  leadingSlot,
}: MobileHeaderUtilitiesProps) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

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
    <div ref={rootRef} className="mobile-header-utilities">
      {leadingSlot ? <div className="mobile-header-utilities__leading">{leadingSlot}</div> : null}
      <button
        type="button"
        className="mobile-pill mobile-pill--purple mobile-focus-ring"
        onClick={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? "Signing out..." : "Sign out"}
      </button>
      <div className="mobile-header-utilities__menu-shell">
        <button
          type="button"
          className="mobile-header-utilities__gear mobile-focus-ring"
          aria-label={`Open ${role} header settings`}
          aria-controls={menuId}
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((current) => !current);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 8.1a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8Z" />
            <path d="m4.8 13.1-.8-1.1.8-1.1 1.8-.2c.2-.5.4-1 .7-1.5l-.7-1.7 1.1-.8 1.4 1c.5-.2 1-.4 1.5-.5L12 4l1.4.3c.5.1 1 .3 1.5.5l1.4-1 1.1.8-.7 1.7c.3.5.5 1 .7 1.5l1.8.2.8 1.1-.8 1.1-1.8.2c-.2.5-.4 1-.7 1.5l.7 1.7-1.1.8-1.4-1c-.5.2-1 .4-1.5.5L12 20l-1.4-.3c-.5-.1-1-.3-1.5-.5l-1.4 1-1.1-.8.7-1.7c-.3-.5-.5-1-.7-1.5l-1.8-.2Z" />
          </svg>
        </button>
        {menuOpen ? (
          <div
            id={menuId}
            className="mobile-header-utilities__menu"
            role="dialog"
            aria-label="Header settings menu"
          >
            <p className="mobile-header-utilities__menu-title">Header settings</p>
            <p className="mobile-header-utilities__menu-copy">
              Adjust the header background from the role settings page.
            </p>
            <Link
              href={settingsHref}
              className="mobile-header-utilities__menu-link mobile-focus-ring"
              onClick={() => {
                setMenuOpen(false);
              }}
            >
              Open settings
            </Link>
          </div>
        ) : null}
      </div>
      {errorMessage ? (
        <p className="mobile-header-utilities__error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
