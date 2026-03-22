"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  status?: {
    label: string;
    tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  };
  active?: boolean;
  disabled?: boolean;
};

export function MetricCard({
  label,
  value,
  hint,
  status,
  active = false,
  disabled = false,
}: MetricCardProps) {
  return (
    <Card className="metric-card" active={active} disabled={disabled}>
      <div className="metric-card__top">
        <p className="metric-card__label">{label}</p>
        {status ? <Badge label={status.label} tone={status.tone} /> : null}
      </div>
      <p className="metric-card__value">{value}</p>
      {hint ? <p className="metric-card__hint">{hint}</p> : null}
    </Card>
  );
}
