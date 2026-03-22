import { RoleRoutePlaceholder } from "@/components/placeholders/RoleRoutePlaceholder";

export default function PTMetricsPlaceholderPage() {
  return (
    <RoleRoutePlaceholder
      role="pt"
      title="PT metrics"
      description="PT metrics remain client-specific in the current backend surface. This top-level destination is a structural placeholder for the shell."
      links={[
        { href: "/pt", label: "PT home" },
        { href: "/pt/clients", label: "Open clients" },
      ]}
    />
  );
}
