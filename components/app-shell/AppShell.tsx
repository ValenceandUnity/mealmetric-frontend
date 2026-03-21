"use client";

import type { ReactNode } from "react";

import { BottomNavigation } from "@/components/navigation/BottomNavigation";
import type { SessionUser } from "@/lib/types/api";

type AppShellProps = {
  title: string;
  user: SessionUser;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

function getRoleLabel(role: SessionUser["role"]): string {
  switch (role) {
    case "client":
      return "Client hub";
    case "pt":
      return "PT command";
    case "vendor":
      return "Vendor portal";
    default:
      return "MealMetric";
  }
}

export function AppShell({ title, user, subtitle, actions, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <div className="app-shell__stack">
        <header className="app-shell__hero">
          <div className="row row--between">
            <span className="app-shell__eyebrow">{getRoleLabel(user.role)}</span>
            {actions}
          </div>
          <h1 className="app-shell__headline">{title}</h1>
          <p className="app-shell__copy">
            {subtitle ??
              "Product-grade mobile UI running entirely through the Next.js BFF boundary."}
          </p>
          <div className="app-shell__meta">
            <span className="chip">{user.email}</span>
            <span className="chip">Role: {user.role}</span>
          </div>
        </header>
        {children}
      </div>
      <BottomNavigation role={user.role} />
    </div>
  );
}
