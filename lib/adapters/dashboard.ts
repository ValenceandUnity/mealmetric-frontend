import type { ClientHomeResponse, JsonValue, PTDashboardResponse } from "@/lib/types/api";

import {
  extractSummary,
  getArray,
  getId,
  pickOptionalText,
} from "@/lib/adapters/common";
import { adaptMealPlanList } from "@/lib/adapters/meal-plans";
import { adaptTrainingAssignments } from "@/lib/adapters/training";

export type ClientHomeView = {
  summary: Array<{ label: string; value: string; hint?: string }>;
  assignments: ReturnType<typeof adaptTrainingAssignments>;
  mealPlans: ReturnType<typeof adaptMealPlanList>;
};

export type PTDashboardView = {
  profile: {
    title: string;
    description: string;
    chips: string[];
  };
  summary: Array<{ label: string; value: string; hint?: string }>;
  clients: Array<{
    id: string | null;
    title: string;
    subtitle: string;
    metadata: Array<{ label: string; value: string }>;
    status?: string;
  }>;
  packages: Array<{
    id: string | null;
    title: string;
    subtitle: string;
    metadata: Array<{ label: string; value: string }>;
    status?: string;
  }>;
};

function getPreviewItems(value: JsonValue | null, fallbackLabel: string) {
  return getArray(value).map((item, index) => {
    const status = pickOptionalText(item, ["status"]);
    const email = pickOptionalText(item, ["email"]);
    const createdAt = pickOptionalText(item, ["created_at", "joined_at", "assigned_at"]);
    const packageId = pickOptionalText(item, ["training_package_id", "package_id"]);

    return {
      id:
        getId(item) ??
        pickOptionalText(item, ["client_id", "training_package_id", "package_id"]) ??
        null,
      title:
        pickOptionalText(item, ["name", "title", "package_name", "full_name"]) ??
        `${fallbackLabel} ${index + 1}`,
      subtitle:
        pickOptionalText(item, ["description", "summary", "email"]) ??
        status ??
        "Live data returned through the BFF.",
      metadata: [
        ...(email ? [{ label: "Email", value: email }] : []),
        ...(status ? [{ label: "Status", value: status }] : []),
        ...(createdAt ? [{ label: "Created", value: createdAt }] : []),
        ...(packageId ? [{ label: "Package ID", value: packageId }] : []),
      ],
      status: status ?? undefined,
    };
  });
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
  const clients = getPreviewItems(value.clients, "Client").slice(0, 4);
  const packages = getPreviewItems(value.packages, "Package").slice(0, 4);

  return {
    profile: {
      title: pickOptionalText(value.profile, ["name", "full_name"]) ?? "PT workspace",
      description:
        pickOptionalText(value.profile, ["email", "bio", "summary"]) ??
        "Operational coaching workspace connected through the PT BFF routes.",
      chips: [
        `${getArray(value.clients).length} client${getArray(value.clients).length === 1 ? "" : "s"}`,
        `${getArray(value.packages).length} package${getArray(value.packages).length === 1 ? "" : "s"}`,
      ],
    },
    summary:
      summary.length > 0
        ? summary
        : [
            { label: "Clients", value: String(getArray(value.clients).length) },
            { label: "Packages", value: String(getArray(value.packages).length) },
          ],
    clients,
    packages,
  };
}
