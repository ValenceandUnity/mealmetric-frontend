"use client";

import { Card } from "@/components/ui/Card";
import type { ThemeMode } from "@/lib/client/theme";

type PreferencesSectionProps = {
  theme: ThemeMode;
  notifications: boolean;
  onThemeChange: (theme: ThemeMode) => void;
  onToggleNotifications: () => void;
};

export function PreferencesSection({
  theme,
  notifications,
  onThemeChange,
  onToggleNotifications,
}: PreferencesSectionProps) {
  return (
    <Card className="client-settings-card client-settings-preferences" variant="soft">
      <div className="client-settings-toggle">
        <div>
          <p className="client-settings-toggle__label">Theme</p>
          <p className="client-settings-toggle__hint">Stored locally in this browser only. No backend sync is used.</p>
        </div>
        <div className="client-settings-toggle__group" role="group" aria-label="Theme mode">
          <button
            type="button"
            className={theme === "dark" ? "client-settings-toggle__option client-settings-toggle__option--active" : "client-settings-toggle__option"}
            aria-pressed={theme === "dark"}
            onClick={() => onThemeChange("dark")}
          >
            Dark
          </button>
          <button
            type="button"
            className={theme === "light" ? "client-settings-toggle__option client-settings-toggle__option--active" : "client-settings-toggle__option"}
            aria-pressed={theme === "light"}
            onClick={() => onThemeChange("light")}
          >
            Light
          </button>
        </div>
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
