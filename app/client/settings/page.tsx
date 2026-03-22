"use client";

import { useState } from "react";

import { AccountSection } from "@/components/settings/AccountSection";
import { AppControls } from "@/components/settings/AppControls";
import { PreferencesSection } from "@/components/settings/PreferencesSection";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { useSessionBootstrap } from "@/lib/client/session";

const APP_VERSION = "0.1.0";

export default function ClientSettingsPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(false);

  if (status === "loading") {
    return <LoadingBlock title="Loading settings" message="Validating your client session." />;
  }

  if (status !== "authenticated") {
    return <LoadingBlock title="Redirecting" message="Client settings require an authenticated client session." />;
  }

  return (
    <PageShell title="Settings" user={user} className="app-shell--client-settings">
      <Card className="client-settings-hero" variant="accent" as="section">
        <PageHeader
          eyebrow="Client settings"
          title="Settings"
          description="Lightweight account and app controls using existing session data and local-only UI state."
          chips={[
            darkMode ? "Dark mode preview on" : "Dark mode preview off",
            notifications ? "Notifications preview on" : "Notifications preview off",
          ]}
        />
      </Card>

      <SectionBlock
        eyebrow="Account"
        title="Account"
        description="Signed-in account details surfaced from the current session only."
      >
        <AccountSection user={user} />
      </SectionBlock>

      <SectionBlock
        eyebrow="Preferences"
        title="Preferences"
        description="These controls are local to the UI and are not persisted."
      >
        <PreferencesSection
          darkMode={darkMode}
          notifications={notifications}
          onToggleDarkMode={() => setDarkMode((current) => !current)}
          onToggleNotifications={() => setNotifications((current) => !current)}
        />
      </SectionBlock>

      <SectionBlock
        eyebrow="Controls"
        title="App Controls"
        description="Session and product information for the current client workspace."
      >
        <AppControls appVersion={APP_VERSION} />
      </SectionBlock>
    </PageShell>
  );
}
