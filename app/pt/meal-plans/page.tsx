import { RoleRoutePlaceholder } from "@/components/placeholders/RoleRoutePlaceholder";

export default function PTMealPlansPlaceholderPage() {
  return (
    <RoleRoutePlaceholder
      role="pt"
      title="PT meal plans"
      description="Meal-plan recommendation work still lives under the PT client workspace. This placeholder exists only to complete shell routing for UI-1."
      links={[
        { href: "/pt", label: "PT home" },
        { href: "/pt/clients", label: "Open clients" },
      ]}
    />
  );
}
