import { describe, expect, it } from "vitest";

import { adaptPTMealPlansView } from "@/lib/view-models/meal-plans";

describe("adaptPTMealPlansView", () => {
  it("maps PT meal-plan rows from the protected PT search payload and allows missing slug values", () => {
    const view = adaptPTMealPlansView({
      mealPlans: {
        items: [{
          id: "plan-1",
          vendor_id: "vendor-1",
          vendor_name: "Northside Prep",
          vendor_zip_code: "10001",
          name: "Lean Fuel Week",
          status: "published",
          total_price_cents: 5900,
          total_calories: 2100,
          item_count: 5,
          availability_count: 2,
        }],
        count: 1,
      },
      query: "",
    });

    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Loaded plans", value: "1" }),
      expect.objectContaining({ label: "Visible plans", value: "1" }),
      expect.objectContaining({ label: "Vendors", value: "1" }),
    ]));
    expect(view.search).toMatchObject({
      queryLabel: "All loaded plans",
      stateLabel: "All loaded plans",
    });
    expect(view.rows[0]).toMatchObject({
      name: "Lean Fuel Week",
      vendorName: "Northside Prep",
      vendorZipLabel: "10001",
      caloriesLabel: "2,100 cal",
      priceLabel: "$59.00",
      itemCountLabel: "5 meals",
      availabilityLabel: "2 availability windows",
      statusLabel: "published",
    });
    expect(view.emptyState).toBeNull();
    expect(view.hasResults).toBe(true);
    expect(view.hasAnyMealPlans).toBe(true);
  });

  it("filters loaded PT meal plans locally and returns a search-specific empty state", () => {
    const view = adaptPTMealPlansView({
      mealPlans: {
        items: [{
          id: "plan-1",
          vendor_id: "vendor-1",
          vendor_name: "Northside Prep",
          name: "Lean Fuel Week",
        }],
        count: 1,
      },
      query: "Recovery",
    });

    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Loaded plans", value: "1" }),
      expect.objectContaining({ label: "Visible plans", value: "0" }),
    ]));
    expect(view.search).toMatchObject({
      queryLabel: "Recovery",
      stateLabel: "Local filter active",
    });
    expect(view.emptyState).toMatchObject({
      title: "No PT meal plans match this search",
      message: "Adjust the local search to revisit the currently loaded PT meal-plan results.",
    });
    expect(view.hasQuery).toBe(true);
    expect(view.hasResults).toBe(false);
    expect(view.hasAnyMealPlans).toBe(true);
  });

  it("returns safe fallback labels when PT meal-plan fields are missing", () => {
    const view = adaptPTMealPlansView({
      mealPlans: [{
        id: "plan-1",
        vendor_id: "vendor-1",
        vendor_name: "Northside Prep",
        name: "Lean Fuel Week",
      }],
      query: "",
    });

    expect(view.rows[0]).toMatchObject({
      vendorZipLabel: "ZIP unavailable",
      caloriesLabel: "Calories unavailable",
      priceLabel: "Price unavailable",
      itemCountLabel: "Meal count unavailable",
      availabilityLabel: "Availability unavailable",
      statusLabel: "available",
    });
  });
});
