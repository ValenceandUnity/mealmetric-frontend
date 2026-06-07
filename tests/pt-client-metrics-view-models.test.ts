import { describe, expect, it } from "vitest";

import { adaptPTClientMetricsView } from "@/lib/view-models/pt-client-metrics";

describe("adaptPTClientMetricsView", () => {
  it("returns safe fallbacks when PT client metrics payloads are missing", () => {
    const view = adaptPTClientMetricsView({
      clientId: "client-1",
      detail: null,
      metrics: null,
    });

    expect(view.summary.clientDisplayLabel).toBe("Client client-1");
    expect(view.summary.clientEmail).toBe("Email unavailable");
    expect(view.hasClientContext).toBe(false);
    expect(view.hasMetrics).toBe(false);
    expect(view.metricsSource).toBe("none");
    expect(view.summaryCards).toEqual([]);
    expect(view.detailGroups).toEqual([]);
  });

  it("maps PT client detail and metrics route data into mobile-friendly metric sections", () => {
    const view = adaptPTClientMetricsView({
      clientId: "client-1",
      detail: {
        id: "link-1",
        client_user_id: "client-1",
        status: "active",
        notes: "Review the weekly calorie window before updating training volume.",
        client: {
          id: "client-1",
          email: "sam.client@example.com",
          role: "client",
        },
      },
      metrics: {
        overview: {
          client_user_id: "client-1",
          as_of_date: "2026-06-07",
          week_start_date: "2026-06-01",
          week_end_date: "2026-06-07",
          business_timezone: "America/New_York",
          total_intake_calories: 2100,
          total_expenditure_calories: 1800,
          net_calorie_balance: 300,
          weekly_target_deficit_calories: 1400,
          deficit_progress_percent: 0.5,
          current_intake_ceiling_calories: 2100,
          current_expenditure_floor_calories: 700,
          freshness: {
            source: "warehouse",
            computed_at: "2026-06-07T15:00:00Z",
            source_window_start: "2026-06-01",
            source_window_end: "2026-06-07",
            version: "v1",
          },
        },
      },
    });

    expect(view.summary.clientDisplayLabel).toBe("Sam");
    expect(view.summary.clientStatusLabel).toBe("active");
    expect(view.metricsSource).toBe("route");
    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Intake", value: "2,100 cal" }),
      expect.objectContaining({ label: "Deficit progress", value: "50%" }),
    ]));
    expect(view.weeklyMetrics[0]).toMatchObject({
      rangeLabel: "Jun 1 - Jun 7",
      hasData: true,
    });
    expect(view.detailGroups).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: "Freshness" }),
    ]));
  });

  it("falls back to the embedded PT client-detail snapshot when the metrics route is unavailable", () => {
    const view = adaptPTClientMetricsView({
      clientId: "client-1",
      detail: {
        id: "link-1",
        client_user_id: "client-1",
        status: "active",
        client: {
          id: "client-1",
          email: "sam.client@example.com",
          role: "client",
        },
        metrics_snapshot: {
          as_of_date: "2026-06-07",
          week_start_date: "2026-06-01",
          week_end_date: "2026-06-07",
          total_intake_calories: 2200,
          total_expenditure_calories: 1700,
          net_calorie_balance: 500,
          weekly_target_deficit_calories: 1400,
          deficit_progress_percent: 0.25,
          current_intake_ceiling_calories: 2200,
          current_expenditure_floor_calories: 700,
        },
      },
      metrics: null,
    });

    expect(view.hasMetrics).toBe(true);
    expect(view.metricsSource).toBe("detail");
    expect(view.summary.factRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Snapshot source", value: "Embedded detail snapshot" }),
    ]));
    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Net balance", value: "500 cal" }),
    ]));
  });
});
