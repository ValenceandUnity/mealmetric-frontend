"use client";

import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/AppShell";
import type { SessionUser } from "@/lib/types/api";

type PageShellProps = {
  title: string;
  user: SessionUser;
  navigation?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function PageShell({ title, user, navigation, actions, children }: PageShellProps) {
  return (
    <AppShell
      title={title}
      user={user}
      actions={actions}
      subtitle="Signed-in workspace backed by MealMetric's protected BFF flow."
    >
      {navigation ? <div className="page-shell__nav row">{navigation}</div> : null}
      {children}
    </AppShell>
  );
}
