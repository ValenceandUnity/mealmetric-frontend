import { describe, expect, it } from "vitest";

import { adaptPTRecommendationPageView } from "@/lib/view-models/meal-plans";

describe("adaptPTRecommendationPageView", () => {
  it("maps the existing PT recommendation workspace into mobile cards and actions", () => {
    const view = adaptPTRecommendationPageView({
      clientId: "client-1",
      mealPlans: {
        items: [{
          id: "plan-1",
          vendor_id: "vendor-1",
          vendor_name: "Northside Prep",
          vendor_zip_code: "10001",
          name: "Lean Fuel Week",
          description: "High-protein work-week plan.",
          status: "published",
          total_price_cents: 5900,
          total_calories: 2100,
          item_count: 5,
          availability_count: 2,
        }],
        count: 1,
      },
      recommendations: [{
        id: "recommendation-1",
        meal_plan_id: "plan-1",
        status: "active",
        rationale: "Protein target support",
        recommended_at: "2026-06-07T14:00:00Z",
      }],
      query: "",
      selectedMealPlanId: "plan-1",
      submitting: false,
    });

    expect(view.client).toMatchObject({
      clientId: "client-1",
      clientDisplayLabel: "Client client-1",
      clientEmailLabel: "Email unavailable",
    });
    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Meal plans", value: "1" }),
      expect.objectContaining({ label: "Recommendations", value: "1" }),
      expect.objectContaining({ label: "Selected plan", value: "Lean Fuel Week" }),
    ]));
    expect(view.mealPlans[0]).toMatchObject({
      name: "Lean Fuel Week",
      vendorName: "Northside Prep",
      vendorZipLabel: "10001",
      caloriesLabel: "2,100 cal",
      priceLabel: "$59.00",
      itemCountLabel: "5 meals",
      availabilityLabel: "2 availability windows",
      isSelected: true,
      canSelect: true,
    });
    expect(view.action).toMatchObject({
      selectedMealPlanId: "plan-1",
      selectedMealPlanLabel: "Lean Fuel Week",
      canSubmit: true,
      submitLabel: "Create recommendation",
      hasSelectablePlans: true,
    });
    expect(view.recommendations[0]).toMatchObject({
      eyebrow: "active",
      title: "plan-1",
      description: "Protein target support",
    });
  });

  it("filters meal plans locally without changing recommendation history", () => {
    const view = adaptPTRecommendationPageView({
      clientId: "client-1",
      mealPlans: {
        items: [
          {
            id: "plan-1",
            vendor_id: "vendor-1",
            vendor_name: "Northside Prep",
            name: "Lean Fuel Week",
          },
          {
            id: "plan-2",
            vendor_id: "vendor-2",
            vendor_name: "Recovery Kitchen",
            name: "Recovery Reset",
          },
        ],
        count: 2,
      },
      recommendations: [],
      query: "Recovery",
      selectedMealPlanId: "plan-1",
      submitting: false,
    });

    expect(view.search).toMatchObject({
      queryLabel: "Recovery",
      stateLabel: "Local filter active",
    });
    expect(view.mealPlans).toHaveLength(1);
    expect(view.mealPlans[0]?.name).toBe("Recovery Reset");
    expect(view.action.selectedMealPlanLabel).toBe("Lean Fuel Week");
    expect(view.hasRecommendations).toBe(false);
  });

  it("returns safe fallback labels and disabled action state when required data is missing", () => {
    const view = adaptPTRecommendationPageView({
      clientId: "client-1",
      mealPlans: [{
        vendor_id: "vendor-1",
        vendor_name: "Northside Prep",
        name: "Lean Fuel Week",
      }],
      recommendations: [],
      query: "",
      selectedMealPlanId: "",
      submitting: false,
    });

    expect(view.mealPlans[0]).toMatchObject({
      vendorZipLabel: "ZIP unavailable",
      caloriesLabel: "Calories unavailable",
      priceLabel: "Price unavailable",
      itemCountLabel: "Meal count unavailable",
      availabilityLabel: "Availability unavailable",
      canSelect: false,
    });
    expect(view.action).toMatchObject({
      selectedMealPlanLabel: "No meal plan selected",
      canSubmit: false,
    });
    expect(view.recommendationEmptyState).toMatchObject({
      title: "No recommendations returned",
    });
  });
});
