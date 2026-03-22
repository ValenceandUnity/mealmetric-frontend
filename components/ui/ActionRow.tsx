"use client";

import type { ReactNode } from "react";

export function ActionRow({ children }: { children: ReactNode }) {
  return <div className="action-row">{children}</div>;
}
