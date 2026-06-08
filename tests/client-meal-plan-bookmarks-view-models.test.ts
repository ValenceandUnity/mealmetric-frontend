import { describe, expect, it } from "vitest";

import { adaptClientMealPlanBookmarksView } from "@/lib/view-models/meal-plans";

describe("adaptClientMealPlanBookmarksView", () => {
  it("maps bookmark folders and saved meal plans into mobile bookmark sections", () => {
    const view = adaptClientMealPlanBookmarksView({
      bookmarks: {
        items: [{
          id: "folder-1",
          client_user_id: "client-1",
          name: "Favorites",
          description: "Weekly shortlist",
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

    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Folders", value: "1" }),
      expect.objectContaining({ label: "Saved plans", value: "1" }),
      expect.objectContaining({ label: "Primary folder", value: "Favorites" }),
    ]));
    expect(view.bookmarkState).toMatchObject({
      savedPlanCountLabel: "1 saved plan",
      folderCountLabel: "1 folder",
      latestFolderLabel: "Favorites",
      hasBookmarks: true,
    });
    expect(view.folders[0]).toMatchObject({
      id: "folder-1",
      name: "Favorites",
      description: "Weekly shortlist",
      itemCountLabel: "1 saved plan",
      isEmpty: false,
    });
    expect(view.folders[0]?.items[0]).toMatchObject({
      name: "Lean Fuel Week",
      vendorName: "Northside Prep",
      vendorZipLabel: "10001",
      caloriesLabel: "2,100 cal",
      priceLabel: "$59.00",
      itemCountLabel: "5 meals",
      availabilityLabel: "2 availability windows",
      statusLabel: "published",
      href: "/client/meal-plans/plan-1",
      isBookmarked: true,
    });
    expect(view.emptyState).toBeNull();
    expect(view.hasFolders).toBe(true);
    expect(view.hasSavedPlans).toBe(true);
  });

  it("returns safe empty-state values when no bookmark folders exist", () => {
    const view = adaptClientMealPlanBookmarksView({
      bookmarks: null,
    });

    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Folders", value: "0" }),
      expect.objectContaining({ label: "Saved plans", value: "0" }),
      expect.objectContaining({ label: "Primary folder", value: "Favorites not created yet" }),
    ]));
    expect(view.bookmarkState).toMatchObject({
      savedPlanCountLabel: "0 saved plans",
      folderCountLabel: "0 folders",
      latestFolderLabel: "Favorites not created yet",
      hasBookmarks: false,
    });
    expect(view.folders).toEqual([]);
    expect(view.emptyState).toMatchObject({
      title: "No saved meal plans yet",
      message: "Start exploring and bookmark plans to see them here",
    });
    expect(view.hasFolders).toBe(false);
    expect(view.hasSavedPlans).toBe(false);
  });

  it("marks folders with no saved plans as empty while preserving the folder itself", () => {
    const view = adaptClientMealPlanBookmarksView({
      bookmarks: {
        items: [{
          id: "folder-1",
          client_user_id: "client-1",
          name: "Favorites",
          description: null,
          created_at: "2026-06-07T00:00:00Z",
          updated_at: "2026-06-07T00:00:00Z",
          items: [],
        }],
        count: 1,
      },
    });

    expect(view.folders[0]).toMatchObject({
      name: "Favorites",
      description: null,
      itemCountLabel: "0 saved plans",
      isEmpty: true,
      items: [],
    });
    expect(view.emptyState).toBeNull();
    expect(view.hasFolders).toBe(true);
    expect(view.hasSavedPlans).toBe(false);
  });
});
