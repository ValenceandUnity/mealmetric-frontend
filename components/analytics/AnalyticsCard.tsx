"use client";

import type { ReactNode } from "react";

import { ActionRow } from "@/components/ui/ActionRow";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatPill } from "@/components/ui/StatPill";

type AnalyticsCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  stats: Array<{ label: string; value: string; hint?: string }>;
  actions?: ReactNode;
  active?: boolean;
  disabled?: boolean;
};

export function AnalyticsCard({
  eyebrow,
  title,
  description,
  stats,
  actions,
  active = false,
  disabled = false,
}: AnalyticsCardProps) {
  return (
    <Card className="analytics-card" active={active} disabled={disabled}>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="analytics-card__stats">
        {stats.map((stat) => (
          <StatPill
            key={`${stat.label}-${stat.value}`}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
            active={active}
            disabled={disabled}
          />
        ))}
      </div>
      {actions ? <ActionRow>{actions}</ActionRow> : null}
    </Card>
  );
}
