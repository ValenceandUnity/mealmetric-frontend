"use client";

import { MetricCard } from "@/components/metrics/MetricCard";
import type { MetricsDisplayItem } from "@/lib/adapters/metrics";

type MetricsGridProps = {
  metrics: MetricsDisplayItem[];
  activeFirst?: boolean;
};

export function MetricsGrid({
  metrics,
  activeFirst = false,
}: MetricsGridProps) {
  return (
    <div className="client-metrics-grid">
      {metrics.map((metric, index) => (
        <MetricCard
          key={metric.key}
          label={metric.label}
          value={metric.value}
          active={activeFirst && index === 0}
        />
      ))}
    </div>
  );
}
