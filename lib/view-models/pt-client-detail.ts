import type { JsonValue } from "@/lib/types/api";

import {
  getArray,
  getId,
  isObject,
  pickOptionalText,
} from "@/lib/adapters/common";
import { adaptWorkoutHistory } from "@/lib/adapters/workout-history";
import {
  formatCountLabel,
  formatDateLabel,
  formatDateTimeLabel,
  formatDisplayNameFromUser,
  formatNumber,
  formatPercentage,
  getNumberLike,
} from "@/lib/view-models/common";

export type MobilePTClientActionView = {
  label: string;
  href: string;
  description: string;
  tone: "purple" | "yellow";
};

export type MobilePTClientSummaryFactView = {
  label: string;
  value: string;
};

export type MobilePTClientSummaryView = {
  clientId: string;
  clientDisplayLabel: string;
  clientEmail: string;
  clientRoleLabel: string;
  clientStatusLabel: string;
  notesPreview: string | null;
  summaryText: string;
  factRows: MobilePTClientSummaryFactView[];
};

export type MobilePTAssignmentSummaryView = {
  id: string;
  title: string;
  statusLabel: string;
  dateRangeLabel: string;
  description: string;
  metadata: Array<{ label: string; value: string }>;
};

export type MobilePTMetricSnapshotView = {
  label: string;
  value: string;
  unit?: string;
  target?: number;
  progressText?: string;
};

export type MobilePTNotesFormView = {
  fieldLabel: string;
  emptyLabel: string;
  addActionLabel: string;
  editActionLabel: string;
  saveActionLabel: string;
  cancelActionLabel: string;
};

export type MobilePTWorkoutLogPreviewView = {
  id: string;
  title: string;
  eyebrow: string;
  performedAtLabel: string;
  routineLabel: string;
  durationLabel: string;
  statusLabel: string;
  exerciseCountLabel: string;
  clientNotesText: string | null;
  ptNoteText: string | null;
  notesForm: MobilePTNotesFormView;
};

export type MobilePTClientDetailView = {
  summary: MobilePTClientSummaryView;
  actions: MobilePTClientActionView[];
  assignments: MobilePTAssignmentSummaryView[];
  metricCards: MobilePTMetricSnapshotView[];
  workoutLogPreview: MobilePTWorkoutLogPreviewView[];
  hasAssignments: boolean;
  hasMetrics: boolean;
  hasWorkoutLogs: boolean;
};

type PTClientDetailAdapterArgs = {
  clientId: string;
  detail: JsonValue | null;
  assignments: JsonValue | null;
  metrics: JsonValue | null;
  workoutLogs: JsonValue | null;
};

function formatClientNameFromEmail(clientId: string, email: string | null): string {
  if (!email) {
    return `Client ${clientId}`;
  }

  const greeting = formatDisplayNameFromUser({
    id: clientId,
    email,
    role: "client",
  });

  return greeting.replace(/^Hi,\s*/, "") || email;
}

function getClientObject(detail: JsonValue | null): JsonValue | null {
  if (!isObject(detail)) {
    return null;
  }

  return isObject(detail.client) ? detail.client : detail;
}

function getMetricsOverview(detail: JsonValue | null, metrics: JsonValue | null): JsonValue | null {
  if (isObject(metrics) && isObject(metrics.overview)) {
    return metrics.overview;
  }

  if (isObject(metrics)) {
    const candidateKeys = [
      "total_intake_calories",
      "total_expenditure_calories",
      "net_calorie_balance",
      "weekly_target_deficit_calories",
      "deficit_progress_percent",
      "current_intake_ceiling_calories",
      "current_expenditure_floor_calories",
    ];

    if (candidateKeys.some((key) => key in metrics)) {
      return metrics;
    }
  }

  if (isObject(detail) && isObject(detail.metrics_snapshot)) {
    return detail.metrics_snapshot;
  }

  return null;
}

function hasMetricsSnapshot(value: JsonValue | null): boolean {
  if (!isObject(value)) {
    return false;
  }

  return [
    getNumberLike(value, ["total_intake_calories"]),
    getNumberLike(value, ["total_expenditure_calories"]),
    getNumberLike(value, ["net_calorie_balance"]),
    getNumberLike(value, ["weekly_target_deficit_calories"]),
    getNumberLike(value, ["current_intake_ceiling_calories"]),
    getNumberLike(value, ["current_expenditure_floor_calories"]),
  ].some((item) => item !== null) || pickOptionalText(value, ["as_of_date"]) !== null;
}

function getAssignmentItems(detail: JsonValue | null, assignments: JsonValue | null): JsonValue[] {
  const routeAssignments = getArray(assignments);
  if (routeAssignments.length > 0) {
    return routeAssignments;
  }

  if (!isObject(detail)) {
    return [];
  }

  const currentAssignments = getArray(detail.current_assignments);
  if (currentAssignments.length > 0) {
    return currentAssignments;
  }

  return getArray(detail.assignments);
}

function buildActionViews(clientId: string, clientEmail: string): MobilePTClientActionView[] {
  const encodedEmail = clientEmail !== "Email unavailable"
    ? `?clientEmail=${encodeURIComponent(clientEmail)}`
    : "";

  return [
    {
      label: "Assign training",
      href: `/pt/clients/${clientId}/assign`,
      description: "Open the existing PT assignment route for this client.",
      tone: "yellow",
    },
    {
      label: "Open metrics",
      href: `/pt/clients/${clientId}/metrics`,
      description: "Review metrics from the protected PT metrics route.",
      tone: "purple",
    },
    {
      label: "Recommend meal plan",
      href: `/pt/clients/${clientId}/recommend-meal-plan`,
      description: "Use the existing PT meal-plan recommendation workflow.",
      tone: "yellow",
    },
    {
      label: "Log history",
      href: `/pt/clients/${clientId}/log-history${encodedEmail}`,
      description: "Open the existing PT workout-log history route.",
      tone: "purple",
    },
  ];
}

function buildSummaryView(
  clientId: string,
  detail: JsonValue | null,
  assignmentItems: JsonValue[],
  workoutLogCount: number,
  latestWorkoutAt: string | null,
  metricsOverview: JsonValue | null,
): MobilePTClientSummaryView {
  const clientObject = getClientObject(detail);
  const clientEmail = pickOptionalText(clientObject, ["email", "client_email"]) ?? "Email unavailable";
  const clientDisplayLabel =
    pickOptionalText(clientObject, ["name", "full_name", "client_name", "label"]) ??
    formatClientNameFromEmail(clientId, clientEmail !== "Email unavailable" ? clientEmail : null);
  const clientRoleLabel =
    pickOptionalText(clientObject, ["role"]) ??
    pickOptionalText(detail, ["role"]) ??
    "Client role unavailable";
  const clientStatusLabel =
    pickOptionalText(detail, ["status", "client_status", "link_status"]) ??
    pickOptionalText(clientObject, ["status"]) ??
    "Status unavailable";
  const notesPreview = pickOptionalText(detail, ["notes"]);
  const totalAssignmentCount = getNumberLike(detail, ["assignment_count"]) ?? assignmentItems.length;
  const currentAssignmentCount = getArray(isObject(detail) ? detail.current_assignments : null).length || assignmentItems.length;
  const workoutLogsLabel = formatCountLabel(
    getNumberLike(detail, ["workout_log_count"]) ?? workoutLogCount,
    "workout log",
  );
  const metricsSnapshotLabel = hasMetricsSnapshot(metricsOverview)
    ? formatDateLabel(pickOptionalText(metricsOverview, ["as_of_date"]), "Snapshot available")
    : "Unavailable";

  return {
    clientId,
    clientDisplayLabel,
    clientEmail,
    clientRoleLabel,
    clientStatusLabel,
    notesPreview,
    summaryText:
      notesPreview ??
      "This PT client workspace stays on the signed frontend-to-BFF path for detail, metrics, assignments, and PT notes.",
    factRows: [
      { label: "Client ID", value: clientId },
      { label: "Email", value: clientEmail },
      { label: "Role", value: clientRoleLabel },
      { label: "Status", value: clientStatusLabel },
      { label: "Assignments", value: formatCountLabel(totalAssignmentCount, "assignment") },
      { label: "Current assignments", value: formatCountLabel(currentAssignmentCount, "assignment") },
      { label: "Workout logs", value: workoutLogsLabel },
      { label: "Latest activity", value: formatDateTimeLabel(latestWorkoutAt, "No workout logs yet") },
      { label: "Metrics snapshot", value: metricsSnapshotLabel },
    ],
  };
}

function buildAssignmentViews(items: JsonValue[]): MobilePTAssignmentSummaryView[] {
  return items.map((item, index) => {
    const assignmentId = getId(item) ?? `assignment-${index + 1}`;
    const title =
      pickOptionalText(item, [
        "training_package_name",
        "package_name",
        "package_title",
        "title",
        "name",
        "training_package_id",
        "package_id",
      ]) ?? `Assignment ${index + 1}`;
    const statusLabel =
      pickOptionalText(item, ["status", "assignment_status", "completion_status"]) ?? "Status unavailable";
    const startDate = pickOptionalText(item, ["start_date", "assigned_at", "started_at", "created_at"]);
    const endDate = pickOptionalText(item, ["end_date", "completed_at", "ended_at"]);

    return {
      id: assignmentId,
      title,
      statusLabel,
      dateRangeLabel:
        startDate || endDate
          ? `${formatDateLabel(startDate, "Start unavailable")} - ${formatDateLabel(endDate, "End unavailable")}`
          : "Dates unavailable",
      description:
        pickOptionalText(item, ["description", "summary", "notes"]) ??
        "Assignment returned by the existing PT assignment route.",
      metadata: [
        { label: "Assignment ID", value: assignmentId },
        ...(pickOptionalText(item, ["training_package_id", "package_id"]) ? [{
          label: "Package ID",
          value: pickOptionalText(item, ["training_package_id", "package_id"]) ?? "",
        }] : []),
        ...(startDate ? [{ label: "Start", value: formatDateLabel(startDate) }] : []),
        ...(endDate ? [{ label: "End", value: formatDateLabel(endDate) }] : []),
      ],
    };
  });
}

function buildMetricCards(metricsOverview: JsonValue | null): MobilePTMetricSnapshotView[] {
  if (!hasMetricsSnapshot(metricsOverview)) {
    return [];
  }

  const snapshotDate = formatDateLabel(
    pickOptionalText(metricsOverview, ["as_of_date"]),
    "Snapshot date unavailable",
  );
  const deficitProgress = isObject(metricsOverview)
    ? metricsOverview.deficit_progress_percent
    : null;
  const progressValue =
    typeof deficitProgress === "string" || typeof deficitProgress === "number"
      ? deficitProgress
      : null;

  return [
    {
      label: "Intake ceiling",
      value: getNumberLike(metricsOverview, ["current_intake_ceiling_calories"]) !== null
        ? formatNumber(getNumberLike(metricsOverview, ["current_intake_ceiling_calories"]))
        : "Unavailable",
      unit: getNumberLike(metricsOverview, ["current_intake_ceiling_calories"]) !== null ? "cal" : undefined,
      progressText: `Snapshot ${snapshotDate}`,
    },
    {
      label: "Expenditure floor",
      value: getNumberLike(metricsOverview, ["current_expenditure_floor_calories"]) !== null
        ? formatNumber(getNumberLike(metricsOverview, ["current_expenditure_floor_calories"]))
        : "Unavailable",
      unit: getNumberLike(metricsOverview, ["current_expenditure_floor_calories"]) !== null ? "cal" : undefined,
      progressText: "Current floor returned by the PT metrics route.",
    },
    {
      label: "Net balance",
      value: getNumberLike(metricsOverview, ["net_calorie_balance"]) !== null
        ? formatNumber(getNumberLike(metricsOverview, ["net_calorie_balance"]))
        : "Unavailable",
      unit: getNumberLike(metricsOverview, ["net_calorie_balance"]) !== null ? "cal" : undefined,
      progressText: "Net calorie balance from the latest metrics snapshot.",
    },
    {
      label: "Weekly target deficit",
      value: getNumberLike(metricsOverview, ["weekly_target_deficit_calories"]) !== null
        ? formatNumber(getNumberLike(metricsOverview, ["weekly_target_deficit_calories"]))
        : "Unavailable",
      unit: getNumberLike(metricsOverview, ["weekly_target_deficit_calories"]) !== null ? "cal" : undefined,
      progressText: "Weekly target deficit when returned by the BFF.",
    },
    {
      label: "Deficit progress",
      value: formatPercentage(progressValue, "Unavailable"),
      target: progressValue !== null ? 100 : undefined,
      progressText: "Weekly progress toward the returned deficit target.",
    },
    {
      label: "Snapshot date",
      value: snapshotDate,
      progressText: "Metrics snapshot freshness label.",
    },
  ];
}

function buildWorkoutLogPreview(workoutLogs: JsonValue | null): MobilePTWorkoutLogPreviewView[] {
  return adaptWorkoutHistory(workoutLogs)
    .slice()
    .sort((left, right) => {
      const leftTime = left.performedAt ? new Date(left.performedAt).getTime() : 0;
      const rightTime = right.performedAt ? new Date(right.performedAt).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 3)
    .map((log, index) => ({
      id: log.id,
      title:
        log.routineContext ??
        formatDateTimeLabel(log.performedAt, `Workout log ${index + 1}`),
      eyebrow: log.mode === "general_workout" ? "Workout log" : "Routine log",
      performedAtLabel: formatDateTimeLabel(log.performedAt, "Date unavailable"),
      routineLabel: log.routineContext ?? "Routine unavailable",
      durationLabel: log.durationMinutes !== null ? `${log.durationMinutes} min` : "Duration unavailable",
      statusLabel: log.completionStatus ?? "Status unavailable",
      exerciseCountLabel: formatCountLabel(log.exerciseEntries.length, "exercise entry", "exercise entries"),
      clientNotesText: log.clientNotes,
      ptNoteText: log.ptNotes,
      notesForm: {
        fieldLabel: "PT note",
        emptyLabel: "No PT note saved yet.",
        addActionLabel: "Add PT note",
        editActionLabel: "Edit PT note",
        saveActionLabel: "Save PT note",
        cancelActionLabel: "Cancel",
      },
    }));
}

function getLatestWorkoutAt(workoutLogs: JsonValue | null): string | null {
  const items = adaptWorkoutHistory(workoutLogs)
    .map((item) => item.performedAt)
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());

  return items[0] ?? null;
}

export function adaptPTClientDetailView({
  clientId,
  detail,
  assignments,
  metrics,
  workoutLogs,
}: PTClientDetailAdapterArgs): MobilePTClientDetailView {
  const assignmentItems = getAssignmentItems(detail, assignments);
  const workoutLogPreview = buildWorkoutLogPreview(workoutLogs);
  const metricsOverview = getMetricsOverview(detail, metrics);
  const summary = buildSummaryView(
    clientId,
    detail,
    assignmentItems,
    adaptWorkoutHistory(workoutLogs).length,
    pickOptionalText(detail, ["latest_workout_log_at"]) ?? getLatestWorkoutAt(workoutLogs),
    metricsOverview,
  );

  return {
    summary,
    actions: buildActionViews(clientId, summary.clientEmail),
    assignments: buildAssignmentViews(assignmentItems),
    metricCards: buildMetricCards(metricsOverview),
    workoutLogPreview,
    hasAssignments: assignmentItems.length > 0,
    hasMetrics: hasMetricsSnapshot(metricsOverview),
    hasWorkoutLogs: workoutLogPreview.length > 0,
  };
}
