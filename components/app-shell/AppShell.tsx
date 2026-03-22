"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

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
  children: ReactNode;
};

export function AppShell({ title, user, subtitle, actions, children }: AppShellProps) {
  const pathname = usePathname();
  const roleMeta = getRoleShellMeta(user.role);
  const activeItem = getActiveNavItem(user.role, pathname);

  return (
    <div className="app-shell">
      <div className="app-shell__stack">
        <TopHub
          accent={roleMeta.accent}
          roleLabel={roleMeta.label}
          sectionLabel={activeItem?.label ?? "Workspace"}
          title={title}
          subtitle={subtitle}
          email={user.email}
          actions={actions}
        />
        <div className="app-shell__viewport">{children}</div>
      </div>
      <BottomNavigation role={user.role} />
    </div>
  );
}
