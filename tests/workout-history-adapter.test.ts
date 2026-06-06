import { describe, expect, it } from "vitest";

import { adaptWorkoutHistoryPage } from "@/lib/adapters/workout-history";

describe("adaptWorkoutHistoryPage", () => {
  it("keeps numeric exercise weights displayable", () => {
    const result = adaptWorkoutHistoryPage({
      items: [{
        id: "log-1",
        performed_at: "2026-06-06T23:42:00Z",
        mode: "rep",
        exercise_entries: [{
          id: "entry-1",
          exercise_name: "Bench Press",
          weight: 135,
          position: 0,
        }],
      }],
      count: 1,
      limit: 30,
      offset: 0,
      next_offset: null,
      has_more: false,
    });

    expect(result.items[0]?.exerciseEntries[0]?.weight).toBe(135);
  });

  it("parses decimal string exercise weights", () => {
    const result = adaptWorkoutHistoryPage({
      items: [{
        id: "log-1",
        performed_at: "2026-06-06T23:42:00Z",
        mode: "set",
        exercise_entries: [{
          id: "entry-1",
          exercise_name: "Bench Press",
          weight: "135.00",
          position: 0,
        }],
      }],
      count: 1,
      limit: 30,
      offset: 0,
      next_offset: null,
      has_more: false,
    });

    expect(result.items[0]?.exerciseEntries[0]?.weight).toBe(135);
  });

  it("rejects blank and non-numeric exercise weights", () => {
    const blankWeight = adaptWorkoutHistoryPage({
      items: [{
        id: "log-1",
        performed_at: "2026-06-06T23:42:00Z",
        mode: "general_workout",
        exercise_entries: [{
          id: "entry-1",
          exercise_name: "Bench Press",
          weight: "",
          position: 0,
        }],
      }],
      count: 1,
      limit: 30,
      offset: 0,
      next_offset: null,
      has_more: false,
    });
    const invalidWeight = adaptWorkoutHistoryPage({
      items: [{
        id: "log-2",
        performed_at: "2026-06-06T23:42:00Z",
        mode: "general_workout",
        exercise_entries: [{
          id: "entry-2",
          exercise_name: "Bench Press",
          weight: "abc",
          position: 0,
        }],
      }],
      count: 1,
      limit: 30,
      offset: 0,
      next_offset: null,
      has_more: false,
    });

    expect(blankWeight.items[0]?.exerciseEntries[0]?.weight).toBeNull();
    expect(invalidWeight.items[0]?.exerciseEntries[0]?.weight).toBeNull();
  });
});
