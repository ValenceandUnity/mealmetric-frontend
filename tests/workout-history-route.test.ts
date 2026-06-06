import { describe, expect, it } from "vitest";

import { FULL_LOG_HISTORY_ROUTE } from "@/lib/workout-history-routes";

describe("workout history routes", () => {
  it("targets the nested add-log full history route", () => {
    expect(FULL_LOG_HISTORY_ROUTE).toBe("/client/add-log/full-log-history");
  });
});
