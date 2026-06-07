import { describe, expect, it } from "vitest";

import { adaptClientHomeView } from "@/lib/view-models/client-home";
import { adaptClientTrainingView } from "@/lib/view-models/client-training";
import { adaptPTDashboardView } from "@/lib/view-models/pt-dashboard";
import { adaptPTTrainingView } from "@/lib/view-models/pt-training";
import {
  adaptMetricsView,
  formatMetricCalories,
  formatMetricPercentage,
} from "@/lib/view-models/metrics";
import { adaptMealPlanDiscoveryView } from "@/lib/view-models/meal-plans";

describe("Phase 2 view-model adapters", () => {
  it("client home adapter handles empty data", () => {
    const view = adaptClientHomeView(null, {
      id: "client-1",
      email: "client@example.com",
      role: "client",
    });

    expect(view.header.greeting).toBe("Hi, Client");
    expect(view.dailyActivity).toEqual([]);
    expect(view.routines).toEqual([]);
    expect(view.upcomingMealPlans).toEqual([]);
    expect(view.hasAssignments).toBe(false);
    expect(view.hasMealPlans).toBe(false);
  });

  it("client training adapter maps assignment, checklist, and workout-log basics", () => {
    const view = adaptClientTrainingView({
      assignments: [{
        id: "assignment-1",
        title: "Strength Block",
        description: "Four-week progression",
        routines: [{ id: "routine-1", title: "Leg Day" }],
        progress_percent: 50,
      }],
      assignmentDetail: {
        id: "assignment-1",
        title: "Strength Block",
        checklist: [
          { id: "task-1", title: "Warm up", completed: true },
          { id: "task-2", title: "Main lift", completed: false },
        ],
        routines: [{
          id: "routine-1",
          title: "Leg Day",
          label: "Monday",
          exercises: [{
            id: "exercise-1",
            exercise_name: "Back Squat",
            sets: 4,
            reps: 6,
            weight: 225,
          }],
        }],
      },
      workoutHistory: {
        items: [{
          id: "log-1",
          performed_at: "2026-06-07T10:30:00Z",
          mode: "rep",
          routine_name: "Leg Day",
          duration_minutes: 42,
          completion_status: "Completed",
        }],
      },
    });

    expect(view.assignmentCards[0]?.title).toBe("Strength Block");
    expect(view.routineDetails[0]?.title).toBe("Leg Day");
    expect(view.routineDetails[0]?.checklist[0]?.label).toBe("Warm up");
    expect(view.routineDetails[0]?.logEntries[0]?.weightLabel).toBe("225");
    expect(view.workoutJournalCards[0]?.title).toBe("Leg Day");
  });

  it("PT dashboard adapter maps client summary and hrefs", () => {
    const view = adaptPTDashboardView({
      count: 1,
      items: [{
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
          total_intake_calories: 0,
          total_expenditure_calories: 0,
          net_calorie_balance: 0,
          weekly_target_deficit_calories: null,
          deficit_progress_percent: null,
          current_intake_ceiling_calories: 2100,
          current_expenditure_floor_calories: 700,
          has_data: true,
          freshness: null,
        },
      }],
    });

    expect(view.summaryCards[0]?.clientDisplayLabel).toBe("Hi, Sam");
    expect(view.summaryCards[0]?.trainingHref).toBe("/pt/clients/client-1/assign");
    expect(view.summaryCards[0]?.metricsHref).toBe("/pt/clients/client-1/metrics");
  });

  it("metrics adapter formats calories, percentages, and missing data", () => {
    expect(formatMetricCalories(2100)).toBe("2,100 cal");
    expect(formatMetricPercentage(0.375)).toBe("37.5%");

    const view = adaptMetricsView({
      overview: {
        total_intake_calories: 2100,
        total_expenditure_calories: 1800,
        net_calorie_balance: 300,
        weekly_target_deficit_calories: 1400,
        deficit_progress_percent: 0.5,
        week_start_date: "2026-06-01",
        week_end_date: "2026-06-07",
      },
      history: {
        items: [{
          date: "2026-06-05",
          total_intake_calories: 2000,
          total_expenditure_calories: 1700,
          net_calorie_balance: 300,
        }],
      },
    });

    expect(view.summaryCards[0]?.value).toBe("2,100 cal");
    expect(view.weeklyMetrics[0]?.rangeLabel).toContain("Jun");
    expect(view.historyMetrics[0]?.metrics[0]?.value).toBe("2,000 cal");
  });

  it("meal-plan adapter formats price, calories, and bookmark state", () => {
    const view = adaptMealPlanDiscoveryView({
      mealPlans: {
        items: [{
          id: "plan-1",
          vendor_id: "vendor-1",
          vendor_name: "Northside Prep",
          vendor_zip_code: "10001",
          slug: "lean-fuel-week",
          name: "Lean Fuel Week",
          description: null,
          status: "published",
          total_price_cents: 5900,
          total_calories: 2100,
          item_count: 5,
          availability_count: 2,
        }],
        count: 1,
      },
      bookmarks: {
        items: [{
          id: "folder-1",
          client_user_id: "client-1",
          name: "Favorites",
          description: null,
          created_at: "2026-06-07T00:00:00Z",
          updated_at: "2026-06-07T00:00:00Z",
          items: [{
            id: "bookmark-1",
            meal_plan_id: "plan-1",
            note: null,
            created_at: "2026-06-07T00:00:00Z",
            meal_plan: {
              id: "plan-1",
              vendor_id: "vendor-1",
              vendor_name: "Northside Prep",
              vendor_zip_code: "10001",
              slug: "lean-fuel-week",
              name: "Lean Fuel Week",
              description: null,
              status: "published",
              total_price_cents: 5900,
              total_calories: 2100,
              item_count: 5,
              availability_count: 2,
            },
          }],
        }],
        count: 1,
      },
    });

    expect(view.rows[0]?.priceLabel).toBe("$59.00");
    expect(view.rows[0]?.caloriesLabel).toBe("2,100 cal");
    expect(view.rows[0]?.isBookmarked).toBe(true);
    expect(view.bookmarkFolders[0]?.itemCountLabel).toBe("1 saved plan");
  });

  it("all adapters avoid throwing on missing optional fields", () => {
    expect(() =>
      adaptClientTrainingView({
        assignments: [],
        assignmentDetail: { routines: [{ exercises: [{}] }] },
        workoutHistory: { items: [{}] },
      }),
    ).not.toThrow();

    expect(() =>
      adaptPTTrainingView({
        rosterCategories: { items: [], count: 0 },
        rosterClients: { items: [], count: 0 },
        packages: [{ id: "pkg-1" }],
        assignments: [{}],
      }),
    ).not.toThrow();

    expect(() =>
      adaptMealPlanDiscoveryView({
        mealPlans: [{ id: "plan-1", vendor_id: "vendor-1", vendor_name: "Vendor", slug: "plan" }],
      }),
    ).not.toThrow();
  });
});
