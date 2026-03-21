import type { ClientHomeResponse, JsonValue, PTDashboardResponse } from "@/lib/types/api";

import { extractSummary, getArray, pickOptionalText } from "@/lib/adapters/common";
import { adaptMealPlanList } from "@/lib/adapters/meal-plans";
import { adaptTrainingAssignments } from "@/lib/adapters/training";

export type ClientHomeView = {
  summary: Array<{ label: string; value: string; hint?: string }>;
  assignments: ReturnType<typeof adaptTrainingAssignments>;
  mealPlans: ReturnType<typeof adaptMealPlanList>;
};

export type PTDashboardView = {
  summary: Array<{ label: string; value: string; hint?: string }>;
  clients: Array<{ id: string | null; title: string; subtitle: string }>;
  packages: Array<{ id: string | null; title: string; subtitle: string }>;
};

function getPreviewItems(value: JsonValue | null, fallbackLabel: string) {
  return getArray(value).map((item, index) => ({
    id:
      pickOptionalText(item, ["id", "client_id", "training_package_id", "package_id"]) ??
      null,
    title:
      pickOptionalText(item, ["name", "title", "package_name", "full_name"]) ??
      `${fallbackLabel} ${index + 1}`,
    subtitle:
      pickOptionalText(item, ["email", "description", "status", "summary"]) ??
      "Live data returned through the BFF.",
  }));
}

export function adaptClientHome(value: ClientHomeResponse): ClientHomeView {
  return {
    summary: extractSummary(value.overview, 4),
    assignments: adaptTrainingAssignments(value.assignments).slice(0, 3),
    mealPlans: adaptMealPlanList(value.mealPlans).slice(0, 3),
  };
}

export function adaptPTDashboard(value: PTDashboardResponse): PTDashboardView {
  const summary = extractSummary(value.profile, 4);

  return {
    summary:
      summary.length > 0
        ? summary
        : [
            { label: "Clients", value: String(getArray(value.clients).length) },
            { label: "Packages", value: String(getArray(value.packages).length) },
          ],
    clients: getPreviewItems(value.clients, "Client").slice(0, 4),
    packages: getPreviewItems(value.packages, "Package").slice(0, 4),
  };
}
