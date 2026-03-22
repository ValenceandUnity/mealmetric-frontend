"use client";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListRow } from "@/components/ui/ListRow";
import type { SessionUser } from "@/lib/types/api";

type AccountSectionProps = {
  user: SessionUser | null;
};

export function AccountSection({ user }: AccountSectionProps) {
  if (!user) {
    return (
      <EmptyState
        title="Account details are unavailable"
        message="Session data did not return account information for this screen."
      />
    );
  }

  return (
    <Card className="client-settings-card" variant="soft">
      <ListRow
        eyebrow="Account"
        title={user.email || "Signed-in account"}
        description="This section uses only the currently available session identity."
        metadata={[
          { label: "Role", value: user.role },
          { label: "Account type", value: user.role },
        ]}
      />
    </Card>
  );
}
