"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";

type DetailCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  metadata?: ReactNode;
  footer?: ReactNode;
};

export function DetailCard({ eyebrow, title, description, metadata, footer }: DetailCardProps) {
  return (
    <Card className="list-card">
      {eyebrow ? <p className="list-card__eyebrow">{eyebrow}</p> : null}
      <h3 className="list-card__title">{title}</h3>
      {description ? <p className="list-card__copy">{description}</p> : null}
      {metadata ? <div className="meta-list">{metadata}</div> : null}
      {footer ? <div className="row">{footer}</div> : null}
    </Card>
  );
}
