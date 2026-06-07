import type {
  PTDashboardClientSummary,
  PTDashboardResponse,
} from "@/lib/types/api";

import {
  formatCalories,
  formatDateTimeLabel,
  formatDisplayNameFromUser,
} from "@/lib/view-models/common";

export type MobilePTClientSummaryCardView = {
  id: string;
  clientDisplayLabel: string;
  assignmentCountLabel: string;
  workoutLogCountLabel: string;
  latestWorkoutLabel: string;
  intakeCeilingLabel: string;
  expenditureFloorLabel: string;
  statusBadge: string;
  overviewHref: string;
  metricsHref: string;
  trainingHref: string;
};

export type MobilePTDashboardView = {
  summaryCards: MobilePTClientSummaryCardView[];
  hasClients: boolean;
};

function adaptClientSummary(client: PTDashboardClientSummary): MobilePTClientSummaryCardView {
  return {
    id: client.id,
    clientDisplayLabel:
      formatDisplayNameFromUser({
        id: client.client.id,
        email: client.client.email,
        role: "client",
      }) || client.client.email,
    assignmentCountLabel: `${client.assignment_count} assignment${client.assignment_count === 1 ? "" : "s"}`,
    workoutLogCountLabel: `${client.workout_log_count} workout log${client.workout_log_count === 1 ? "" : "s"}`,
    latestWorkoutLabel: formatDateTimeLabel(client.latest_workout_log_at, "No workout logs yet"),
    intakeCeilingLabel: formatCalories(
      client.metrics_snapshot?.current_intake_ceiling_calories ?? null,
      "Intake ceiling unavailable",
    ),
    expenditureFloorLabel: formatCalories(
      client.metrics_snapshot?.current_expenditure_floor_calories ?? null,
      "Expenditure floor unavailable",
    ),
    statusBadge: client.status,
    overviewHref: `/pt/clients/${client.client_user_id}`,
    metricsHref: `/pt/clients/${client.client_user_id}/metrics`,
    trainingHref: `/pt/clients/${client.client_user_id}/assign`,
  };
}

export function adaptPTDashboardView(
  data: PTDashboardResponse | null,
): MobilePTDashboardView {
  const items = data?.items ?? [];

  return {
    summaryCards: items.map(adaptClientSummary),
    hasClients: items.length > 0,
  };
}
