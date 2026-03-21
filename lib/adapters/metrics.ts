import type { JsonValue } from "@/lib/types/api";

import { extractDetails, extractSummary } from "@/lib/adapters/common";

export type MetricCollectionView = {
  summary: Array<{ label: string; value: string; hint?: string }>;
  highlights: Array<{ label: string; value: string }>;
};

export function adaptMetrics(value: JsonValue | null): MetricCollectionView {
  const summary = extractSummary(value, 4);

  return {
    summary:
      summary.length > 0
        ? summary
        : [
            {
              label: "Data Shape",
              value: Array.isArray(value) ? `${value.length} items` : "No summary available",
            },
            { label: "Source", value: "BFF metrics response" },
          ],
    highlights: extractDetails(value, 6),
  };
}
