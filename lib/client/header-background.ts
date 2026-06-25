"use client";

export type HeaderBackgroundRole = "client" | "pt";

export type HeaderBackgroundPreset =
  | "default"
  | "dark-grid"
  | "purple-gradient"
  | "custom-local-image";

export type HeaderBackgroundPreference = {
  preset: HeaderBackgroundPreset;
  customImageDataUrl: string | null;
};

export const HEADER_BACKGROUND_CHANGE_EVENT = "mealmetric:header-background-change";
export const MAX_HEADER_BACKGROUND_IMAGE_BYTES = 1024 * 1024;

const DEFAULT_HEADER_BACKGROUND_PREFERENCE: HeaderBackgroundPreference = {
  preset: "default",
  customImageDataUrl: null,
};

const HEADER_BACKGROUND_STORAGE_KEYS: Record<HeaderBackgroundRole, string> = {
  client: "mealmetric:client:header-background",
  pt: "mealmetric:pt:header-background",
};

function isHeaderBackgroundPreset(value: unknown): value is HeaderBackgroundPreset {
  return (
    value === "default" ||
    value === "dark-grid" ||
    value === "purple-gradient" ||
    value === "custom-local-image"
  );
}

export function isHeaderBackgroundRole(value: unknown): value is HeaderBackgroundRole {
  return value === "client" || value === "pt";
}

export function getHeaderBackgroundStorageKey(role: HeaderBackgroundRole): string {
  return HEADER_BACKGROUND_STORAGE_KEYS[role];
}

export function getDefaultHeaderBackgroundPreference(): HeaderBackgroundPreference {
  return {
    ...DEFAULT_HEADER_BACKGROUND_PREFERENCE,
  };
}

export function readHeaderBackgroundPreference(
  role: HeaderBackgroundRole,
): HeaderBackgroundPreference {
  if (typeof window === "undefined") {
    return getDefaultHeaderBackgroundPreference();
  }

  try {
    const raw = window.localStorage.getItem(getHeaderBackgroundStorageKey(role));
    if (!raw) {
      return getDefaultHeaderBackgroundPreference();
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return getDefaultHeaderBackgroundPreference();
    }

    const record = parsed as Record<string, unknown>;
    const preset = isHeaderBackgroundPreset(record.preset)
      ? record.preset
      : DEFAULT_HEADER_BACKGROUND_PREFERENCE.preset;
    const customImageDataUrl =
      typeof record.customImageDataUrl === "string" && record.customImageDataUrl.length > 0
        ? record.customImageDataUrl
        : null;

    return {
      preset,
      customImageDataUrl,
    };
  } catch {
    return getDefaultHeaderBackgroundPreference();
  }
}

function emitHeaderBackgroundChange(role: HeaderBackgroundRole) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(HEADER_BACKGROUND_CHANGE_EVENT, {
      detail: { role },
    }),
  );
}

export function writeHeaderBackgroundPreference(
  role: HeaderBackgroundRole,
  preference: HeaderBackgroundPreference,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getHeaderBackgroundStorageKey(role),
    JSON.stringify({
      preset: preference.preset,
      customImageDataUrl: preference.customImageDataUrl,
    }),
  );
  emitHeaderBackgroundChange(role);
}

export function getHeaderBackgroundPresetLabel(preset: HeaderBackgroundPreset): string {
  switch (preset) {
    case "dark-grid":
      return "Dark Grid";
    case "purple-gradient":
      return "Purple Gradient";
    case "custom-local-image":
      return "Custom Local Image";
    case "default":
    default:
      return "Default";
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read image file."));
    };

    reader.onerror = () => {
      reject(new Error("Unable to read image file."));
    };

    reader.readAsDataURL(file);
  });
}
