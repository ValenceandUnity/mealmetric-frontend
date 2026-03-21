import type { JsonValue } from "@/lib/types/api";

import {
  formatDateRange,
  getArray,
  getId,
  isObject,
  pickOptionalText,
  pickText,
  startCase,
} from "@/lib/adapters/common";

export type TrainingAssignmentView = {
  id: string | null;
  title: string;
  description: string;
  packageId: string | null;
  status: string | null;
  schedule: string;
  checklistCount: string;
};

export type AssignmentDetailView = {
  summary: TrainingAssignmentView;
  checklist: string[];
  routines: string[];
};

function getChecklistItems(value: JsonValue | null): string[] {
  if (!isObject(value)) {
    return [];
  }

  const keys = ["checklist", "items", "routines", "exercises", "tasks"];
  for (const key of keys) {
    const items = getArray(value[key]);
    if (items.length > 0) {
      return items.map((item, index) => {
        const label = pickOptionalText(item, ["name", "title", "label", "exercise_name"]);
        return label ?? `${startCase(key.slice(0, -1))} ${index + 1}`;
      });
    }
  }

  return [];
}

export function adaptTrainingAssignments(value: JsonValue | null): TrainingAssignmentView[] {
  return getArray(value).map((item, index) => {
    const checklist = getChecklistItems(item);

    return {
      id: getId(item),
      title:
        pickOptionalText(item, ["title", "name", "package_name", "assignment_name"]) ??
        `Assignment ${index + 1}`,
      description:
        pickOptionalText(item, ["description", "summary", "notes"]) ??
        "Structured training assignment delivered through the BFF.",
      packageId: pickOptionalText(item, ["training_package_id", "package_id"]),
      status: pickOptionalText(item, ["status"]),
      schedule: formatDateRange(
        pickOptionalText(item, ["start_date", "assigned_at"]),
        pickOptionalText(item, ["end_date", "completed_at"]),
      ),
      checklistCount:
        checklist.length > 0
          ? `${checklist.length} checkpoint${checklist.length === 1 ? "" : "s"}`
          : "Checklist pending",
    };
  });
}

export function adaptAssignmentDetail(value: JsonValue | null): AssignmentDetailView {
  const summary = adaptTrainingAssignments(value ? [value] : [])[0] ?? {
    id: null,
    title: "Assignment detail",
    description: "No assignment detail returned.",
    packageId: null,
    status: null,
    schedule: "Dates not provided",
    checklistCount: "Checklist pending",
  };

  return {
    summary,
    checklist: getChecklistItems(value),
    routines: getArray(value).map((item, index) => pickText(item, ["name", "title"], `Routine ${index + 1}`)),
  };
}
