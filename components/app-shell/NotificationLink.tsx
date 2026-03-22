"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
    <Link className="link-button notification-link" href={href}>
      <span>Notifications</span>
      {count !== null && count > 0 ? <span className="notification-link__count">{count}</span> : null}
    </Link>
  );
}
