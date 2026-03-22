import type { ClientHomeResponse } from "@/lib/types/api";

import { extractSummary } from "@/lib/adapters/common";
import { adaptMealPlanList } from "@/lib/adapters/meal-plans";
import { adaptTrainingAssignments } from "@/lib/adapters/training";

export type ClientHomeView = {
  summary: Array<{ label: string; value: string; hint?: string }>;
  assignments: ReturnType<typeof adaptTrainingAssignments>;
  mealPlans: ReturnType<typeof adaptMealPlanList>;
};

export function adaptClientHome(value: ClientHomeResponse): ClientHomeView {
  return {
    summary: extractSummary(value.overview, 4),
    assignments: adaptTrainingAssignments(value.assignments).slice(0, 3),
    mealPlans: adaptMealPlanList(value.mealPlans).slice(0, 3),
  };
}
