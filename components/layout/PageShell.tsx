"use client";

import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/AppShell";
import type { SessionUser } from "@/lib/types/api";

type PageShellProps = {
  title: string;
  user: SessionUser;
  subtitle?: string;
  navigation?: ReactNode;
  actions?: ReactNode;
  className?: string;
  hideTopHub?: boolean;
  children: ReactNode;
};

export function PageShell({
  title,
  user,
  subtitle,
  navigation,
  actions,
  className,
  hideTopHub = false,
  children,
}: PageShellProps) {
  return (
    <AppShell
      title={title}
      user={user}
      subtitle={subtitle ?? "Signed-in workspace backed by MealMetric's protected BFF flow."}
      actions={actions}
      className={className}
      hideTopHub={hideTopHub}
    >
      {navigation ? <div className="page-shell__nav row">{navigation}</div> : null}
      {children}
    </AppShell>
  );
}
