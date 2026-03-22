"use client";

import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/AppShell";
import type { SessionUser } from "@/lib/types/api";

type PageShellProps = {
  title: string;
  user: SessionUser;
  navigation?: ReactNode;
  actions?: ReactNode;
  className?: string;
  hideTopHub?: boolean;
  children: ReactNode;
};

export function PageShell({
  title,
  user,
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
      actions={actions}
      className={className}
      hideTopHub={hideTopHub}
      subtitle="Signed-in workspace backed by MealMetric's protected BFF flow."
    >
      {navigation ? <div className="page-shell__nav row">{navigation}</div> : null}
      {children}
    </AppShell>
  );
}
