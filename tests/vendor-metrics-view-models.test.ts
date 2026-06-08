import { describe, expect, it } from "vitest";

import { adaptVendorMetricsView } from "@/lib/view-models/vendor";

describe("adaptVendorMetricsView", () => {
  it("maps vendor metrics into mobile summary cards, health cards, and route actions", () => {
    const view = adaptVendorMetricsView({
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
    });

    expect(view).toMatchObject({
      title: "Vendor Metrics",
      subtitle: "Green Table Kitchen | 10001",
      vendorName: "Green Table Kitchen",
      vendorZipLabel: "10001",
      hasMetrics: true,
    });
    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Total meal plans", value: "4" }),
      expect.objectContaining({ label: "Published meal plans", value: "3" }),
      expect.objectContaining({ label: "Vendor ZIP", value: "10001" }),
    ]));
    expect(view.healthCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Published coverage", value: "3", target: "4" }),
      expect.objectContaining({ label: "Draft coverage", value: "1", target: "4" }),
      expect.objectContaining({ label: "Availability entries", value: "7" }),
      expect.objectContaining({ label: "Open pickup windows", value: "2" }),
    ]));
    expect(view.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ href: "/vendor", ctaLabel: "Open dashboard" }),
      expect.objectContaining({ href: "/vendor/meal-plans", ctaLabel: "Open meal plans" }),
      expect.objectContaining({ href: "/vendor/account", ctaLabel: "Open account" }),
      expect.objectContaining({ href: "/vendor/operations", isPlaceholder: true }),
    ]));
  });

  it("returns safe fallback labels when the vendor metrics payload is sparse", () => {
    const view = adaptVendorMetricsView({
      metrics: {
        vendor_id: "vendor-1",
        vendor_name: "",
        zip_code: null,
        total_meal_plans: Number.NaN,
        published_meal_plans: Number.NaN,
        draft_meal_plans: Number.NaN,
        total_availability_entries: Number.NaN,
        open_pickup_windows: Number.NaN,
      },
    });

    expect(view).toMatchObject({
      vendorName: "Vendor operations",
      vendorZipLabel: "ZIP unavailable",
      hasMetrics: false,
      unavailableTitle: "Vendor metrics unavailable",
    });
    expect(view.summaryCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Total meal plans", value: "Unavailable" }),
      expect.objectContaining({ label: "Open pickup windows", value: "Unavailable" }),
      expect.objectContaining({ label: "Vendor ZIP", value: "ZIP unavailable" }),
    ]));
    expect(view.healthCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Published coverage", value: "Unavailable" }),
      expect.objectContaining({ label: "Draft coverage", value: "Unavailable" }),
    ]));
  });
});
