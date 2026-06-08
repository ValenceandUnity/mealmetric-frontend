import { describe, expect, it } from "vitest";

import { adaptVendorDashboardView } from "@/lib/view-models/vendor";

describe("adaptVendorDashboardView", () => {
  it("maps vendor identity, catalog, metrics, and route actions into the mobile dashboard view", () => {
    const view = adaptVendorDashboardView({
      profile: {
        user_id: "vendor-user-1",
        email: "vendor@example.com",
        vendor_ids: ["vendor-1"],
        default_vendor: {
          id: "vendor-1",
          slug: "green-table",
          name: "Green Table Kitchen",
          description: "Prepared meals for local pickup.",
          zip_code: "10001",
          status: "active",
          meal_plan_count: 4,
        },
        vendors: [{
          id: "vendor-1",
          slug: "green-table",
          name: "Green Table Kitchen",
          description: "Prepared meals for local pickup.",
          zip_code: "10001",
          status: "active",
          meal_plan_count: 4,
        }],
      },
      metrics: {
        vendor_id: "vendor-1",
        vendor_name: "Green Table Kitchen",
        zip_code: "10001",
        total_meal_plans: 4,
        published_meal_plans: 3,
        draft_meal_plans: 1,
        total_availability_entries: 7,
        open_pickup_windows: 2,
      },
      mealPlans: {
        count: 4,
        items: [{
          id: "plan-1",
          vendor_id: "vendor-1",
          vendor_name: "Green Table Kitchen",
          vendor_zip_code: "10001",
          slug: "lean-fuel-week",
          name: "Lean Fuel Week",
          description: "High-protein lunches and dinners.",
          status: "published",
          total_price_cents: 6200,
          total_calories: 2100,
          item_count: 5,
          availability_count: 2,
        }],
      },
      sessionEmail: "vendor@example.com",
    });

    expect(view.title).toBe("Vendor Portal");
    expect(view.identity).toMatchObject({
      vendorName: "Green Table Kitchen",
      vendorEmailLabel: "vendor@example.com",
      vendorSlugLabel: "green-table",
      vendorZipLabel: "10001",
      vendorStatusLabel: "active",
      vendorMealPlanCountLabel: "4 meal plans",
      defaultVendorStateLabel: "Default vendor ready",
    });
    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Meal plans", value: "4" }),
      expect.objectContaining({ label: "Published", value: "3" }),
      expect.objectContaining({ label: "Draft", value: "1" }),
    ]));
    expect(view.catalog.highlight).toMatchObject({
      name: "Lean Fuel Week",
      priceLabel: "$62.00",
      caloriesLabel: "2,100 cal",
      itemCountLabel: "5 meals",
      availabilityLabel: "2 availability windows",
    });
    expect(view.metrics.cards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Vendor ZIP", value: "10001" }),
      expect.objectContaining({ label: "Open pickup windows", value: "2" }),
    ]));
    expect(view.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ href: "/vendor/meal-plans", ctaLabel: "Open meal plans" }),
      expect.objectContaining({ href: "/vendor/operations", isPlaceholder: true }),
    ]));
  });

  it("returns safe fallbacks when default vendor, metrics, and catalog detail are sparse", () => {
    const view = adaptVendorDashboardView({
      profile: {
        user_id: "vendor-user-1",
        email: "vendor@example.com",
        vendor_ids: [],
        default_vendor: null,
        vendors: [],
      },
      metrics: null,
      mealPlans: {
        count: 0,
        items: [],
      },
      sessionEmail: "vendor@example.com",
    });

    expect(view.identity).toMatchObject({
      vendorName: "Vendor operations",
      vendorSlugLabel: "Slug unavailable",
      vendorZipLabel: "ZIP unavailable",
      defaultVendorStateLabel: "Default vendor unavailable",
      contextNote: expect.stringContaining("No default vendor is configured"),
    });
    expect(view.catalog).toMatchObject({
      hasMealPlans: false,
      emptyTitle: "No vendor meal plans",
    });
    expect(view.metrics).toMatchObject({
      hasMetrics: false,
      unavailableTitle: "Vendor metrics unavailable",
    });
  });
});
