import type {
  JsonValue,
  PTDashboardClientSummary,
  PTDashboardResponse,
} from "@/lib/types/api";

import { getArray, isObject, pickOptionalText } from "@/lib/adapters/common";
import {
  formatCalories,
  formatDateLabel,
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

export type MobilePTMetricsSummaryCardView = {
  label: string;
  value: string;
  progressText?: string;
};

export type MobilePTMetricsCoverageCardView = {
  label: string;
  valueLabel: string;
  totalLabel: string;
  progressText: string;
  progressValue: number | null;
  hasData: boolean;
};

export type MobilePTMetricsComparisonCardView = {
  id: string;
  clientDisplayLabel: string;
  clientEmail: string;
  rosterLabel: string;
  assignmentCountLabel: string;
  workoutLogCountLabel: string;
  latestWorkoutLabel: string;
  intakeCeilingLabel: string;
  expenditureFloorLabel: string;
  statusBadge: string;
  metricsNote: string;
  hasMetricsSnapshot: boolean;
  overviewHref: string;
  metricsHref: string;
};

export type MobilePTMetricsEmptyStateView = {
  title: string;
  message: string;
  actionHref: string;
  actionLabel: string;
};

export type MobilePTMetricsView = {
  summaryCards: MobilePTMetricsSummaryCardView[];
  coverageCards: MobilePTMetricsCoverageCardView[];
  comparisonCards: MobilePTMetricsComparisonCardView[];
  hasClients: boolean;
  hasAnyData: boolean;
  emptyState: MobilePTMetricsEmptyStateView | null;
};

type PTRosterClientRecord = {
  id: string;
  clientUserId: string;
  clientName: string | null;
  clientEmail: string | null;
  rosterLabel: string | null;
  status: string | null;
};

function formatDateOnlyLabel(value: string | null | undefined, fallback = "Date unavailable"): string {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

      if ([year, month, day].every((part) => Number.isFinite(part))) {
        return new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(year, month - 1, day, 12)));
      }
    }
  }

  return formatDateLabel(value, fallback);
}

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

function readRosterClients(value: JsonValue | null | undefined): PTRosterClientRecord[] {
  return getArray(value).flatMap((item, index) => {
    if (!isObject(item)) {
      return [];
    }

    const clientUserId = pickOptionalText(item, ["client_user_id"]) ?? `client-${index + 1}`;

    return [{
      id: pickOptionalText(item, ["id"]) ?? `link-${index + 1}`,
      clientUserId,
      clientName: pickOptionalText(item, ["client_name"]),
      clientEmail: pickOptionalText(item, ["client_email"]),
      rosterLabel: pickOptionalText(item, ["roster_name"]),
      status: pickOptionalText(item, ["status"]),
    }];
  });
}

function formatStatusLabel(status: string | null | undefined): string {
  if (!status || status.trim().length === 0) {
    return "Status unavailable";
  }

  return status;
}

function calculateCoverageValue(current: number, total: number): number | null {
  if (total <= 0) {
    return null;
  }

  return Math.max(0, Math.min(100, (current / total) * 100));
}

function createEmptyState(linkedClientCount: number): MobilePTMetricsEmptyStateView | null {
  if (linkedClientCount > 0) {
    return null;
  }

  return {
    title: "PT metrics start with linked clients",
    message:
      "Top-level PT metrics become actionable after clients are linked. Until then, use the client portal to invite or organize clients, then open each linked client's metrics page for detail.",
    actionHref: "/pt/clients",
    actionLabel: "Open clients",
  };
}

export function adaptPTMetricsView(args: {
  dashboard: PTDashboardResponse | null;
  rosterClients?: JsonValue | null;
}): MobilePTMetricsView {
  const dashboardItems = args.dashboard?.items ?? [];
  const rosterClients = readRosterClients(args.rosterClients ?? null);
  const dashboardByClientId = new Map(
    dashboardItems.map((item) => [item.client_user_id, item] satisfies [string, PTDashboardClientSummary]),
  );
  const rosterByClientId = new Map(
    rosterClients.map((item) => [item.clientUserId, item] satisfies [string, PTRosterClientRecord]),
  );
  const linkedClientIds = Array.from(
    new Set([...dashboardByClientId.keys(), ...rosterByClientId.keys()]),
  );

  const activeClientCount = linkedClientIds.filter((clientId) => {
    const rosterStatus = rosterByClientId.get(clientId)?.status?.toLowerCase();
    const dashboardStatus = dashboardByClientId.get(clientId)?.status?.toLowerCase();
    return rosterStatus === "active" || dashboardStatus === "active";
  }).length;
  const totalAssignments = dashboardItems.reduce((sum, item) => sum + item.assignment_count, 0);
  const totalWorkoutLogs = dashboardItems.reduce((sum, item) => sum + item.workout_log_count, 0);
  const clientsWithActivity = dashboardItems.filter(
    (item) => typeof item.latest_workout_log_at === "string" && item.latest_workout_log_at.trim().length > 0,
  ).length;
  const clientsWithSnapshots = dashboardItems.filter((item) => item.metrics_snapshot !== null).length;
  const latestWorkout = dashboardItems
    .map((item) => item.latest_workout_log_at)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;

  const summaryCards: MobilePTMetricsSummaryCardView[] = [
    {
      label: "Linked clients",
      value: formatNumber(linkedClientIds.length),
      progressText: linkedClientIds.length > 0 ? "PT-linked clients available for comparison." : "No linked clients yet.",
    },
    {
      label: "Active clients",
      value: formatNumber(activeClientCount),
      progressText: linkedClientIds.length > 0 ? "Linked clients currently marked active." : "Active status appears after clients are linked.",
    },
    {
      label: "Assignments",
      value: dashboardItems.length > 0 ? formatNumber(totalAssignments) : "Unavailable",
      progressText: dashboardItems.length > 0 ? "Assignments aggregated from the current PT dashboard route." : "Assignment totals require PT dashboard summary data.",
    },
    {
      label: "Workout logs",
      value: dashboardItems.length > 0 ? formatNumber(totalWorkoutLogs) : "Unavailable",
      progressText: dashboardItems.length > 0 ? "Workout log totals aggregated from linked-client summaries." : "Workout log totals require PT dashboard summary data.",
    },
    {
      label: "Clients with activity",
      value: dashboardItems.length > 0 ? formatNumber(clientsWithActivity) : "Unavailable",
      progressText: dashboardItems.length > 0 ? "Linked clients with at least one recent logged workout." : "Recent activity requires PT dashboard summary data.",
    },
    {
      label: "Latest activity",
      value: dashboardItems.length > 0 ? formatDateTimeLabel(latestWorkout, "No workout logs yet") : "Unavailable",
      progressText: latestWorkout ? "Most recent linked-client workout activity." : "Latest activity appears after linked-client workout logs arrive.",
    },
  ];

  const coverageCards: MobilePTMetricsCoverageCardView[] = linkedClientIds.length > 0
    ? [
      {
        label: "Active clients",
        valueLabel: `${activeClientCount}/${linkedClientIds.length}`,
        totalLabel: `${formatNumber(linkedClientIds.length)} linked clients`,
        progressText: "Linked clients currently marked active.",
        progressValue: calculateCoverageValue(activeClientCount, linkedClientIds.length),
        hasData: true,
      },
      {
        label: "Clients with activity",
        valueLabel: dashboardItems.length > 0 ? `${clientsWithActivity}/${linkedClientIds.length}` : "Unavailable",
        totalLabel: `${formatNumber(linkedClientIds.length)} linked clients`,
        progressText:
          dashboardItems.length > 0
            ? "Linked clients with recorded workout activity."
            : "Workout activity coverage requires PT dashboard summary data.",
        progressValue: dashboardItems.length > 0
          ? calculateCoverageValue(clientsWithActivity, linkedClientIds.length)
          : null,
        hasData: dashboardItems.length > 0,
      },
      {
        label: "Snapshot coverage",
        valueLabel: dashboardItems.length > 0 ? `${clientsWithSnapshots}/${linkedClientIds.length}` : "Unavailable",
        totalLabel: `${formatNumber(linkedClientIds.length)} linked clients`,
        progressText:
          dashboardItems.length > 0
            ? "Linked clients with current intake and expenditure snapshots."
            : "Nutrition snapshot coverage requires PT dashboard summary data.",
        progressValue: dashboardItems.length > 0
          ? calculateCoverageValue(clientsWithSnapshots, linkedClientIds.length)
          : null,
        hasData: dashboardItems.length > 0,
      },
    ]
    : [];

  const comparisonCards: MobilePTMetricsComparisonCardView[] = linkedClientIds.map((clientId) => {
    const dashboardClient = dashboardByClientId.get(clientId) ?? null;
    const rosterClient = rosterByClientId.get(clientId) ?? null;
    const clientEmail = rosterClient?.clientEmail ?? dashboardClient?.client.email ?? "Client email unavailable";
    const clientDisplayLabel =
      rosterClient?.clientName ??
      formatDisplayNameFromUser({
        id: dashboardClient?.client.id ?? clientId,
        email: clientEmail,
        role: "client",
      }) ??
      clientEmail;

    return {
      id: dashboardClient?.id ?? rosterClient?.id ?? clientId,
      clientDisplayLabel,
      clientEmail,
      rosterLabel: rosterClient?.rosterLabel ?? "No roster category",
      assignmentCountLabel:
        dashboardClient !== null
          ? `${dashboardClient.assignment_count} assignment${dashboardClient.assignment_count === 1 ? "" : "s"}`
          : "Open client detail for assignments",
      workoutLogCountLabel:
        dashboardClient !== null
          ? `${dashboardClient.workout_log_count} workout log${dashboardClient.workout_log_count === 1 ? "" : "s"}`
          : "Open client metrics for workout logs",
      latestWorkoutLabel:
        dashboardClient !== null
          ? formatDateTimeLabel(dashboardClient.latest_workout_log_at, "No workout logs yet")
          : "Open client metrics for detail",
      intakeCeilingLabel: formatCalories(
        dashboardClient?.metrics_snapshot?.current_intake_ceiling_calories ?? null,
        "Open client metrics for detail",
      ),
      expenditureFloorLabel: formatCalories(
        dashboardClient?.metrics_snapshot?.current_expenditure_floor_calories ?? null,
        "Open client metrics for detail",
      ),
      statusBadge: formatStatusLabel(rosterClient?.status ?? dashboardClient?.status),
      metricsNote:
        dashboardClient?.metrics_snapshot !== null && dashboardClient?.metrics_snapshot !== undefined
          ? `Snapshot as of ${formatDateOnlyLabel(dashboardClient.metrics_snapshot.as_of_date, "date unavailable")}.`
          : "Open client metrics for detail.",
      hasMetricsSnapshot: dashboardClient?.metrics_snapshot !== null && dashboardClient?.metrics_snapshot !== undefined,
      overviewHref: `/pt/clients/${clientId}`,
      metricsHref: `/pt/clients/${clientId}/metrics`,
    };
  });

  return {
    summaryCards,
    coverageCards,
    comparisonCards,
    hasClients: linkedClientIds.length > 0,
    hasAnyData: linkedClientIds.length > 0,
    emptyState: createEmptyState(linkedClientIds.length),
  };
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
