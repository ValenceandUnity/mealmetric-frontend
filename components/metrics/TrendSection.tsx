"use client";

import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import type { MetricsTrendRow } from "@/lib/adapters/metrics";

type TrendSectionProps = {
  rows: MetricsTrendRow[];
};

export function TrendSection({ rows }: TrendSectionProps) {
  return (
    <div className="client-metrics-trend-list">
      {rows.map((row) => (
        <Card key={row.label} className="client-metrics-trend-row" variant="ghost">
          <ListRow
            eyebrow="Trend"
            title={row.label}
            metadata={row.metrics.map((metric) => ({
              label: metric.label,
              value: metric.value,
            }))}
          />
        </Card>
      ))}
    </div>
  );
}
