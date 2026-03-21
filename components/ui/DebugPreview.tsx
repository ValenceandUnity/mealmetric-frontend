"use client";

import type { JsonValue } from "@/lib/types/api";

export function DebugPreview({ value, label = "Debug payload" }: { value: JsonValue; label?: string }) {
  return (
    <details className="debug-preview">
      <summary>{label}</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}
