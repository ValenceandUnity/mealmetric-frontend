"use client";

import type { ReactNode } from "react";

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
    <div style={{ display: "grid", gap: 20 }}>
      <section
        style={{
          border: "1px solid #334155",
          borderRadius: 12,
          padding: 20,
          background: "#111827",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <h2 style={{ margin: 0 }}>{title}</h2>
            <p style={{ margin: 0 }}>
              Signed in as <strong>{user.email}</strong> with role <code>{user.role}</code>.
            </p>
            {navigation ? <nav>{navigation}</nav> : null}
          </div>
          {actions ? <div>{actions}</div> : null}
        </div>
      </section>
      {children}
    </div>
  );
}
