import { describe, expect, it } from "vitest";

import { adaptPTMetricsView } from "@/lib/view-models/pt-dashboard";

describe("adaptPTMetricsView", () => {
  it("returns a safe empty state when no linked PT clients are available", () => {
    const view = adaptPTMetricsView({
      dashboard: {
        count: 0,
        items: [],
      },
      rosterClients: {
        items: [],
        count: 0,
      },
    });

    expect(view.hasClients).toBe(false);
    expect(view.hasAnyData).toBe(false);
    expect(view.coverageCards).toEqual([]);
    expect(view.comparisonCards).toEqual([]);
    expect(view.emptyState).toMatchObject({
      title: "PT metrics start with linked clients",
      actionHref: "/pt/clients",
    });
  });

  it("maps PT dashboard and roster data into summary, coverage, and comparison cards", () => {
    const view = adaptPTMetricsView({
      dashboard: {
        count: 1,
        items: [
          {
            id: "link-1",
            pt_user_id: "pt-1",
            client_user_id: "client-1",
            status: "active",
            started_at: null,
            ended_at: null,
            notes: null,
            created_at: "2026-06-07T00:00:00Z",
            updated_at: "2026-06-07T00:00:00Z",
            client: {
              id: "client-1",
              email: "sam.client@example.com",
              role: "client",
              created_at: "2026-06-07T00:00:00Z",
            },
            assignment_count: 3,
            workout_log_count: 8,
            latest_workout_log_at: "2026-06-07T14:00:00Z",
            metrics_snapshot: {
              client_user_id: "client-1",
              as_of_date: "2026-06-07",
              week_start_date: "2026-06-01",
              week_end_date: "2026-06-07",
              business_timezone: "America/New_York",
              week_start_day: 1,
              total_intake_calories: 2100,
              total_expenditure_calories: 1800,
              net_calorie_balance: 300,
              weekly_target_deficit_calories: 1400,
              deficit_progress_percent: 0.5,
              current_intake_ceiling_calories: 2100,
              current_expenditure_floor_calories: 700,
              has_data: true,
              freshness: null,
            },
          },
        ],
      },
      rosterClients: {
        items: [
          {
            id: "link-1",
            client_user_id: "client-1",
            client_name: "Sam",
            client_email: "sam.client@example.com",
            roster_name: "MVPs",
            status: "active",
          },
        ],
      },
    });

    expect(view.hasClients).toBe(true);
    expect(view.hasAnyData).toBe(true);
    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Linked clients", value: "1" }),
      expect.objectContaining({ label: "Assignments", value: "3" }),
      expect.objectContaining({ label: "Workout logs", value: "8" }),
    ]));
    expect(view.coverageCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Active clients", valueLabel: "1/1", hasData: true }),
      expect.objectContaining({ label: "Clients with activity", valueLabel: "1/1", hasData: true }),
      expect.objectContaining({ label: "Snapshot coverage", valueLabel: "1/1", hasData: true }),
    ]));
    expect(view.comparisonCards[0]).toMatchObject({
      clientDisplayLabel: "Sam",
      clientEmail: "sam.client@example.com",
      rosterLabel: "MVPs",
      assignmentCountLabel: "3 assignments",
      workoutLogCountLabel: "8 workout logs",
      intakeCeilingLabel: "2,100 cal",
      expenditureFloorLabel: "700 cal",
      metricsHref: "/pt/clients/client-1/metrics",
      hasMetricsSnapshot: true,
    });
  });
});
