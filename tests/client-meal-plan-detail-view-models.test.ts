import { describe, expect, it } from "vitest";

import { adaptMealPlanDetailView } from "@/lib/view-models/meal-plans";

describe("adaptMealPlanDetailView", () => {
  it("maps supported meal-plan detail fields into the mobile detail view", () => {
    const view = adaptMealPlanDetailView({
      mealPlanId: "plan-1",
      mealPlan: {
        id: "plan-1",
        vendor_name: "Northside Prep",
        vendor_zip_code: "10001",
        name: "Lean Fuel Week",
        description: "High-protein lunches for the work week.",
        status: "published",
        total_price_cents: 5900,
        total_calories: 2100,
        item_count: 5,
        availability_count: 2,
        pickup_location: "Chelsea Kitchen",
        pickup_notes: "Bring your order confirmation.",
        protein_grams: 120,
        carbs_grams: 180,
        fat_grams: 70,
        meals: [{
          name: "Chicken Bowl",
          quantity: 1,
          calories: 450,
          total_price_cents: 1299,
          category: "Lunch",
          portion_size: "Standard",
          servings: 1,
          description: "Lunch pack",
        }],
        availability_windows: [{
          name: "Mon pickup",
          window_label: "Monday 10:00 AM to 12:00 PM",
          status: "open",
          remaining_inventory: 8,
          pickup_location: "Chelsea Kitchen",
          pickup_notes: "Curbside collection",
        }],
      },
      bookmarks: {
        items: [{
          id: "folder-1",
          client_user_id: "client-1",
          name: "Favorites",
          description: null,
          created_at: "2026-06-07T00:00:00Z",
          updated_at: "2026-06-07T00:00:00Z",
          items: [{
            id: "bookmark-1",
            meal_plan_id: "plan-1",
            note: null,
            created_at: "2026-06-07T00:00:00Z",
            meal_plan: {
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
            },
          }],
        }],
        count: 1,
      },
    });

    expect(view.hero).toMatchObject({
      id: "plan-1",
      title: "Lean Fuel Week",
      vendorName: "Northside Prep",
      vendorZipLabel: "10001",
      description: "High-protein lunches for the work week.",
      priceLabel: "$59.00",
      caloriesLabel: "2,100 cal",
      itemCountLabel: "5 meals",
      availabilityLabel: "2 availability windows",
      statusLabel: "published",
    });
    expect(view.macros).toEqual(expect.arrayContaining([
      { label: "Protein", value: "120g" },
      { label: "Carbs", value: "180g" },
      { label: "Fat", value: "70g" },
    ]));
    expect(view.meals[0]).toMatchObject({
      name: "Chicken Bowl",
      quantityLabel: "1",
      caloriesLabel: "450 cal",
      priceLabel: "$12.99",
      noteLabel: "Lunch pack",
      metadata: [
        { label: "Type", value: "Lunch" },
        { label: "Portion", value: "Standard" },
        { label: "Servings", value: "1" },
      ],
    });
    expect(view.availability[0]).toMatchObject({
      title: "Mon pickup",
      statusLabel: "open",
      windowLabel: "Monday 10:00 AM to 12:00 PM",
      inventoryLabel: "8",
      locationLabel: "Chelsea Kitchen",
      noteLabel: "Curbside collection",
    });
    expect(view.vendorDetails).toEqual(expect.arrayContaining([
      { label: "Vendor", value: "Northside Prep" },
      { label: "ZIP", value: "10001" },
      { label: "Location", value: "Chelsea Kitchen" },
      { label: "Notes", value: "Bring your order confirmation." },
    ]));
    expect(view.bookmark).toMatchObject({
      isBookmarked: true,
      label: "Saved",
    });
    expect(view.checkout).toMatchObject({
      mealPlanId: "plan-1",
      canCheckout: true,
      disabledReason: null,
    });
  });

  it("returns safe fallback values when detail fields are missing", () => {
    const view = adaptMealPlanDetailView({
      mealPlan: null,
      mealPlanId: null,
      bookmarks: null,
    });

    expect(view.hero).toMatchObject({
      id: null,
      title: "Meal plan detail",
      vendorName: "Meal plan vendor",
      vendorZipLabel: "ZIP unavailable",
      description: "Meal-plan configuration available through the signed BFF flow.",
      priceLabel: "Price unavailable",
      caloriesLabel: "Calories unavailable",
      itemCountLabel: "Meal count unavailable",
      availabilityLabel: "Availability unavailable",
      statusLabel: "Status unavailable",
      heroImageUrl: null,
    });
    expect(view.macros).toEqual([]);
    expect(view.meals).toEqual([]);
    expect(view.availability).toEqual([]);
    expect(view.vendorDetails).toEqual([]);
    expect(view.bookmark).toMatchObject({
      isBookmarked: false,
      label: "Not saved",
    });
    expect(view.checkout).toMatchObject({
      mealPlanId: null,
      canCheckout: false,
      disabledReason: "Meal plan identifier unavailable.",
    });
    expect(view.hasMeals).toBe(false);
    expect(view.hasAvailability).toBe(false);
    expect(view.hasVendorDetails).toBe(false);
  });
});
