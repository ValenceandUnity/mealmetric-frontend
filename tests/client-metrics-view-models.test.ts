import { describe, expect, it } from "vitest";

import { adaptMetricsView } from "@/lib/view-models/metrics";

describe("adaptMetricsView", () => {
  it("returns safe fallbacks when overview and history are missing", () => {
    const view = adaptMetricsView({
      overview: null,
      history: null,
    });

    expect(view.summaryCards).toEqual([]);
    expect(view.historyMetrics).toEqual([]);
    expect(view.hasOverview).toBe(false);
    expect(view.hasHistory).toBe(false);
    expect(view.hasData).toBe(false);
    expect(view.hasAnyData).toBe(false);
    expect(view.progress.hasData).toBe(false);
    expect(view.detailGroups).toEqual([]);
  });

  it("maps overview and history into mobile summary, progress, detail, and history cards", () => {
    const view = adaptMetricsView({
      overview: {
        as_of_date: "2026-06-07",
        week_start_date: "2026-06-01",
        week_end_date: "2026-06-07",
        business_timezone: "America/New_York",
        total_intake_calories: 2100,
        total_expenditure_calories: 1800,
        net_calorie_balance: 300,
        weekly_target_deficit_calories: 1400,
        deficit_progress_percent: 0.5,
        current_intake_ceiling_calories: 2200,
        current_expenditure_floor_calories: 700,
        freshness: {
          source: "snapshot",
          computed_at: "2026-06-07T15:00:00Z",
          source_window_start: "2026-06-01",
          source_window_end: "2026-06-07",
          version: "v1",
        },
      },
      history: {
        weeks: [
          {
            week_start_date: "2026-06-01",
            week_end_date: "2026-06-07",
            as_of_date: "2026-06-07",
            total_intake_calories: 2100,
            total_expenditure_calories: 1800,
            net_calorie_balance: 300,
            deficit_progress_percent: 0.5,
          },
        ],
      },
    });

    expect(view.hasOverview).toBe(true);
    expect(view.hasHistory).toBe(true);
    expect(view.summaryCards[0]).toMatchObject({
      label: "Intake",
      value: "2,100 cal",
    });
    expect(view.weeklyMetrics[0]).toMatchObject({
      label: "My Week",
      rangeLabel: "Jun 1 - Jun 7",
      hasData: true,
    });
    expect(view.progress).toMatchObject({
      progressLabel: "50%",
      progressValue: 50,
      targetLabel: "1,400 cal",
      supportLabel: "300 cal",
      hasData: true,
    });
    expect(view.historyMetrics[0]).toMatchObject({
      dateLabel: "Jun 1 - Jun 7",
      rangeLabel: "As of Jun 7",
      progressLabel: "50%",
      hasData: true,
    });
    expect(view.detailGroups.some((group) => group.title === "Freshness")).toBe(true);
  });

  it("falls back to the latest history snapshot when overview is missing", () => {
    const view = adaptMetricsView({
      overview: null,
      history: {
        as_of_date: "2026-06-07",
        week_start_date: "2026-06-01",
        week_end_date: "2026-06-07",
        total_intake_calories: 2100,
        total_expenditure_calories: 1800,
        net_calorie_balance: 300,
        weekly_target_deficit_calories: 1400,
        deficit_progress_percent: 0.5,
        current_intake_ceiling_calories: 2200,
        current_expenditure_floor_calories: 700,
        weeks: [],
      },
    });

    expect(view.hasOverview).toBe(true);
    expect(view.summaryCards[0]?.value).toBe("2,100 cal");
    expect(view.progress.progressLabel).toBe("50%");
    expect(view.detailGroups[0]?.title).toBe("Intake");
  });
});
