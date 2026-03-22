"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";

type ListRowProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  metadata?: Array<{ label: string; value: string }>;
  status?: {
    label: string;
    tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  };
  footer?: ReactNode;
  active?: boolean;
  disabled?: boolean;
};

export function ListRow({
  eyebrow,
  title,
  description,
  metadata = [],
  status,
  footer,
  active = false,
  disabled = false,
}: ListRowProps) {
  return (
    <article
      className={[
        "list-row",
        active ? "list-row--active" : "",
        disabled ? "list-row--disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="list-row__body">
        <div className="list-row__header">
          <div>
            {eyebrow ? <p className="list-row__eyebrow">{eyebrow}</p> : null}
            <h3 className="list-row__title">{title}</h3>
          </div>
          {status ? <Badge label={status.label} tone={status.tone} /> : null}
        </div>
        {description ? <p className="list-row__description">{description}</p> : null}
        {metadata.length > 0 ? (
          <div className="list-row__meta">
            {metadata.map((item) => (
              <span key={`${item.label}-${item.value}`}>
                <strong>{item.label}:</strong> {item.value}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {footer ? <div className="list-row__footer">{footer}</div> : null}
    </article>
  );
}
