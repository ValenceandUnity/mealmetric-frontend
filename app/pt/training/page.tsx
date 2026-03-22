import { RoleRoutePlaceholder } from "@/components/placeholders/RoleRoutePlaceholder";

export default function PTTrainingPlaceholderPage() {
  return (
    <RoleRoutePlaceholder
      role="pt"
      title="PT training"
      description="Training actions stay inside the client workspace in UI-1. This placeholder keeps the PT 5-tab shell complete without inventing new workflow screens."
      links={[
        { href: "/pt", label: "PT home" },
        { href: "/pt/clients", label: "Open clients" },
      ]}
    />
  );
}
