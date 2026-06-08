import { describe, expect, it } from "vitest";

import { adaptClientHistoryView } from "@/lib/view-models/client-history";

describe("adaptClientHistoryView", () => {
  it("flattens workout logs into sorted mobile rows and preserves pagination metadata", () => {
    const view = adaptClientHistoryView({
      items: [
        {
          id: "log-older",
          performed_at: "2026-06-07T10:00:00Z",
          mode: "general_workout",
          client_notes: "Client only",
          pt_notes: "PT only",
          exercise_entries: [],
        },
        {
          id: "log-newer",
          performed_at: "2026-06-08T12:00:00Z",
          mode: "rep",
          client_notes: "Client note",
          pt_notes: "PT note",
          exercise_entries: [
            {
              id: "entry-1",
              exercise_name: "Bench Press",
              sets: 4,
              reps: 8,
              weight: 135.5,
              duration_seconds: 90,
              notes: "Entry note",
              position: 0,
            },
            {
              id: "entry-2",
              sets: 3,
              reps: 10,
              weight: 95,
              duration_seconds: 45,
              position: 1,
            },
          ],
        },
      ],
      count: 2,
      limit: 30,
      offset: 0,
      next_offset: 30,
      has_more: true,
    });

    expect(view.count).toBe(2);
    expect(view.nextOffset).toBe(30);
    expect(view.hasMore).toBe(true);
    expect(view.countLabel).toBe("2 logs");
    expect(view.pageWindowLabel).toBe("1-2 of 2");
    expect(view.olderEntriesLabel).toBe("Older entries available");

    expect(view.rows).toHaveLength(3);
    expect(view.rows[0]).toMatchObject({
      exerciseName: "Bench Press",
      typeLabel: "Rep",
      sets: "4",
      reps: "8",
      weight: "135.5",
      duration: "1m 30s",
      notes: "Entry note Client note PT note",
    });
    expect(view.rows[1]).toMatchObject({
      exerciseName: "Exercise 2",
      duration: "45s",
      notes: "Client note PT note",
    });
    expect(view.rows[2]).toMatchObject({
      exerciseName: "-",
      typeLabel: "General Workout",
      sets: "-",
      reps: "-",
      weight: "-",
      duration: "-",
      notes: "Client only PT only",
    });
  });

  it("returns safe fallbacks when the workout-log payload is missing or invalid", () => {
    const view = adaptClientHistoryView({
      unexpected: true,
    });

    expect(view.rows).toEqual([]);
    expect(view.count).toBeNull();
    expect(view.limit).toBeNull();
    expect(view.offset).toBeNull();
    expect(view.nextOffset).toBeNull();
    expect(view.hasMore).toBe(false);
    expect(view.countLabel).toBe("Unavailable");
    expect(view.pageWindowLabel).toBe("Page window unavailable");
    expect(view.olderEntriesLabel).toBe("No older entries");
  });
});
