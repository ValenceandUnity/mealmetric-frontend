"use client";

import { useState } from "react";

import { LogoutButton } from "@/components/LogoutButton";
import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileHeaderBackgroundSettings } from "@/components/mobile/MobileHeaderBackgroundSettings";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { useTheme } from "@/components/theme/ThemeProvider";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";

type ClientSettingsRouteSurfaceProps = {
  appVersion: string;
};

type StateCardProps = {
  title: string;
  message: string;
  role?: "status" | "alert";
};

type ToggleButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function StateCard({ title, message, role = "status" }: StateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
      <div className="mobile-section__copy" role={role} aria-live="polite">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
    </MobileCard>
  );
}

function ToggleButton({ active, label, onClick }: ToggleButtonProps) {
  return (
    <button
      type="button"
      className={[
        "mobile-pill",
        active ? "mobile-pill--yellow" : "mobile-pill--purple",
        "mobile-focus-ring",
      ].join(" ")}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function ClientSettingsRouteSurface({ appVersion }: ClientSettingsRouteSurfaceProps) {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const { theme, setTheme } = useTheme();
  const [notificationsPreview, setNotificationsPreview] = useState(false);
  const darkMode = theme === "dark";

  if (status === "loading") {
    return <LoadingBlock title="Loading settings" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return (
      <LoadingBlock
        title="Redirecting"
        message="Client settings require an authenticated client session."
      />
    );
  }

  return (
    <MobileAppShell
      user={user}
      activePath="/client/settings"
      greeting={formatDisplayNameFromUser(user)}
      title="Client Settings"
      subtitle="Lightweight account and app controls using existing session data, with theme stored locally in this browser."
    >
      <MobileHeaderBackgroundSettings role="client" />

      <MobileSection
        eyebrow="Client settings"
        title="Settings overview"
        description="Account information on this page stays session-only. Theme and notification preview state remain browser-local and do not introduce backend-backed preferences."
      >
        <MobileCard as="article" variant="accent" className="mobile-pt-detail-action-card">
          <div className="mobile-pt-client-card__header">
            <div className="mobile-section__copy">
              <p className="mobile-section__eyebrow">Client settings</p>
              <h2 className="mobile-section__title">Settings</h2>
              <p className="mobile-section__description">
                Lightweight account and app controls using existing session data, with theme stored locally in this browser.
              </p>
            </div>
            <span className="mobile-pill mobile-pill--yellow">{darkMode ? "Theme: Dark" : "Theme: Light"}</span>
          </div>

          <div className="mobile-pt-actions">
            <span className="mobile-pill mobile-pill--purple">
              {notificationsPreview ? "Notifications preview on" : "Notifications preview off"}
            </span>
          </div>
        </MobileCard>

        <div className="mobile-pt-detail-stat-grid">
          <MobileStatCard
            label="Role"
            value={user.role}
            progressText="Authenticated client session role."
          />
          <MobileStatCard
            label="Theme"
            value={darkMode ? "Dark" : "Light"}
            progressText="Stored locally in this browser only."
          />
          <MobileStatCard
            label="Notification preview"
            value={notificationsPreview ? "On" : "Off"}
            progressText="Local-only UI state with no backend preference storage."
          />
          <MobileStatCard
            label="Version"
            value={appVersion}
            progressText="Current frontend version label."
          />
        </div>
      </MobileSection>

      <MobileSection
        eyebrow="Account"
        title="Account"
        description="Signed-in account details surfaced from the current session only."
      >
        <MobileCard as="article" variant="soft" className="mobile-pt-detail-action-card">
          <div className="mobile-pt-client-card__header">
            <div className="mobile-section__copy">
              <p className="mobile-section__eyebrow">Account</p>
              <h3 className="mobile-section__title">{user.email || "Signed-in account"}</h3>
              <p className="mobile-section__description">
                This section uses only the currently available session identity.
              </p>
            </div>
            <span className="mobile-pill mobile-pill--purple">{user.role}</span>
          </div>

          <dl className="mobile-pt-fact-grid">
            <div>
              <dt>Role</dt>
              <dd>{user.role}</dd>
            </div>
            <div>
              <dt>Account type</dt>
              <dd>{user.role}</dd>
            </div>
          </dl>
        </MobileCard>
      </MobileSection>

      <MobileSection
        eyebrow="Preferences"
        title="Preferences"
        description="Theme is stored locally in this browser. Notification state remains local-only and does not use backend storage."
      >
        <div className="mobile-pt-detail-stack">
          <MobileCard as="article" variant="soft" className="mobile-pt-detail-action-card">
            <div className="mobile-pt-client-card__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Theme</p>
                <h3 className="mobile-section__title">Theme</h3>
                <p className="mobile-section__description">
                  Stored locally in this browser only. No backend sync is used.
                </p>
              </div>
              <span className="mobile-pill mobile-pill--yellow">{darkMode ? "Dark" : "Light"}</span>
            </div>

            <div className="mobile-pt-actions" role="group" aria-label="Theme mode">
              <ToggleButton
                active={theme === "dark"}
                label="Dark"
                onClick={() => setTheme("dark")}
              />
              <ToggleButton
                active={theme === "light"}
                label="Light"
                onClick={() => setTheme("light")}
              />
            </div>
          </MobileCard>

          <MobileCard as="article" variant="soft" className="mobile-pt-detail-action-card">
            <div className="mobile-pt-client-card__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Notifications</p>
                <h3 className="mobile-section__title">Notification preview</h3>
                <p className="mobile-section__description">
                  Local-only UI state. No backend preference storage is used.
                </p>
              </div>
              <span className="mobile-pill mobile-pill--purple">
                {notificationsPreview ? "On" : "Off"}
              </span>
            </div>

            <div className="mobile-pt-actions">
              <ToggleButton
                active={notificationsPreview}
                label={notificationsPreview ? "On" : "Off"}
                onClick={() => setNotificationsPreview((current) => !current)}
              />
            </div>
          </MobileCard>
        </div>
      </MobileSection>

      <MobileSection
        eyebrow="Controls"
        title="App Controls"
        description="Session and product information for the current client workspace."
      >
        <div className="mobile-pt-detail-stack">
          <MobileCard as="article" variant="soft" className="mobile-pt-detail-action-card">
            <div className="mobile-pt-client-card__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">App</p>
                <h3 className="mobile-section__title">MealMetric</h3>
                <p className="mobile-section__description">
                  Training-aware client workspace connected through protected BFF routes.
                </p>
              </div>
              <span className="mobile-pill mobile-pill--yellow">Info only</span>
            </div>

            <dl className="mobile-pt-fact-grid">
              <div>
                <dt>Version</dt>
                <dd>{appVersion}</dd>
              </div>
              <div>
                <dt>Support</dt>
                <dd>Help link below is informational only</dd>
              </div>
            </dl>
          </MobileCard>

          <MobileCard as="article" variant="soft" className="mobile-pt-detail-action-card">
            <div className="mobile-section__copy">
              <p className="mobile-section__eyebrow">Session</p>
              <h3 className="mobile-section__title">App controls</h3>
              <p className="mobile-section__description">
                Use the existing logout flow to end the current session safely.
              </p>
            </div>
            <div className="mobile-pt-actions">
              <LogoutButton />
            </div>
          </MobileCard>
        </div>
      </MobileSection>
    </MobileAppShell>
  );
}
