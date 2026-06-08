import { describe, expect, it } from "vitest";

import { adaptVendorMealPlansView } from "@/lib/view-models/vendor";

describe("adaptVendorMealPlansView", () => {
  it("maps the vendor meal-plan catalog into mobile summary cards and meal-plan rows", () => {
    const view = adaptVendorMealPlansView({
      mealPlans: {
        count: 2,
        items: [
          {
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
          },
          {
            id: "plan-2",
            vendor_id: "vendor-1",
            vendor_name: "Green Table Kitchen",
            vendor_zip_code: "10001",
            slug: "recovery-reset",
            name: "Recovery Reset",
            description: null,
            status: "draft",
            total_price_cents: 5400,
            total_calories: 1850,
            item_count: 4,
            availability_count: 1,
          },
        ],
      },
    });

    expect(view).toMatchObject({
      title: "Vendor Meal Plans",
      subtitle: "Green Table Kitchen | 10001",
      hasMealPlans: true,
    });
    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Total meal plans", value: "2" }),
      expect.objectContaining({ label: "Published", value: "1" }),
      expect.objectContaining({ label: "Draft", value: "1" }),
      expect.objectContaining({ label: "Availability entries", value: "3" }),
    ]));
    expect(view.highlight).toMatchObject({
      name: "Lean Fuel Week",
      priceLabel: "$62.00",
      caloriesLabel: "2,100 cal",
      itemCountLabel: "5 meals",
      availabilityLabel: "2 availability windows",
    });
    expect(view.mealPlans[1]).toMatchObject({
      name: "Recovery Reset",
      description: "Vendor meal-plan detail remains available through the existing vendor catalog route.",
      statusLabel: "draft",
      vendorZipLabel: "10001",
    });
  });

  it("returns safe fallback labels when meal-plan data is sparse or empty", () => {
    const view = adaptVendorMealPlansView({
      mealPlans: {
        count: 0,
        items: [{
          id: "plan-1",
          vendor_id: "vendor-1",
          vendor_name: "",
          vendor_zip_code: null,
          slug: "plan-1",
          name: "",
          description: null,
          status: "",
          total_price_cents: Number.NaN,
          total_calories: Number.NaN,
          item_count: Number.NaN,
          availability_count: Number.NaN,
        }],
      },
    });

    expect(view.mealPlans[0]).toMatchObject({
      name: "Meal plan",
      vendorName: "Vendor operations",
      vendorZipLabel: "ZIP unavailable",
      priceLabel: "Price unavailable",
      caloriesLabel: "Calories unavailable",
      statusLabel: "Status unavailable",
    });

    const emptyView = adaptVendorMealPlansView({
      mealPlans: {
        count: 0,
        items: [],
      },
    });

    expect(emptyView).toMatchObject({
      hasMealPlans: false,
      emptyTitle: "No vendor meal plans",
      highlightEmptyTitle: "No meal-plan spotlight",
    });
  });
});
