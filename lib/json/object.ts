import type { JsonObject, JsonValue } from "@/lib/types/api";

type GetTextFieldOptions = {
  allowEmpty?: boolean;
};

export function isJsonObject(value: JsonValue | null): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getTextField(
  value: JsonValue | null,
  keys: string[],
  options: GetTextFieldOptions = {},
): string | null {
  if (!isJsonObject(value)) {
    return null;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate !== "string") {
      continue;
    }

    if (options.allowEmpty || candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}
