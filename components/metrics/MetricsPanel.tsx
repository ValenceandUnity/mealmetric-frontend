"use client";

import { SummaryCard } from "@/components/cards/SummaryCard";
import type { MetricCollectionView } from "@/lib/adapters/metrics";

export function MetricsPanel({ metrics }: { metrics: MetricCollectionView }) {
  return (
    <div className="grid">
      <div className="grid grid--2">
        {metrics.summary.map((item) => (
          <SummaryCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
        ))}
      </div>
      {metrics.highlights.length > 0 ? (
        <div className="stacked-list">
          {metrics.highlights.map((item) => (
            <div key={item.label} className="list-card">
              <p className="list-card__eyebrow">{item.label}</p>
              <p className="list-card__copy">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
