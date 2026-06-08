import { describe, expect, it } from "vitest";

import { adaptClientMealPlanSearchView } from "@/lib/view-models/meal-plans";

describe("adaptClientMealPlanSearchView", () => {
  it("maps search results and tracked ZIP state into the mobile search view", () => {
    const view = adaptClientMealPlanSearchView({
      mealPlans: {
        items: [{
          id: "plan-1",
          vendor_id: "vendor-1",
          vendor_name: "Northside Prep",
          vendor_zip_code: "10001",
          slug: "lean-fuel-week",
          name: "Lean Fuel Week",
          description: null,
          status: "published",
          total_price_cents: 5900,
          total_calories: 2100,
          item_count: 5,
          availability_count: 2,
        }],
        count: 1,
      },
      query: "Lean Fuel",
      activeZipCodes: ["10001", "10002"],
    });

    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Results", value: "1" }),
      expect.objectContaining({ label: "Tracked ZIPs", value: "2" }),
      expect.objectContaining({ label: "Query", value: "Lean Fuel" }),
    ]));
    expect(view.filters).toMatchObject({
      queryLabel: "Lean Fuel",
      activeZipCountLabel: "2 active ZIPs",
      activeZipChips: ["10001", "10002"],
      hasActiveZipFilter: true,
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
      href: "/client/meal-plans/plan-1",
    });
    expect(view.emptyState).toBeNull();
    expect(view.hasQuery).toBe(true);
    expect(view.hasResults).toBe(true);
  });

  it("returns a query-specific empty state when no search results exist", () => {
    const view = adaptClientMealPlanSearchView({
      mealPlans: {
        items: [],
        count: 0,
      },
      query: "Lean Fuel",
      activeZipCodes: ["10001"],
    });

    expect(view.emptyState).toMatchObject({
      title: "No meal plans match your search",
      message: "Try a different meal plan name or vendor.",
    });
    expect(view.filters).toMatchObject({
      queryLabel: "Lean Fuel",
      activeZipCountLabel: "1 active ZIP",
    });
    expect(view.hasQuery).toBe(true);
    expect(view.hasResults).toBe(false);
  });

  it("returns a catalog empty state when no query and no results exist", () => {
    const view = adaptClientMealPlanSearchView({
      mealPlans: null,
      query: "",
      activeZipCodes: [],
    });

    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Results", value: "0" }),
      expect.objectContaining({ label: "Tracked ZIPs", value: "0" }),
      expect.objectContaining({ label: "Query", value: "All meal plans" }),
    ]));
    expect(view.filters).toMatchObject({
      queryLabel: "All meal plans",
      activeZipCountLabel: "0 active ZIPs",
      activeZipChips: [],
      hasActiveZipFilter: false,
    });
    expect(view.emptyState).toMatchObject({
      title: "No meal plans are available",
      message: "No meal plans are available in the current catalog.",
    });
    expect(view.hasQuery).toBe(false);
    expect(view.hasResults).toBe(false);
  });
});
