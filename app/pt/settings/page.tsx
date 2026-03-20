"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { JsonPreview } from "@/components/JsonPreview";
import { LogoutButton } from "@/components/LogoutButton";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { Section } from "@/components/ui/Section";
import { useSessionBootstrap } from "@/lib/client/session";
import { getTextField, isJsonObject } from "@/lib/json/object";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type ProfileApiResponse = ApiResponse<JsonValue>;

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
    <PageShell
      title="Settings"
      user={user}
      navigation={
        <>
          <Link href="/pt">Back to PT Dashboard</Link>{" "}
          <Link href="/pt/clients">Clients</Link>
        </>
      }
      actions={<LogoutButton />}
    >
      {loading ? <LoadingBlock title="Loading profile" message="Calling /api/me through the BFF." /> : null}

      {errorMessage ? <ErrorBlock title="Unable to load settings" message={errorMessage} /> : null}

      {!loading ? (
        <>
          <Section title="Edit profile">
            <form
              onSubmit={handleSubmit}
              style={{ display: "grid", gap: 12, maxWidth: 420 }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <span>{fieldLabel}</span>
                <input
                  type="text"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder={`Enter ${fieldLabel.toLowerCase()}`}
                  style={{
                    border: "1px solid #475569",
                    borderRadius: 8,
                    padding: "10px 12px",
                    background: "#0f172a",
                    color: "inherit",
                  }}
                />
              </label>

              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="submit"
                  disabled={saving || !hasChanges}
                  style={{
                    border: "1px solid #475569",
                    borderRadius: 8,
                    padding: "10px 14px",
                    background: saving || !hasChanges ? "#1e293b" : "#2563eb",
                    color: "white",
                    cursor: saving || !hasChanges ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                {saveMessage ? <p style={{ margin: 0, color: "#86efac" }}>{saveMessage}</p> : null}
              </div>
            </form>
          </Section>

          <Section title="Profile data">
            <JsonPreview value={profileData ?? null} />
          </Section>
        </>
      ) : null}
    </PageShell>
  );
}
