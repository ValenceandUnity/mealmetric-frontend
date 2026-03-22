import { LogoutButton } from "@/components/LogoutButton";
import { RoleRoutePlaceholder } from "@/components/placeholders/RoleRoutePlaceholder";

export default function VendorAccountPlaceholderPage() {
  return (
    <RoleRoutePlaceholder
      role="vendor"
      title="Vendor account"
      description="This route is limited to shell-level account framing in UI-1. It does not introduce vendor profile editing or new backend dependencies."
      links={[{ href: "/vendor", label: "Vendor home" }]}
      actions={<LogoutButton />}
    />
  );
}
