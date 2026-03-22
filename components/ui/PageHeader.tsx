"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  status?: {
    label: string;
    tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  };
  chips?: string[];
  actions?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  status,
  chips = [],
  actions,
}: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header__row">
        <div className="page-header__lead">
          {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
          <div className="page-header__title-row">
            <h2 className="page-header__title">{title}</h2>
            {status ? <Badge label={status.label} tone={status.tone} /> : null}
          </div>
          {description ? <p className="page-header__description">{description}</p> : null}
        </div>
        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
      {chips.length > 0 ? (
        <div className="page-header__chips">
          {chips.map((chip) => (
            <Chip key={chip} tone="muted">
              {chip}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}
