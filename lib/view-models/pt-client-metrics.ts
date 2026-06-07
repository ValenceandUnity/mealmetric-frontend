import type { JsonValue } from "@/lib/types/api";

import { isObject, pickOptionalText } from "@/lib/adapters/common";
import { hasObjectFields } from "@/lib/view-models/common";
import {
  adaptMetricsView,
  formatMetricDate,
  type MobileMetricDetailGroupView,
  type MobileMetricProgressView,
  type MobileMetricSummaryCardView,
  type MobileWeeklyMetricView,
} from "@/lib/view-models/metrics";

export type MobilePTClientMetricsFactView = {
  label: string;
  value: string;
};

export type MobilePTClientMetricsSummaryView = {
  clientId: string;
  clientDisplayLabel: string;
  clientEmail: string;
  clientStatusLabel: string;
  summaryText: string;
  factRows: MobilePTClientMetricsFactView[];
};

export type MobilePTClientMetricsActionsView = {
  clientsHref: string;
  overviewHref: string;
  assignHref: string;
  logHistoryHref: string;
};

export type MobilePTClientMetricsView = {
  summary: MobilePTClientMetricsSummaryView;
  actions: MobilePTClientMetricsActionsView;
  summaryCards: MobileMetricSummaryCardView[];
  weeklyMetrics: MobileWeeklyMetricView[];
  progress: MobileMetricProgressView;
  detailGroups: MobileMetricDetailGroupView[];
  hasClientContext: boolean;
  hasMetrics: boolean;
  hasAnyData: boolean;
  metricsSource: "route" | "detail" | "none";
};

type AdaptPTClientMetricsViewArgs = {
  clientId: string;
  detail: JsonValue | null;
  metrics: JsonValue | null;
};

function hasMetricsSnapshot(value: JsonValue | null | undefined): boolean {
  if (!isObject(value)) {
    return false;
  }

  return [
    "total_intake_calories",
    "total_expenditure_calories",
    "net_calorie_balance",
    "weekly_target_deficit_calories",
    "deficit_progress_percent",
    "current_intake_ceiling_calories",
    "current_expenditure_floor_calories",
  ].some((key) => key in value);
}

function formatClientNameFromEmail(clientId: string, email: string | null): string {
  if (!email) {
    return `Client ${clientId}`;
  }

  const [localPart] = email.split("@");
  const firstPiece = localPart
    ?.split(/[._-]+/)
    .find((item) => item.trim().length > 0);

  if (!firstPiece) {
    return email;
  }

  return `${firstPiece.charAt(0).toUpperCase()}${firstPiece.slice(1)}`;
}

function getClientObject(detail: JsonValue | null): JsonValue | null {
  if (!isObject(detail)) {
    return null;
  }

  return isObject(detail.client) ? detail.client : detail;
}

function resolveMetricsSnapshot(detail: JsonValue | null, metrics: JsonValue | null): {
  snapshot: JsonValue | null;
  source: "route" | "detail" | "none";
} {
  if (isObject(metrics) && isObject(metrics.overview) && hasMetricsSnapshot(metrics.overview)) {
    return {
      snapshot: metrics.overview,
      source: "route",
    };
  }

  if (hasMetricsSnapshot(metrics)) {
    return {
      snapshot: metrics,
      source: "route",
    };
  }

  if (isObject(detail) && isObject(detail.metrics_snapshot) && hasMetricsSnapshot(detail.metrics_snapshot)) {
    return {
      snapshot: detail.metrics_snapshot,
      source: "detail",
    };
  }

  return {
    snapshot: null,
    source: "none",
  };
}

function buildActions(clientId: string, clientEmail: string): MobilePTClientMetricsActionsView {
  const encodedEmail = clientEmail !== "Email unavailable"
    ? `?clientEmail=${encodeURIComponent(clientEmail)}`
    : "";

  return {
    clientsHref: "/pt/clients",
    overviewHref: `/pt/clients/${clientId}`,
    assignHref: `/pt/clients/${clientId}/assign`,
    logHistoryHref: `/pt/clients/${clientId}/log-history${encodedEmail}`,
  };
}

function buildSummary(args: {
  clientId: string;
  detail: JsonValue | null;
  snapshot: JsonValue | null;
  metricsSource: "route" | "detail" | "none";
  weekRangeLabel: string;
}): MobilePTClientMetricsSummaryView {
  const clientObject = getClientObject(args.detail);
  const clientEmail = pickOptionalText(clientObject, ["email", "client_email"]) ?? "Email unavailable";
  const clientDisplayLabel =
    pickOptionalText(clientObject, ["name", "full_name", "client_name", "label"]) ??
    formatClientNameFromEmail(args.clientId, clientEmail !== "Email unavailable" ? clientEmail : null);
  const clientStatusLabel =
    pickOptionalText(args.detail, ["status", "client_status", "link_status"]) ??
    pickOptionalText(clientObject, ["status"]) ??
    "Status unavailable";
  const snapshotSourceLabel =
    args.metricsSource === "route"
      ? "PT metrics route"
      : args.metricsSource === "detail"
        ? "Embedded detail snapshot"
        : "Snapshot unavailable";
  const notesPreview = pickOptionalText(args.detail, ["notes"]);

  return {
    clientId: args.clientId,
    clientDisplayLabel,
    clientEmail,
    clientStatusLabel,
    summaryText:
      notesPreview ??
      "This PT client metrics surface stays on the current protected PT detail and metrics routes, with no direct backend calls from the browser.",
    factRows: [
      { label: "Client ID", value: args.clientId },
      { label: "Email", value: clientEmail },
      { label: "Status", value: clientStatusLabel },
      { label: "Snapshot source", value: snapshotSourceLabel },
      { label: "Week window", value: args.weekRangeLabel },
      {
        label: "As of date",
        value: formatMetricDate(
          pickOptionalText(args.snapshot, ["as_of_date"]),
          "Snapshot unavailable",
        ),
      },
    ],
  };
}

export function adaptPTClientMetricsView({
  clientId,
  detail,
  metrics,
}: AdaptPTClientMetricsViewArgs): MobilePTClientMetricsView {
  const resolvedSnapshot = resolveMetricsSnapshot(detail, metrics);
  const metricsView = adaptMetricsView({
    overview: resolvedSnapshot.snapshot,
    history: null,
  });
  const weekRangeLabel = metricsView.weeklyMetrics[0]?.rangeLabel ?? "Week unavailable";
  const summary = buildSummary({
    clientId,
    detail,
    snapshot: resolvedSnapshot.snapshot,
    metricsSource: resolvedSnapshot.source,
    weekRangeLabel,
  });

  return {
    summary,
    actions: buildActions(clientId, summary.clientEmail),
    summaryCards: metricsView.summaryCards,
    weeklyMetrics: metricsView.weeklyMetrics,
    progress: metricsView.progress,
    detailGroups: metricsView.detailGroups,
    hasClientContext: hasObjectFields(detail),
    hasMetrics: metricsView.hasOverview,
    hasAnyData: hasObjectFields(detail) || metricsView.hasAnyData || hasObjectFields(metrics),
    metricsSource: resolvedSnapshot.source,
  };
}
