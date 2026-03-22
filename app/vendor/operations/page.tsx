import { RoleRoutePlaceholder } from "@/components/placeholders/RoleRoutePlaceholder";

export default function VendorOperationsPlaceholderPage() {
  return (
    <RoleRoutePlaceholder
      role="vendor"
      title="Vendor operations"
      description="Operational vendor tooling is intentionally blocked in UI-1 because the current BFF surface does not expose a dedicated operations workflow."
      links={[
        { href: "/vendor", label: "Vendor home" },
        { href: "/vendor/meal-plans", label: "Meal plans" },
        { href: "/vendor/metrics", label: "Metrics" },
      ]}
    />
  );
}
