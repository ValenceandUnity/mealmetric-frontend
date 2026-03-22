"use client";

import { MetricCard } from "@/components/metrics/MetricCard";
import { ListRow } from "@/components/ui/ListRow";
import type { MetricCollectionView } from "@/lib/adapters/metrics";

export function MetricsPanel({ metrics }: { metrics: MetricCollectionView }) {
  return (
    <div className="grid">
      <div className="grid grid--2">
        {metrics.summary.map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
        ))}
      </div>
      {metrics.highlights.length > 0 ? (
        <div className="stacked-list">
          {metrics.highlights.map((item) => (
            <ListRow
              key={item.label}
              eyebrow="Metric highlight"
              title={item.label}
              description={item.value}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
