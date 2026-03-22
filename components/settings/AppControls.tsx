"use client";

import Link from "next/link";

import { LogoutButton } from "@/components/LogoutButton";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";

type AppControlsProps = {
  appVersion: string;
};

export function AppControls({ appVersion }: AppControlsProps) {
  return (
    <div className="client-settings-controls">
      <Card className="client-settings-card" variant="soft">
        <ListRow
          eyebrow="App"
          title="MealMetric"
          description="Training-aware client workspace connected through protected BFF routes."
          metadata={[
            { label: "Version", value: appVersion },
            { label: "Support", value: "Help link below is informational only" },
          ]}
          footer={<Link className="link-button" href="#">Support (Info Only)</Link>}
        />
      </Card>

      <Card className="client-settings-card" variant="soft">
        <ListRow
          eyebrow="Session"
          title="App controls"
          description="Use the existing logout flow to end the current session safely."
        />
        <LogoutButton />
      </Card>
    </div>
  );
}
