import { describe, expect, it } from "vitest";

import { adaptVendorAccountView } from "@/lib/view-models/vendor";

describe("adaptVendorAccountView", () => {
  it("maps vendor account data into a read-only mobile account view", () => {
    const view = adaptVendorAccountView({
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
      sessionEmail: "vendor@example.com",
      sessionRole: "vendor",
    });

    expect(view).toMatchObject({
      title: "Vendor Account",
      subtitle: "Green Table Kitchen | 10001",
      hasProfileData: true,
      readOnlyTitle: "Read-only account state",
    });
    expect(view.identity).toMatchObject({
      accountEmailLabel: "vendor@example.com",
      accountRoleLabel: "Vendor",
      vendorsCountLabel: "1 vendor membership",
      defaultVendorStateLabel: "Default vendor ready",
    });
    expect(view.profile).toMatchObject({
      vendorName: "Green Table Kitchen",
      vendorSlugLabel: "green-table",
      vendorZipLabel: "10001",
      vendorStatusLabel: "active",
      vendorMealPlanCountLabel: "4 meal plans",
      hasDefaultVendor: true,
    });
    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Account role", value: "Vendor" }),
      expect.objectContaining({ label: "Vendor memberships", value: "1" }),
      expect.objectContaining({ label: "Default vendor meal plans", value: "4" }),
      expect.objectContaining({ label: "Vendor ZIP", value: "10001" }),
    ]));
    expect(view.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ href: "/vendor", ctaLabel: "Open dashboard" }),
      expect.objectContaining({ href: "/vendor/meal-plans", ctaLabel: "Open meal plans" }),
      expect.objectContaining({ href: "/vendor/metrics", ctaLabel: "Open metrics" }),
      expect.objectContaining({ href: "/vendor/operations", isPlaceholder: true }),
    ]));
  });

  it("returns safe fallback labels when default vendor data is missing", () => {
    const view = adaptVendorAccountView({
      profile: {
        user_id: "vendor-user-1",
        email: "",
        vendor_ids: [],
        default_vendor: null,
        vendors: [],
      },
      sessionEmail: "vendor@example.com",
      sessionRole: "vendor",
    });

    expect(view).toMatchObject({
      subtitle: "Vendor operations | ZIP unavailable",
      hasProfileData: true,
    });
    expect(view.identity).toMatchObject({
      accountEmailLabel: "vendor@example.com",
      accountRoleLabel: "Vendor",
      defaultVendorStateLabel: "Default vendor unavailable",
    });
    expect(view.profile).toMatchObject({
      vendorName: "Vendor operations",
      vendorSlugLabel: "Slug unavailable",
      vendorZipLabel: "ZIP unavailable",
      vendorStatusLabel: "Vendor account",
      hasDefaultVendor: false,
      unavailableTitle: "Default vendor unavailable",
    });
    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Default vendor meal plans", value: "Unavailable" }),
      expect.objectContaining({ label: "Vendor ZIP", value: "ZIP unavailable" }),
    ]));
  });
});
