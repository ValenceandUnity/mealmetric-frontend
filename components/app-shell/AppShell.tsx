"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NotificationLink } from "@/components/app-shell/NotificationLink";
import { TopHub } from "@/components/app-shell/TopHub";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import {
  getActiveNavItem,
  getRoleShellMeta,
} from "@/lib/navigation/app-shell";
import type { SessionUser } from "@/lib/types/api";

type AppShellProps = {
  title: string;
  user: SessionUser;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  hideTopHub?: boolean;
  children: ReactNode;
};

export function AppShell({
  title,
  user,
  subtitle,
  actions,
  className,
  hideTopHub = false,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const roleMeta = getRoleShellMeta(user.role);
  const activeItem = getActiveNavItem(user.role, pathname);
  const isClient = user.role === "client";

  return (
    <div className={["app-shell", className ?? ""].filter(Boolean).join(" ")}>
      <div className="app-shell__stack">
        {hideTopHub ? null : (
          <TopHub
            accent={roleMeta.accent}
            roleLabel={roleMeta.label}
            sectionLabel={activeItem?.label ?? "Workspace"}
            title={title}
            subtitle={subtitle}
            email={user.email}
            actions={
              <>
                <NotificationLink role={user.role} />
                {isClient ? (
                  <Link
                    href="/client/settings"
                    className={[
                      "utility-icon-link",
                      pathname === "/client/settings" ? "utility-icon-link--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-label="Settings"
                    title="Settings"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 9.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Z" />
                      <path d="m4.75 13.1 1.17.47c.14.42.31.82.53 1.19l-.5 1.16a1 1 0 0 0 .21 1.11l.98.98a1 1 0 0 0 1.11.21l1.16-.5c.37.22.77.39 1.19.53l.47 1.17a1 1 0 0 0 .93.63h1.38a1 1 0 0 0 .93-.63l.47-1.17c.42-.14.82-.31 1.19-.53l1.16.5a1 1 0 0 0 1.11-.21l.98-.98a1 1 0 0 0 .21-1.11l-.5-1.16c.22-.37.39-.77.53-1.19l1.17-.47a1 1 0 0 0 .63-.93v-1.38a1 1 0 0 0-.63-.93l-1.17-.47a7.1 7.1 0 0 0-.53-1.19l.5-1.16a1 1 0 0 0-.21-1.11l-.98-.98a1 1 0 0 0-1.11-.21l-1.16.5a7.1 7.1 0 0 0-1.19-.53l-.47-1.17A1 1 0 0 0 12.69 3h-1.38a1 1 0 0 0-.93.63l-.47 1.17c-.42.14-.82.31-1.19.53l-1.16-.5a1 1 0 0 0-1.11.21l-.98.98a1 1 0 0 0-.21 1.11l.5 1.16c-.22.37-.39.77-.53 1.19l-1.17.47a1 1 0 0 0-.63.93v1.38a1 1 0 0 0 .63.93Z" />
                    </svg>
                  </Link>
                ) : null}
                {actions}
              </>
            }
          />
        )}
        <div className="app-shell__viewport">{children}</div>
      </div>
      <BottomNavigation role={user.role} />
    </div>
  );
}
