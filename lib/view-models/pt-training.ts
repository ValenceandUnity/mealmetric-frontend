import type {
  JsonValue,
  PTRosterCategory,
  PTRosterCategoryListResponse,
  PTRosterClient,
  PTRosterClientListResponse,
} from "@/lib/types/api";

import { getArray, getId, isObject, pickOptionalText } from "@/lib/adapters/common";
import { adaptPTAssignmentWorkspace } from "@/lib/adapters/client-records";
import {
  formatCountLabel,
  getGradient,
  getNestedArray,
  getTextLike,
} from "@/lib/view-models/common";

export type MobilePTFolderTileView = {
  id: string;
  title: string;
  countLabel: string;
  href: string;
  active: boolean;
  summary: string;
};

export type MobilePTPortfolioCardView = {
  id: string | null;
  title: string;
  subtitle: string;
  description: string;
  tag: string | null;
  coverLabel: string | null;
  href: string;
  gradient: string;
};

export type MobilePTRoutineCardView = {
  id: string | null;
  title: string;
  subtitle: string;
  taskCountLabel: string;
  tag: string | null;
  href: string;
  gradient: string;
};

export type MobilePTTrainingView = {
  folders: MobilePTFolderTileView[];
  portfolioCards: MobilePTPortfolioCardView[];
  routineCards: MobilePTRoutineCardView[];
  hasPackages: boolean;
};

function readCategories(
  value: PTRosterCategoryListResponse | JsonValue | null | undefined,
): PTRosterCategory[] {
  const items = isObject(value) && Array.isArray(value.items) ? value.items : getArray(value);

  return items.flatMap((item) => {
    if (!isObject(item)) {
      return [];
    }

    const id = getTextLike(item, ["id"]);
    const name = getTextLike(item, ["name"]);
    const ptUserId = getTextLike(item, ["pt_user_id"]);
    const createdAt = getTextLike(item, ["created_at"]);
    const updatedAt = getTextLike(item, ["updated_at"]);
    if (!id || !name || !ptUserId || !createdAt || !updatedAt) {
      return [];
    }

    return [{
      id,
      name,
      pt_user_id: ptUserId,
      created_at: createdAt,
      updated_at: updatedAt,
    }];
  });
}

function readClients(
  value: PTRosterClientListResponse | JsonValue | null | undefined,
): PTRosterClient[] {
  const items = isObject(value) && Array.isArray(value.items) ? value.items : getArray(value);

  return items.flatMap((item) => {
    if (!isObject(item)) {
      return [];
    }

    const id = getTextLike(item, ["id"]);
    const clientUserId = getTextLike(item, ["client_user_id"]);
    const ptUserId = getTextLike(item, ["pt_user_id"]);
    const status = getTextLike(item, ["status"]);
    const clientName = getTextLike(item, ["client_name"]);
    const clientEmail = getTextLike(item, ["client_email"]);
    const createdAt = getTextLike(item, ["created_at"]);
    const updatedAt = getTextLike(item, ["updated_at"]);

    if (!id || !clientUserId || !ptUserId || !status || !clientName || !clientEmail || !createdAt || !updatedAt) {
      return [];
    }

    return [{
      id,
      client_user_id: clientUserId,
      pt_user_id: ptUserId,
      status,
      client_name: clientName,
      client_email: clientEmail,
      roster_category_id: getTextLike(item, ["roster_category_id"]),
      roster_name: getTextLike(item, ["roster_name"]),
      created_at: createdAt,
      updated_at: updatedAt,
    }];
  });
}

function adaptFolders(args: {
  rosterCategories: PTRosterCategoryListResponse | JsonValue | null;
  rosterClients: PTRosterClientListResponse | JsonValue | null;
  selectedCategoryId?: string | null;
}): MobilePTFolderTileView[] {
  const categories = readCategories(args.rosterCategories);
  const clients = readClients(args.rosterClients);
  const counts = new Map<string, number>();

  for (const client of clients) {
    if (!client.roster_category_id) {
      continue;
    }
    counts.set(client.roster_category_id, (counts.get(client.roster_category_id) ?? 0) + 1);
  }

  return [
    {
      id: "all-clients",
      title: "All Clients",
      countLabel: formatCountLabel(clients.length, "client"),
      href: "/pt/clients",
      active: args.selectedCategoryId == null,
      summary: "Open the full PT roster workspace.",
    },
    ...categories.map((category) => ({
      id: category.id,
      title: category.name,
      countLabel: formatCountLabel(counts.get(category.id) ?? 0, "client"),
      href: `/pt/clients?category_id=${encodeURIComponent(category.id)}`,
      active: args.selectedCategoryId === category.id,
      summary: "PT-owned roster category.",
    })),
  ];
}

function adaptPortfolioCards(
  packagesValue: JsonValue | null,
  clientId?: string | null,
): MobilePTPortfolioCardView[] {
  const workspace = adaptPTAssignmentWorkspace(packagesValue, null);

  return workspace.packageOptions.map((item, index) => ({
    id: item.id,
    title: item.title,
    subtitle: item.id ? `Package ${item.id}` : "Training package",
    description: item.description,
    tag: null,
    coverLabel: null,
    href: clientId ? `/pt/clients/${clientId}/assign` : "/pt/clients",
    gradient: getGradient(index),
  }));
}

function adaptNestedRoutineCards(
  packagesValue: JsonValue | null,
  clientId?: string | null,
): MobilePTRoutineCardView[] {
  const packageItems = getArray(packagesValue);
  const routineCards = packageItems.flatMap((item, packageIndex) => {
    const routines = getNestedArray(item, ["routines", "workouts", "sessions"]);
    if (routines.length === 0) {
      return [];
    }

    return routines.flatMap((routine, routineIndex) => {
      if (!isObject(routine) && typeof routine !== "string") {
        return [];
      }

      const title =
        typeof routine === "string"
          ? routine
          : getTextLike(routine, ["name", "title", "routine_name"]) ?? `Routine ${routineIndex + 1}`;
      const tasks =
        typeof routine === "string"
          ? 0
          : getNestedArray(routine, ["exercises", "items", "tasks"]).length;

      return [{
        id: typeof routine === "string" ? null : (getTextLike(routine, ["id", "routine_id"]) ?? null),
        title,
        subtitle:
          typeof routine === "string"
            ? "Routine returned by the PT package route."
            : getTextLike(routine, ["description", "summary", "label"]) ??
              "Routine returned by the PT package route.",
        taskCountLabel: tasks > 0 ? formatCountLabel(tasks, "task") : "Tasks pending",
        tag:
          typeof routine === "string"
            ? null
            : getTextLike(routine, ["category", "tag", "label"]),
        href: clientId ? `/pt/clients/${clientId}/assign` : "/pt/clients",
        gradient: getGradient(packageIndex + routineIndex),
      }];
    });
  });

  return routineCards;
}

function adaptFallbackRoutineCards(
  assignmentsValue: JsonValue | null,
  clientId?: string | null,
): MobilePTRoutineCardView[] {
  const workspace = adaptPTAssignmentWorkspace(null, assignmentsValue);

  return workspace.assignments.map((assignment, index) => ({
    id: assignment.id,
    title: assignment.title,
    subtitle: assignment.description,
    taskCountLabel: "Tasks pending",
    tag: assignment.eyebrow,
    href: clientId ? `/pt/clients/${clientId}/assign` : "/pt/clients",
    gradient: getGradient(index),
  }));
}

export function adaptPTTrainingView(args: {
  rosterCategories?: PTRosterCategoryListResponse | JsonValue | null;
  rosterClients?: PTRosterClientListResponse | JsonValue | null;
  packages?: JsonValue | null;
  assignments?: JsonValue | null;
  clientId?: string | null;
  selectedCategoryId?: string | null;
}): MobilePTTrainingView {
  const routineCards = adaptNestedRoutineCards(args.packages ?? null, args.clientId);

  return {
    folders: adaptFolders({
      rosterCategories: args.rosterCategories ?? null,
      rosterClients: args.rosterClients ?? null,
      selectedCategoryId: args.selectedCategoryId,
    }),
    portfolioCards: adaptPortfolioCards(args.packages ?? null, args.clientId),
    routineCards:
      routineCards.length > 0
        ? routineCards
        : adaptFallbackRoutineCards(args.assignments ?? null, args.clientId),
    hasPackages: getArray(args.packages ?? null).length > 0,
  };
}
