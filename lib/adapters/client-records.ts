import type { JsonValue } from "@/lib/types/api";

import {
  extractSummary,
  formatDateRange,
  formatPrice,
  getArray,
  getId,
  isObject,
  pickOptionalText,
  pickText,
} from "@/lib/adapters/common";

export type RecordSummaryView = {
  label: string;
  value: string;
  hint?: string;
};

export type ClientRecordView = {
  id: string | null;
  eyebrow: string;
  title: string;
  description: string;
  metadata: Array<{ label: string; value: string }>;
};

export type ClientRecordsPageView = {
  summary: RecordSummaryView[];
  records: ClientRecordView[];
  debugData: JsonValue | null;
};

function getPayloadSummary(value: JsonValue | null, emptyLabel: string): RecordSummaryView[] {
  const items = getArray(value);
  const summary = extractSummary(value, 3);

  return [
    {
      label: emptyLabel,
      value: `${items.length} item${items.length === 1 ? "" : "s"}`,
      hint: "Loaded through the protected BFF route.",
    },
    ...summary,
  ].slice(0, 4);
}

function buildRecordMetadata(
  pairs: Array<{ label: string; value: string | null }>,
): Array<{ label: string; value: string }> {
  return pairs.filter((pair): pair is { label: string; value: string } => Boolean(pair.value));
}

export function adaptOrders(value: JsonValue | null): ClientRecordsPageView {
  const records = getArray(value).map((item, index) => {
    const orderId = getId(item);
    const status = pickOptionalText(item, ["status", "order_status"]);
    const mealPlan = pickOptionalText(item, ["meal_plan_name", "meal_plan", "meal_plan_id"]);
    const createdAt = pickOptionalText(item, ["created_at", "ordered_at"]);
    const updatedAt = pickOptionalText(item, ["updated_at"]);

    return {
      id: orderId,
      eyebrow: status ?? "Order",
      title: mealPlan ?? `Order ${index + 1}`,
      description:
        status && createdAt
          ? `Created ${createdAt} and currently marked ${status.toLowerCase()}.`
          : "Order activity delivered through the client BFF route.",
      metadata: buildRecordMetadata([
        { label: "Order ID", value: orderId },
        { label: "Meal plan", value: mealPlan },
        { label: "Created", value: createdAt },
        { label: "Updated", value: updatedAt },
        { label: "Price", value: formatPrice(item) },
      ]),
    };
  });

  return {
    summary: getPayloadSummary(value, "Orders"),
    records,
    debugData: records.length === 0 ? value : null,
  };
}

export function adaptPickups(value: JsonValue | null): ClientRecordsPageView {
  const records = getArray(value).map((item, index) => {
    const status = pickOptionalText(item, ["status", "pickup_status"]);
    const mealPlan = pickOptionalText(item, ["meal_plan_name", "meal_plan", "meal_plan_id"]);
    const pickupAt = pickOptionalText(item, ["pickup_at", "pickup_time", "scheduled_for"]);
    const location = pickOptionalText(item, ["location", "site", "pickup_location"]);
    const code = pickOptionalText(item, ["confirmation_code", "pickup_code"]);

    return {
      id: getId(item),
      eyebrow: status ?? "Pickup",
      title: pickupAt ?? `Pickup ${index + 1}`,
      description:
        mealPlan ?? "Pickup scheduling details surfaced through the protected client route.",
      metadata: buildRecordMetadata([
        { label: "Meal plan", value: mealPlan },
        { label: "Scheduled", value: pickupAt },
        { label: "Location", value: location },
        { label: "Confirmation", value: code },
      ]),
    };
  });

  return {
    summary: getPayloadSummary(value, "Pickups"),
    records,
    debugData: records.length === 0 ? value : null,
  };
}

export function adaptSubscriptions(value: JsonValue | null): ClientRecordsPageView {
  const records = getArray(value).map((item, index) => {
    const subscriptionId = getId(item);
    const status = pickOptionalText(item, ["status", "subscription_status"]);
    const mealPlan = pickOptionalText(item, ["meal_plan_name", "meal_plan", "meal_plan_id"]);
    const cadence = pickOptionalText(item, ["cadence", "frequency", "interval"]);
    const nextBilling = pickOptionalText(item, ["next_billing_at", "renewal_date", "next_charge_at"]);

    return {
      id: subscriptionId,
      eyebrow: status ?? "Subscription",
      title: mealPlan ?? `Subscription ${index + 1}`,
      description:
        cadence ?? "Subscription details managed through the MealMetric BFF workflow.",
      metadata: buildRecordMetadata([
        { label: "Subscription ID", value: subscriptionId },
        { label: "Status", value: status },
        { label: "Cadence", value: cadence },
        { label: "Next billing", value: nextBilling },
        { label: "Price", value: formatPrice(item) },
      ]),
    };
  });

  return {
    summary: getPayloadSummary(value, "Subscriptions"),
    records,
    debugData: records.length === 0 ? value : null,
  };
}

export type PTClientView = {
  id: string | null;
  name: string;
  summary: string;
  metadata: Array<{ label: string; value: string }>;
};

export type PTClientsPageView = {
  summary: RecordSummaryView[];
  clients: PTClientView[];
  debugData: JsonValue | null;
};

export function adaptPTClients(value: JsonValue | null): PTClientsPageView {
  const clients = getArray(value).map((item, index) => {
    const name = pickOptionalText(item, ["name", "full_name"]) ?? `Client ${index + 1}`;
    const email = pickOptionalText(item, ["email"]);
    const status = pickOptionalText(item, ["status"]);
    const joined = pickOptionalText(item, ["created_at", "joined_at"]);

    return {
      id: getId(item),
      name,
      summary: status ?? "Active client available through the PT workspace.",
      metadata: buildRecordMetadata([
        { label: "Email", value: email },
        { label: "Status", value: status },
        { label: "Joined", value: joined },
      ]),
    };
  });

  return {
    summary: getPayloadSummary(value, "Clients"),
    clients,
    debugData: clients.length === 0 ? value : null,
  };
}

export type AssignmentOptionView = {
  id: string | null;
  title: string;
  description: string;
};

export type PTAssignmentHistoryView = ClientRecordView;

export type PTAssignmentWorkspaceView = {
  summary: RecordSummaryView[];
  packageOptions: AssignmentOptionView[];
  assignments: PTAssignmentHistoryView[];
  debugData: JsonValue | null;
};

export function adaptPTAssignmentWorkspace(
  packagesValue: JsonValue | null,
  assignmentsValue: JsonValue | null,
): PTAssignmentWorkspaceView {
  const packageOptions = getArray(packagesValue).map((item, index) => ({
    id: getId(item),
    title: pickOptionalText(item, ["name", "title", "package_name"]) ?? `Package ${index + 1}`,
    description:
      pickOptionalText(item, ["description", "summary"]) ??
      "Training package available for assignment.",
  }));

  const assignments = getArray(assignmentsValue).map((item, index) => {
    const assignmentId = getId(item);
    const status = pickOptionalText(item, ["status"]);
    const packageId = pickOptionalText(item, ["training_package_id", "package_id"]);
    const startDate = pickOptionalText(item, ["start_date", "assigned_at"]);
    const endDate = pickOptionalText(item, ["end_date", "completed_at"]);

    return {
      id: assignmentId,
      eyebrow: status ?? "Assignment",
      title: packageId ?? `Assignment ${index + 1}`,
      description: formatDateRange(startDate, endDate),
      metadata: buildRecordMetadata([
        { label: "Assignment ID", value: assignmentId },
        { label: "Package", value: packageId },
        { label: "Start", value: startDate },
        { label: "End", value: endDate },
      ]),
    };
  });

  return {
    summary: [
      {
        label: "Packages",
        value: `${packageOptions.length}`,
        hint: "Assignable through /api/pt/packages.",
      },
      {
        label: "Assignments",
        value: `${assignments.length}`,
        hint: "Existing assignments for this client.",
      },
    ],
    packageOptions,
    assignments,
    debugData: assignments.length === 0 ? assignmentsValue : null,
  };
}

export type MealRecommendationOptionView = {
  id: string | null;
  title: string;
  vendor: string | null;
  description: string;
};

export type PTMealRecommendationView = ClientRecordView;

export type PTMealRecommendationWorkspaceView = {
  summary: RecordSummaryView[];
  mealPlans: MealRecommendationOptionView[];
  recommendations: PTMealRecommendationView[];
  debugData: JsonValue | null;
};

export function adaptPTMealRecommendationWorkspace(
  mealPlansValue: JsonValue | null,
  recommendationsValue: JsonValue | null,
): PTMealRecommendationWorkspaceView {
  const mealPlans = getArray(mealPlansValue).map((item, index) => ({
    id: getId(item),
    title: pickOptionalText(item, ["name", "title"]) ?? `Meal plan ${index + 1}`,
    vendor: pickOptionalText(item, ["vendor", "vendor_name"]),
    description:
      pickOptionalText(item, ["description", "summary"]) ??
      "Meal plan available for PT recommendation.",
  }));

  const recommendations = getArray(recommendationsValue).map((item, index) => {
    const recommendationId = getId(item);
    const status = pickOptionalText(item, ["status"]);
    const mealPlanId = pickOptionalText(item, ["meal_plan_id"]);
    const recommendedAt = pickOptionalText(item, ["recommended_at"]);
    const expiresAt = pickOptionalText(item, ["expires_at"]);
    const rationale = pickOptionalText(item, ["rationale", "notes"]);

    return {
      id: recommendationId,
      eyebrow: status ?? "Recommendation",
      title: mealPlanId ?? `Recommendation ${index + 1}`,
      description: rationale ?? "Recommendation delivered through the protected PT BFF route.",
      metadata: buildRecordMetadata([
        { label: "Recommendation ID", value: recommendationId },
        { label: "Meal plan", value: mealPlanId },
        { label: "Recommended", value: recommendedAt },
        { label: "Expires", value: expiresAt },
      ]),
    };
  });

  return {
    summary: [
      {
        label: "Meal plans",
        value: `${mealPlans.length}`,
        hint: "Recommendable catalog returned by the PT search route.",
      },
      {
        label: "Recommendations",
        value: `${recommendations.length}`,
        hint: "Existing client recommendations.",
      },
    ],
    mealPlans,
    recommendations,
    debugData: recommendations.length === 0 ? recommendationsValue : null,
  };
}

export type PTClientSnapshotView = {
  name: string;
  summary: string;
  metadata: Array<{ label: string; value: string }>;
};

export function adaptPTClientSnapshot(value: JsonValue | null, clientId: string): PTClientSnapshotView {
  if (!isObject(value)) {
    return {
      name: `Client ${clientId}`,
      summary: "Client detail is assembled from the PT clients collection because no dedicated detail route exists.",
      metadata: [{ label: "Client ID", value: clientId }],
    };
  }

  const name = pickOptionalText(value, ["name", "full_name"]) ?? `Client ${clientId}`;
  const email = pickOptionalText(value, ["email"]);
  const status = pickOptionalText(value, ["status"]);
  const joined = pickOptionalText(value, ["created_at", "joined_at"]);

  return {
    name,
    summary:
      status ?? "Client snapshot derived from the PT client list inside the BFF boundary.",
    metadata: buildRecordMetadata([
      { label: "Client ID", value: clientId },
      { label: "Email", value: email },
      { label: "Status", value: status },
      { label: "Joined", value: joined },
    ]),
  };
}

export function findClientById(value: JsonValue | null, clientId: string): JsonValue | null {
  return (
    getArray(value).find((item) => {
      const itemId = getId(item);
      return itemId === clientId;
    }) ?? null
  );
}

export function getCheckoutSessionSummary(value: JsonValue | null): Array<{ label: string; value: string }> {
  if (!isObject(value)) {
    return [];
  }

  return buildRecordMetadata([
    { label: "Session ID", value: pickOptionalText(value, ["session_id"]) },
    { label: "Checkout URL", value: pickText(value, ["checkout_url"], "") || null },
  ]);
}
