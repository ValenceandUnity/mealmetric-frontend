"use client";

import { useEffect, useState } from "react";

import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import {
  getDefaultHeaderBackgroundPreference,
  getHeaderBackgroundPresetLabel,
  MAX_HEADER_BACKGROUND_IMAGE_BYTES,
  readFileAsDataUrl,
  readHeaderBackgroundPreference,
  type HeaderBackgroundPreference,
  type HeaderBackgroundPreset,
  type HeaderBackgroundRole,
  writeHeaderBackgroundPreference,
} from "@/lib/client/header-background";

type MobileHeaderBackgroundSettingsProps = {
  role: HeaderBackgroundRole;
};

const BUILTIN_OPTIONS: HeaderBackgroundPreset[] = [
  "default",
  "dark-grid",
  "purple-gradient",
  "custom-local-image",
];

function createPreviewStyle(preference: HeaderBackgroundPreference) {
  if (
    preference.preset === "custom-local-image" &&
    preference.customImageDataUrl
  ) {
    return {
      backgroundImage: [
        "linear-gradient(180deg, rgba(8, 10, 20, 0.16), rgba(8, 10, 20, 0.64))",
        `url("${preference.customImageDataUrl}")`,
      ].join(", "),
    };
  }

  if (preference.preset === "purple-gradient") {
    return {
      background:
        "linear-gradient(140deg, rgba(90, 41, 165, 0.96), rgba(43, 76, 174, 0.9) 54%, rgba(17, 21, 48, 0.96))",
    };
  }

  if (preference.preset === "dark-grid") {
    return {
      background:
        "linear-gradient(145deg, rgba(11, 15, 28, 0.98), rgba(3, 6, 15, 0.98))",
    };
  }

  return {
    background:
      "linear-gradient(145deg, rgba(68, 68, 68, 0.92), rgba(16, 16, 16, 0.98))",
  };
}

export function MobileHeaderBackgroundSettings({
  role,
}: MobileHeaderBackgroundSettingsProps) {
  const [preference, setPreference] = useState<HeaderBackgroundPreference>(
    getDefaultHeaderBackgroundPreference(),
  );
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setPreference(readHeaderBackgroundPreference(role));
  }, [role]);

  function updatePreference(nextPreference: HeaderBackgroundPreference) {
    setPreference(nextPreference);
    writeHeaderBackgroundPreference(role, nextPreference);
  }

  function handlePresetSelect(preset: HeaderBackgroundPreset) {
    setErrorMessage(null);
    setFeedbackMessage(`${getHeaderBackgroundPresetLabel(preset)} saved locally.`);
    updatePreference({
      preset,
      customImageDataUrl: preference.customImageDataUrl,
    });
  }

  async function handleCustomImageChange(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Choose an image file for the custom local header background.");
      setFeedbackMessage(null);
      return;
    }

    if (file.size > MAX_HEADER_BACKGROUND_IMAGE_BYTES) {
      setErrorMessage("Choose an image smaller than 1 MB for the custom local header background.");
      setFeedbackMessage(null);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const nextPreference: HeaderBackgroundPreference = {
        preset: "custom-local-image",
        customImageDataUrl: dataUrl,
      };

      setErrorMessage(null);
      setFeedbackMessage("Custom local image saved to this browser.");
      updatePreference(nextPreference);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to read the selected image file.",
      );
      setFeedbackMessage(null);
    }
  }

  return (
    <MobileSection
      eyebrow="Header"
      title="Header Background"
      description="This setting stays in local browser storage only. No backend preference route, upload, or remote asset is used."
    >
      <div className="mobile-pt-detail-stack">
        <MobileCard as="article" variant="accent" className="mobile-pt-detail-action-card">
          <div className="mobile-pt-client-card__header">
            <div className="mobile-section__copy">
              <p className="mobile-section__eyebrow">Current background</p>
              <h3 className="mobile-section__title">
                {getHeaderBackgroundPresetLabel(preference.preset)}
              </h3>
              <p className="mobile-section__description">
                Custom images are stored as a local data URL in this browser only.
              </p>
            </div>
            <span className="mobile-pill mobile-pill--yellow">
              {preference.preset === "custom-local-image" && preference.customImageDataUrl
                ? "Local image ready"
                : "Local only"}
            </span>
          </div>

          <div
            className="mobile-header-background-settings__preview"
            data-preset={preference.preset}
            style={createPreviewStyle(preference)}
            aria-hidden="true"
          >
            <div className="mobile-header-background-settings__preview-grid" />
            <div className="mobile-header-background-settings__preview-copy">
              <span className="mobile-pill mobile-pill--purple">Preview</span>
            </div>
          </div>
        </MobileCard>

        <MobileCard as="article" variant="soft" className="mobile-pt-detail-action-card">
          <div className="mobile-section__copy">
            <p className="mobile-section__eyebrow">Select a background</p>
            <h3 className="mobile-section__title">Built-in options</h3>
            <p className="mobile-section__description">
              Default, Dark Grid, and Purple Gradient switch instantly. Custom Local Image uses a file you choose on this device.
            </p>
          </div>

          <div className="mobile-pt-actions" role="group" aria-label="Header background options">
            {BUILTIN_OPTIONS.map((preset) => {
              const active = preference.preset === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  className={[
                    "mobile-pill",
                    active ? "mobile-pill--yellow" : "mobile-pill--purple",
                    "mobile-focus-ring",
                  ].join(" ")}
                  aria-pressed={active}
                  onClick={() => {
                    handlePresetSelect(preset);
                  }}
                >
                  {getHeaderBackgroundPresetLabel(preset)}
                </button>
              );
            })}
          </div>

          {preference.preset === "custom-local-image" ? (
            <div className="field">
              <label htmlFor={`${role}-header-background-file`}>Custom local image</label>
              <input
                id={`${role}-header-background-file`}
                className="mobile-focus-ring"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  void handleCustomImageChange(event.target.files?.[0] ?? null);
                }}
              />
              <p className="mobile-section__description">
                Choose an image up to 1 MB. The file is read locally with FileReader and stored in localStorage only.
              </p>
            </div>
          ) : null}

          {feedbackMessage ? (
            <p className="mobile-section__description" role="status" aria-live="polite">
              {feedbackMessage}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="mobile-section__description" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </MobileCard>
      </div>
    </MobileSection>
  );
}
