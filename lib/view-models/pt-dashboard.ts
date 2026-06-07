import type {
  PTDashboardClientSummary,
  PTDashboardResponse,
} from "@/lib/types/api";

import {
  formatCalories,
  formatDateTimeLabel,
  formatDisplayNameFromUser,
  formatNumber,
} from "@/lib/view-models/common";

export type MobilePTDashboardStatView = {
  label: string;
  value: string;
  unit?: string;
  progressText?: string;
};

export type MobilePTClientSummaryCardView = {
  id: string;
  clientDisplayLabel: string;
  clientEmail: string;
  notesPreview: string | null;
  assignmentCountLabel: string;
  workoutLogCountLabel: string;
  latestWorkoutLabel: string;
  intakeCeilingLabel: string;
  expenditureFloorLabel: string;
  statusBadge: string;
  overviewHref: string;
  metricsHref: string;
  trainingHref: string;
  recommendationHref: string;
  logHistoryHref: string;
};

export type MobilePTDashboardView = {
  stats: MobilePTDashboardStatView[];
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
    clientEmail: client.client.email,
    notesPreview: client.notes,
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
    recommendationHref: `/pt/clients/${client.client_user_id}/recommend-meal-plan`,
    logHistoryHref: `/pt/clients/${client.client_user_id}/log-history?clientEmail=${encodeURIComponent(client.client.email)}`,
  };
}

function adaptDashboardStats(items: PTDashboardClientSummary[]): MobilePTDashboardStatView[] {
  const linkedClientCount = items.length;
  const totalAssignments = items.reduce((sum, item) => sum + item.assignment_count, 0);
  const totalWorkoutLogs = items.reduce((sum, item) => sum + item.workout_log_count, 0);
  const mostRecentWorkout = items
    .map((item) => item.latest_workout_log_at)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
  const leadSnapshot = items.find((item) => item.metrics_snapshot !== null) ?? null;
  const leadClientLabel = leadSnapshot
    ? formatDisplayNameFromUser({
        id: leadSnapshot.client.id,
        email: leadSnapshot.client.email,
        role: "client",
      })
    : null;
  const intakeCeiling = leadSnapshot?.metrics_snapshot?.current_intake_ceiling_calories ?? null;
  const expenditureFloor = leadSnapshot?.metrics_snapshot?.current_expenditure_floor_calories ?? null;

  return [
    {
      label: "Linked clients",
      value: formatNumber(linkedClientCount),
      progressText: linkedClientCount > 0 ? "PT-linked client roster" : "No linked clients yet",
    },
    {
      label: "Assignments",
      value: formatNumber(totalAssignments),
      progressText: linkedClientCount > 0 ? "Total current assignments across linked clients" : "Unavailable",
    },
    {
      label: "Workout logs",
      value: formatNumber(totalWorkoutLogs),
      progressText: totalWorkoutLogs > 0 ? "Total logged workout activity" : "No workout activity yet",
    },
    {
      label: "Latest activity",
      value: formatDateTimeLabel(mostRecentWorkout, "No workout logs yet"),
      progressText: mostRecentWorkout ? "Most recent linked-client workout" : "Unavailable",
    },
    {
      label: "Intake ceiling",
      value: intakeCeiling !== null
        ? formatNumber(intakeCeiling)
        : "Unavailable",
      unit: intakeCeiling !== null ? "cal" : undefined,
      progressText: leadClientLabel ? `Snapshot from ${leadClientLabel}` : "Snapshot unavailable",
    },
    {
      label: "Expenditure floor",
      value: expenditureFloor !== null
        ? formatNumber(expenditureFloor)
        : "Unavailable",
      unit: expenditureFloor !== null ? "cal" : undefined,
      progressText: leadClientLabel ? `Snapshot from ${leadClientLabel}` : "Snapshot unavailable",
    },
  ];
}

export function adaptPTDashboardView(
  data: PTDashboardResponse | null,
): MobilePTDashboardView {
  const items = data?.items ?? [];

  return {
    stats: adaptDashboardStats(items),
    summaryCards: items.map(adaptClientSummary),
    hasClients: items.length > 0,
  };
}
