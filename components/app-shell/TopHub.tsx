"use client";

import type { CSSProperties, ReactNode } from "react";

type TopHubProps = {
  accent: string;
  roleLabel: string;
  sectionLabel: string;
  title: string;
  subtitle?: string;
  email: string;
  actions?: ReactNode;
};

export function TopHub({
  accent,
  roleLabel,
  sectionLabel,
  title,
  subtitle,
  email,
  actions,
}: TopHubProps) {
  return (
    <header className="top-hub" style={{ "--hub-accent": accent } as CSSProperties}>
      <div className="top-hub__row">
        <div className="top-hub__badges">
          <span className="top-hub__eyebrow">{roleLabel}</span>
          <span className="top-hub__section">{sectionLabel}</span>
        </div>
        {actions ? <div className="top-hub__actions">{actions}</div> : null}
      </div>
      <div className="top-hub__copy">
        <h1 className="top-hub__title">{title}</h1>
        <p className="top-hub__subtitle">
          {subtitle ?? "Authenticated shell running through MealMetric's protected BFF boundary."}
        </p>
      </div>
      <div className="top-hub__meta">
        <span className="chip chip--muted top-hub__email">{email}</span>
      </div>
    </header>
  );
}
