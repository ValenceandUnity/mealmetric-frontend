import { describe, expect, it } from "vitest";

import { adaptClientMealPlansView } from "@/lib/view-models/meal-plans";

describe("adaptClientMealPlansView", () => {
  it("returns safe fallback state when meal plans and bookmarks are missing", () => {
    const view = adaptClientMealPlansView({
      mealPlans: null,
      bookmarks: null,
      budgetMax: "",
      budgetDuration: "one day",
      customDuration: "",
      zipCode: "",
      trackedLocations: [],
    });

    expect(view.hasMealPlans).toBe(false);
    expect(view.hasBookmarks).toBe(false);
    expect(view.hasAnyData).toBe(false);
    expect(view.budgetMarker.amountLabel).toBe("Budget open");
    expect(view.budgetMarker.zipSummaryLabel).toBe("All ZIPs");
    expect(view.bookmarkState.savedPlanCountLabel).toBe("0 saved plans");
    expect(view.zipFilter.items).toEqual([]);
    expect(view.emptyState).toMatchObject({
      title: "No meal plans returned",
    });
  });

  it("maps meal-plan, bookmark, budget, and ZIP tracker data into mobile directory sections", () => {
    const view = adaptClientMealPlansView({
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
      budgetMax: "25",
      budgetDuration: "custom duration",
      customDuration: "three days",
      zipCode: "10001",
      trackedLocations: [
        {
          id: "zip-10001",
          label: "10001",
          kind: "zip",
          selected: true,
        },
        {
          id: "city-boston",
          label: "Boston",
          kind: "city",
          selected: false,
        },
      ],
    });

    expect(view.hasMealPlans).toBe(true);
    expect(view.hasBookmarks).toBe(true);
    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Loaded plans", value: "1" }),
      expect.objectContaining({ label: "Saved plans", value: "1" }),
      expect.objectContaining({ label: "Vendors", value: "1" }),
      expect.objectContaining({ label: "Active ZIPs", value: "1" }),
    ]));
    expect(view.rows[0]).toMatchObject({
      name: "Lean Fuel Week",
      vendorZipLabel: "10001",
      itemCountLabel: "5 meals",
      availabilityLabel: "2 availability windows",
      bookmarkLabel: "Saved",
      isBookmarked: true,
    });
    expect(view.budgetMarker).toMatchObject({
      amountLabel: "$25",
      durationLabel: "three days",
      zipSummaryLabel: "1 active ZIP",
    });
    expect(view.budgetMarker.activeChips).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Max $25" }),
      expect.objectContaining({ label: "three days" }),
      expect.objectContaining({ label: "1 active ZIP" }),
      expect.objectContaining({ label: "1 city note" }),
    ]));
    expect(view.bookmarkState).toMatchObject({
      savedPlanCountLabel: "1 saved plan",
      folderCountLabel: "1 folder",
      latestFolderLabel: "Favorites",
      hasBookmarks: true,
    });
    expect(view.emptyState).toBeNull();
  });

  it("returns a filter-specific empty state when backend-supported ZIP or budget filters are active", () => {
    const view = adaptClientMealPlansView({
      mealPlans: {
        items: [],
        count: 0,
      },
      bookmarks: {
        items: [],
        count: 0,
      },
      budgetMax: "25",
      budgetDuration: "one week",
      customDuration: "",
      zipCode: "10001",
      trackedLocations: [{
        id: "zip-10001",
        label: "10001",
        kind: "zip",
        selected: true,
      }],
    });

    expect(view.emptyState).toMatchObject({
      title: "No meal plans match current filters",
    });
  });
});
