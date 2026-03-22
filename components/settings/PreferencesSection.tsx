"use client";

import { Card } from "@/components/ui/Card";

type PreferencesSectionProps = {
  darkMode: boolean;
  notifications: boolean;
  onToggleDarkMode: () => void;
  onToggleNotifications: () => void;
};

export function PreferencesSection({
  darkMode,
  notifications,
  onToggleDarkMode,
  onToggleNotifications,
}: PreferencesSectionProps) {
  return (
    <Card className="client-settings-card client-settings-preferences" variant="soft">
      <div className="client-settings-toggle">
        <div>
          <p className="client-settings-toggle__label">Dark mode</p>
          <p className="client-settings-toggle__hint">Local-only preview toggle for this session.</p>
        </div>
        <button type="button" onClick={onToggleDarkMode} aria-pressed={darkMode}>
          {darkMode ? "On" : "Off"}
        </button>
      </div>

      <div className="client-settings-toggle">
        <div>
          <p className="client-settings-toggle__label">Notifications</p>
          <p className="client-settings-toggle__hint">Local-only UI state. No backend preference storage is used.</p>
        </div>
        <button type="button" onClick={onToggleNotifications} aria-pressed={notifications}>
          {notifications ? "On" : "Off"}
        </button>
      </div>
    </Card>
  );
}
