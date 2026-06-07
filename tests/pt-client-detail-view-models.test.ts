import { describe, expect, it } from "vitest";

import { adaptPTClientDetailView } from "@/lib/view-models/pt-client-detail";

describe("adaptPTClientDetailView", () => {
  it("returns safe fallbacks when PT client-detail payloads are missing", () => {
    const view = adaptPTClientDetailView({
      clientId: "client-1",
      detail: null,
      assignments: null,
      metrics: null,
      workoutLogs: null,
    });

    expect(view.summary.clientDisplayLabel).toBe("Client client-1");
    expect(view.summary.clientEmail).toBe("Email unavailable");
    expect(view.actions).toHaveLength(4);
    expect(view.hasAssignments).toBe(false);
    expect(view.hasMetrics).toBe(false);
    expect(view.hasWorkoutLogs).toBe(false);
    expect(view.metricCards).toEqual([]);
    expect(view.workoutLogPreview).toEqual([]);
  });

  it("maps PT client-detail, metrics, assignments, and workout-log data to mobile route-friendly cards", () => {
    const view = adaptPTClientDetailView({
      clientId: "client-1",
      detail: {
        id: "link-1",
        client_user_id: "client-1",
        status: "active",
        assignment_count: 2,
        workout_log_count: 1,
        latest_workout_log_at: "2026-06-07T15:00:00Z",
        client: {
          id: "client-1",
          email: "sam.client@example.com",
          role: "client",
          created_at: "2026-06-07T00:00:00Z",
        },
        current_assignments: [
          {
            id: "assignment-1",
            training_package_name: "Strength Block",
            status: "active",
            start_date: "2026-06-01",
            end_date: "2026-06-30",
          },
        ],
      },
      assignments: {
        items: [
          {
            id: "assignment-1",
            training_package_name: "Strength Block",
            status: "active",
            start_date: "2026-06-01",
            end_date: "2026-06-30",
          },
        ],
      },
      metrics: {
        overview: {
          as_of_date: "2026-06-07",
          net_calorie_balance: 250,
          current_intake_ceiling_calories: 2200,
          current_expenditure_floor_calories: 700,
          weekly_target_deficit_calories: 1400,
          deficit_progress_percent: 0.5,
        },
      },
      workoutLogs: {
        items: [
          {
            id: "log-1",
            performed_at: "2026-06-07T15:00:00Z",
            routine_name: "Upper Day",
            duration_minutes: 44,
            completion_status: "completed",
            client_notes: "Felt strong today.",
            pt_notes: "Increase tempo next week.",
            exercise_entries: [
              {
                id: "entry-1",
                exercise_name: "Bench Press",
                sets: 4,
                reps: 8,
                position: 0,
              },
            ],
          },
        ],
      },
    });

    expect(view.summary.clientDisplayLabel).toBe("Sam");
    expect(view.summary.clientStatusLabel).toBe("active");
    expect(view.actions[0]?.href).toBe("/pt/clients/client-1/assign");
    expect(view.actions[3]?.href).toBe("/pt/clients/client-1/log-history?clientEmail=sam.client%40example.com");
    expect(view.assignments[0]?.title).toBe("Strength Block");
    expect(view.metricCards[0]?.value).toBe("2,200");
    expect(view.workoutLogPreview[0]?.title).toBe("Upper Day");
    expect(view.workoutLogPreview[0]?.ptNoteText).toBe("Increase tempo next week.");
  });
});
