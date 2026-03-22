"use client";

import { useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { MealPlansTopNav } from "@/components/meal-plans/MealPlansTopNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, BookmarkFolderListPayload } from "@/lib/types/api";

type BookmarksResponse = ApiResponse<BookmarkFolderListPayload>;

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ClientMealPlansBookmarkPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [folders, setFolders] = useState<BookmarkFolderListPayload["items"]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/client/bookmarks", { cache: "no-store" });
        const payload = (await response.json()) as BookmarksResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setFolders([]);
          return;
        }

        setFolders(payload.data.items);
      } catch {
        if (active) {
          setErrorMessage("Unable to load saved meal plans.");
          setFolders([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [status, user]);

  const savedPlans = useMemo(
    () =>
      folders.flatMap((folder) =>
        folder.items.map((item) => ({
          id: item.id,
          folderName: folder.name,
          mealPlan: item.meal_plan,
        })),
      ),
    [folders],
  );

  if (status === "loading") {
    return <LoadingBlock title="Loading saved plans" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Meal plan bookmarks require an authenticated client session." />;
  }

  return (
    <PageShell
      title="Meal plan bookmarks"
      user={user}
      className="app-shell--client-meal-plans"
      hideTopHub
    >
      <MealPlansTopNav />
      {loading ? <LoadingBlock title="Loading saved plans" message="Preparing your saved meal plans." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load saved plans" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <SectionBlock
          eyebrow="Meal Plans"
          title="Saved Plans"
          description="Your saved meal plans"
        >
          {savedPlans.length > 0 ? (
            <div className="client-meal-plans-search-results">
              {savedPlans.map((entry) => (
                <Card key={entry.id} className="client-meal-plans-search-card" variant="soft">
                  <div className="client-meal-plans-search-card__header">
                    <h3 className="client-meal-plans-search-card__title">{entry.mealPlan.name}</h3>
                    <Badge label={entry.mealPlan.vendor_name} tone="accent" />
                  </div>
                  <div className="client-meal-plans-search-card__meta">
                    <span>{`${entry.mealPlan.total_calories} Calories`}</span>
                    <span>{formatPrice(entry.mealPlan.total_price_cents)}</span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No saved meal plans yet"
              message="Start exploring and bookmark plans to see them here"
            />
          )}
        </SectionBlock>
      ) : null}
    </PageShell>
  );
}
