"use client";

import type { ReactNode } from "react";

import { ActionRow } from "@/components/ui/ActionRow";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";

type RoutineCardProps = {
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

export function RoutineCard({
  eyebrow,
  title,
  description,
  metadata = [],
  status,
  footer,
  active = false,
  disabled = false,
}: RoutineCardProps) {
  return (
    <Card className="routine-card" active={active} disabled={disabled}>
      <ListRow
        eyebrow={eyebrow}
        title={title}
        description={description}
        metadata={metadata}
        status={status}
        active={active}
        disabled={disabled}
      />
      {footer ? <ActionRow>{footer}</ActionRow> : null}
    </Card>
  );
}
