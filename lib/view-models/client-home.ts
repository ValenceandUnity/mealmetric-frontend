import type {
  ClientHomeResponse,
  JsonValue,
  SessionUser,
} from "@/lib/types/api";

import { extractSummary, getArray, isObject, pickOptionalText } from "@/lib/adapters/common";
import { adaptTrainingAssignments } from "@/lib/adapters/training";
import {
  formatCalories,
  formatDisplayNameFromUser,
  formatNumber,
  formatPriceCents,
  getGradient,
  getNumberLike,
  getTextLike,
  hasObjectFields,
  parseLeadingCount,
} from "@/lib/view-models/common";

export type MobileHomeHeaderView = {
  greeting: string;
  title: string;
  subtitle: string;
};

export type MobileDailyActivityView = {
  label: string;
  value: string;
  target?: string;
  unit?: string;
  progressText?: string;
};

export type MobileHomeRoutineCardView = {
  id: string | null;
  title: string;
  subtitle: string;
  taskCount: number;
  category: string;
  status: string | null;
  href: string;
  gradient: string;
};

export type MobileUpcomingMealPlanView = {
  id: string | null;
  name: string;
  vendorName: string;
  caloriesLabel: string;
  priceLabel: string;
  status: string | null;
  href: string;
};

export type MobileClientHomeView = {
  header: MobileHomeHeaderView;
  dailyActivity: MobileDailyActivityView[];
  routines: MobileHomeRoutineCardView[];
  upcomingMealPlans: MobileUpcomingMealPlanView[];
  hasOverviewData: boolean;
  hasAssignments: boolean;
  hasMealPlans: boolean;
};

function adaptHomeHeader(user?: SessionUser | null): MobileHomeHeaderView {
  return {
    greeting: formatDisplayNameFromUser(user),
    title: "Welcome",
    subtitle:
      "A mobile-ready home summary built from the current protected client overview, training, and meal-plan responses.",
  };
}

function adaptDailyActivity(overview: JsonValue | null): MobileDailyActivityView[] {
  if (isObject(overview)) {
    const intake = getNumberLike(overview, ["total_intake_calories", "calories_consumed"]);
    const expenditure = getNumberLike(overview, ["total_expenditure_calories", "calories_burned"]);
    const balance = getNumberLike(overview, ["net_calorie_balance", "net_calories"]);
    const deficitTarget = getNumberLike(overview, ["weekly_target_deficit_calories"]);
    const deficitProgress = overview.deficit_progress_percent;
    const intakeCeiling = getNumberLike(overview, ["current_intake_ceiling_calories"]);

    const typedCards: MobileDailyActivityView[] = [
      {
        label: "Intake",
        value: formatNumber(intake, "0"),
        unit: intake !== null ? "cal" : undefined,
        target: intakeCeiling !== null ? formatCalories(intakeCeiling) : undefined,
        progressText: intakeCeiling !== null ? "Current intake ceiling" : undefined,
      },
      {
        label: "Burn",
        value: formatNumber(expenditure, "0"),
        unit: expenditure !== null ? "cal" : undefined,
      },
      {
        label: "Net",
        value: formatNumber(balance, "0"),
        unit: balance !== null ? "cal" : undefined,
        progressText: deficitTarget !== null ? `Target ${formatCalories(deficitTarget)}` : undefined,
      },
    ].filter((item) => item.value !== "0" || hasObjectFields(overview));

    if (typedCards.length > 0) {
      if (deficitTarget !== null || deficitProgress !== null) {
        typedCards.push({
          label: "Deficit",
          value: deficitTarget !== null ? formatNumber(deficitTarget, "0") : "No target",
          unit: deficitTarget !== null ? "cal" : undefined,
          progressText:
            deficitProgress !== null && typeof deficitProgress !== "undefined"
              ? `${String(deficitProgress).trim()} progress`
              : undefined,
        });
      }

      return typedCards.slice(0, 4);
    }
  }

  return extractSummary(overview, 4).map((entry) => ({
    label: entry.label,
    value: entry.value,
  }));
}

function adaptHomeRoutines(assignments: JsonValue | null): MobileHomeRoutineCardView[] {
  return adaptTrainingAssignments(assignments).map((assignment, index) => ({
    id: assignment.id,
    title: assignment.title,
    subtitle: assignment.description,
    taskCount: Math.max(
      parseLeadingCount(assignment.checklistCount),
      parseLeadingCount(assignment.routineCount),
    ),
    category: assignment.coachName ? `With ${assignment.coachName}` : "Training",
    status: assignment.status,
    href: assignment.id ? `/client/training/${assignment.id}` : "/client/training",
    gradient: getGradient(index),
  }));
}

function adaptUpcomingMealPlans(value: JsonValue | null): MobileUpcomingMealPlanView[] {
  return getArray(value).flatMap((item, index) => {
    if (!isObject(item)) {
      return [];
    }

    const id = getTextLike(item, ["id", "meal_plan_id"]);
    const name =
      getTextLike(item, ["name", "title"]) ??
      `Meal plan ${index + 1}`;
    const vendorName =
      getTextLike(item, ["vendor_name", "vendor"]) ??
      "Meal plan vendor";
    const calories = getNumberLike(item, ["total_calories", "calories"]);
    const priceCents = getNumberLike(item, ["total_price_cents"]);

    return [{
      id,
      name,
      vendorName,
      caloriesLabel: formatCalories(calories, "Calories unavailable"),
      priceLabel: formatPriceCents(priceCents),
      status: pickOptionalText(item, ["status"]),
      href: id ? `/client/meal-plans/${id}` : "/client/meal-plans",
    }];
  });
}

export function adaptClientHomeView(
  data: ClientHomeResponse | null,
  user?: SessionUser | null,
): MobileClientHomeView {
  return {
    header: adaptHomeHeader(user),
    dailyActivity: adaptDailyActivity(data?.overview ?? null),
    routines: adaptHomeRoutines(data?.assignments ?? null),
    upcomingMealPlans: adaptUpcomingMealPlans(data?.mealPlans ?? null),
    hasOverviewData: hasObjectFields(data?.overview ?? null),
    hasAssignments: getArray(data?.assignments ?? null).length > 0,
    hasMealPlans: getArray(data?.mealPlans ?? null).length > 0,
  };
}
