"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import type { ApiResponse, NotificationUnreadCountPayload, UserRole } from "@/lib/types/api";

type NotificationLinkProps = {
  role: UserRole;
};

type NotificationCountApiResponse = ApiResponse<NotificationUnreadCountPayload>;

function notificationsHrefForRole(role: UserRole): string | null {
  switch (role) {
    case "client":
      return "/client/notifications";
    case "pt":
      return "/pt/notifications";
    default:
      return null;
  }
}

export function NotificationLink({ role }: NotificationLinkProps) {
  const href = notificationsHrefForRole(role);
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!href) {
      return;
    }

    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/notifications/unread-count", { cache: "no-store" });
        const payload = (await response.json()) as NotificationCountApiResponse;

        if (!active || !payload.ok) {
          return;
        }

        setCount(payload.data.count);
      } catch {
        if (active) {
          setCount(null);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [href]);

  if (!href) {
    return null;
  }

  return (
    <Link
      className={[
        "notification-link",
        "utility-icon-link",
        pathname === href ? "utility-icon-link--active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      href={href}
      aria-label="Notifications"
      title="Notifications"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4.75a4.25 4.25 0 0 0-4.25 4.25v2.11c0 .73-.19 1.45-.55 2.08L6 15.25h12l-1.2-2.06a4.24 4.24 0 0 1-.55-2.08V9A4.25 4.25 0 0 0 12 4.75Z" />
        <path d="M10.25 18a1.75 1.75 0 0 0 3.5 0" />
      </svg>
      {count !== null && count > 0 ? <span className="notification-link__count">{count}</span> : null}
    </Link>
  );
}
