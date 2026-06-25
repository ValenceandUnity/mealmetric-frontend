"use client";

import { type FormEvent, useEffect, useState } from "react";

import { LogoutButton } from "@/components/LogoutButton";
import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileHeaderBackgroundSettings } from "@/components/mobile/MobileHeaderBackgroundSettings";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { DebugPreview } from "@/components/ui/DebugPreview";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import { getTextField, isJsonObject } from "@/lib/json/object";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";

type ProfileApiResponse = ApiResponse<JsonValue>;

type SettingsStateCardProps = {
  title: string;
  message: string;
  role?: "status" | "alert";
};

function getEditableFieldKey(value: JsonValue | null): string {
  if (!isJsonObject(value)) {
    return "name";
  }

  const keys = ["name", "full_name", "display_name"];

  for (const key of keys) {
    if (typeof value[key] === "string") {
      return key;
    }
  }

  return "name";
}

function getFieldLabel(fieldKey: string): string {
  if (fieldKey === "full_name") {
    return "Full name";
  }

  if (fieldKey === "display_name") {
    return "Display name";
  }

  return "Name";
}

function normalizeText(value: string): string {
  return value.trim();
}

function SettingsStateCard({
  title,
  message,
  role = "status",
}: SettingsStateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
      <div className="mobile-section__copy" role={role} aria-live="polite">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
    </MobileCard>
  );
}

export default function PTSettingsPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [profileData, setProfileData] = useState<JsonValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "pt") {
      return;
    }

    let active = true;

    async function loadProfile() {
      setLoading(true);
      setErrorMessage(null);
      setSaveMessage(null);

      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const payload = (await response.json()) as ProfileApiResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setProfileData(null);
          setDraftName("");
          return;
        }

        const nextProfile = payload.data;
        setProfileData(nextProfile);
        setDraftName(
          getTextField(nextProfile, ["name", "full_name", "display_name"], { allowEmpty: true }) ?? "",
        );
      } catch {
        if (!active) {
          return;
        }

        setErrorMessage("Unable to load your profile.");
        setProfileData(null);
        setDraftName("");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [status, user]);

  if (status === "loading") {
    return <LoadingBlock title="Loading settings" message="Validating your BFF-managed session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT access requires an authenticated PT session." />;
  }

  const editableFieldKey = getEditableFieldKey(profileData);
  const fieldLabel = getFieldLabel(editableFieldKey);
  const currentTextValue = getTextField(profileData, [editableFieldKey], { allowEmpty: true }) ?? "";
  const hasChanges = normalizeText(draftName) !== normalizeText(currentTextValue);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasChanges) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [editableFieldKey]: normalizeText(draftName),
        }),
      });
      const payload = (await response.json()) as ProfileApiResponse;

      if (!payload.ok) {
        setErrorMessage(payload.error.message);
        return;
      }

      setProfileData(payload.data);
      setDraftName(
        getTextField(payload.data, [editableFieldKey], { allowEmpty: true }) ??
          normalizeText(draftName),
      );
      setSaveMessage("Profile updated.");
    } catch {
      setErrorMessage("Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <MobileAppShell
      user={user}
      activePath="/pt/settings"
      greeting={formatDisplayNameFromUser(user)}
      title="Settings"
      subtitle="PT profile and session settings through the authenticated BFF workflow."
    >
      <MobileHeaderBackgroundSettings role="pt" />

      {loading ? (
        <MobileSection
          eyebrow="Loading"
          title="Loading profile"
          description="Calling /api/me through the BFF."
        >
          <SettingsStateCard
            title="Loading profile"
            message="Calling /api/me through the BFF."
          />
        </MobileSection>
      ) : null}

      {errorMessage ? (
        <MobileSection
          eyebrow="Unavailable"
          title="Unable to load settings"
          description="This settings page stays on the existing authenticated PT and /api/me BFF workflow and does not fall back to direct backend calls."
        >
          <SettingsStateCard
            title="Unable to load settings"
            message={errorMessage}
            role="alert"
          />
        </MobileSection>
      ) : null}

      {!loading ? (
        <>
          <MobileSection
            eyebrow="PT profile"
            title="Profile summary"
            description="Profile data remains inside the authenticated BFF session workflow."
          >
            <MobileCard as="article" variant="accent" className="mobile-pt-detail-action-card">
              <div className="mobile-pt-client-card__header">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Authenticated PT account</p>
                  <h2 className="mobile-section__title">{user.email}</h2>
                  <p className="mobile-section__description">
                    Profile data remains inside the authenticated BFF session workflow.
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
                  <dt>{fieldLabel}</dt>
                  <dd>{currentTextValue || "Unavailable"}</dd>
                </div>
              </dl>
            </MobileCard>

            <div className="mobile-pt-detail-stat-grid">
              <MobileStatCard
                label="Role"
                value={user.role}
                progressText="Authenticated PT session role."
              />
              <MobileStatCard
                label={fieldLabel}
                value={currentTextValue || "Unavailable"}
                progressText="Editable profile field returned by /api/me."
              />
            </div>

            {!currentTextValue && profileData ? (
              <DebugPreview value={profileData} label="Profile payload fallback" />
            ) : null}
          </MobileSection>

          <MobileSection
            eyebrow="Mutation"
            title="Edit profile"
            description="Profile edits remain limited to the current /api/me PATCH workflow."
          >
            <MobileCard as="article" variant="soft" className="mobile-pt-detail-action-card">
              <form className="mobile-pt-form-grid" onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="pt-settings-name">{fieldLabel}</label>
                  <input
                    id="pt-settings-name"
                    className="mobile-focus-ring"
                    type="text"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    placeholder={`Enter ${fieldLabel.toLowerCase()}`}
                  />
                </div>

                <div className="mobile-pt-actions">
                  <button
                    type="submit"
                    className="mobile-pt-button mobile-pt-button--primary mobile-focus-ring"
                    disabled={saving || !hasChanges}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>

                {saveMessage ? (
                  <p className="mobile-section__description" role="status" aria-live="polite">
                    {saveMessage}
                  </p>
                ) : null}
              </form>
            </MobileCard>
          </MobileSection>

          <MobileSection
            eyebrow="Session"
            title="Account action"
            description="Sign out continues to use the existing shared logout flow."
          >
            <MobileCard as="article" variant="soft" className="mobile-pt-detail-action-card">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Existing action</p>
                <h3 className="mobile-section__title">Sign out</h3>
                <p className="mobile-section__description">
                  Signing out continues to use the existing auth BFF flow. No extra settings, billing, security, or profile-management flows are introduced on this route.
                </p>
              </div>
              <div className="mobile-pt-actions">
                <LogoutButton />
              </div>
            </MobileCard>
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
