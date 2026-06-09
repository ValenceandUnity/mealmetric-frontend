"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileMealPlanRow } from "@/components/mobile/MobileMealPlanRow";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, BookmarkFolderListPayload } from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";
import { adaptClientMealPlanBookmarksView, type MobileMealPlanRowView } from "@/lib/view-models/meal-plans";

type BookmarksResponse = ApiResponse<BookmarkFolderListPayload>;

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type BookmarkStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
  role?: "status" | "alert";
};

type SavedMealPlanCardProps = {
  row: MobileMealPlanRowView;
};

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function BookmarkStateCard({
  title,
  message,
  action,
  role = "status",
}: BookmarkStateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
      <div className="mobile-section__copy" role={role} aria-live="polite">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
      {action ? <div className="mobile-pt-actions">{action}</div> : null}
    </MobileCard>
  );
}

function SavedMealPlanCard({ row }: SavedMealPlanCardProps) {
  return (
    <MobileCard as="article" variant="action" className="mobile-pt-detail-action-card">
      <MobileMealPlanRow
        name={row.name}
        vendorName={`${row.vendorName} | ${row.vendorZipLabel}`}
        calories={row.caloriesLabel.replace(/\s*cal$/i, "")}
        price={row.priceLabel}
        badge={<span className="mobile-pill mobile-pill--yellow">Saved</span>}
        action={<ActionPill href={row.href} tone="purple">View plan</ActionPill>}
      />

      <dl className="mobile-pt-fact-grid">
        <div>
          <dt>Vendor ZIP</dt>
          <dd>{row.vendorZipLabel}</dd>
        </div>
        <div>
          <dt>Calories</dt>
          <dd>{row.caloriesLabel}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd>{row.priceLabel}</dd>
        </div>
        <div>
          <dt>Items</dt>
          <dd>{row.itemCountLabel}</dd>
        </div>
        <div>
          <dt>Availability</dt>
          <dd>{row.availabilityLabel}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{row.statusLabel}</dd>
        </div>
      </dl>
    </MobileCard>
  );
}

export default function ClientMealPlansBookmarkPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [bookmarksData, setBookmarksData] = useState<BookmarkFolderListPayload | null>(null);
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
          setBookmarksData(null);
          return;
        }

        setBookmarksData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load saved meal plans.");
          setBookmarksData(null);
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

  if (status === "loading") {
    return <LoadingBlock title="Loading saved plans" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return (
      <LoadingBlock
        title="Redirecting"
        message="Meal plan bookmarks require an authenticated client session."
      />
    );
  }

  const view = adaptClientMealPlanBookmarksView({
    bookmarks: bookmarksData,
  });

  return (
    <MobileAppShell
      user={user}
      activePath="/client/meal-plans"
      greeting={formatDisplayNameFromUser(user)}
      title="Saved meal plans"
      subtitle={
        view.hasFolders
          ? `Primary folder: ${view.bookmarkState.latestFolderLabel}`
          : "Bookmark folders returned by the protected client route."
      }
      topHubAction={<ActionPill href="/client/meal-plans" tone="purple">Back to plans</ActionPill>}
    >
      {loading ? (
        <MobileSection
          eyebrow="Loading"
          title="Loading saved plans"
          description="Preparing your saved meal plans."
        >
          <BookmarkStateCard
            title="Loading saved plans"
            message="Preparing your saved meal plans."
          />
        </MobileSection>
      ) : null}

      {errorMessage ? (
        <MobileSection
          eyebrow="Unavailable"
          title="Unable to load saved plans"
          description="The protected bookmark route did not return usable saved-plan data."
        >
          <BookmarkStateCard
            title="Saved plans unavailable"
            message={errorMessage}
            action={<ActionPill href="/client/meal-plans" tone="purple">Back to plans</ActionPill>}
            role="alert"
          />
        </MobileSection>
      ) : null}

      {!loading && !errorMessage ? (
        <>
          <MobileSection
            eyebrow="Overview"
            title="Bookmarks and folders"
            description="Only bookmark-folder metrics returned by the protected client route are shown here."
          >
            <MobileCard as="article" variant="action" className="mobile-meal-plan-hero">
              <div className="mobile-meal-plan-hero__copy">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Protected bookmark surface</p>
                  <h3 className="mobile-section__title">Saved plans stay in the same gray-card language</h3>
                  <p className="mobile-section__description">
                    Folder and saved-plan counts remain tied to the current bookmark payload. This phase does not invent new bookmark editing behavior.
                  </p>
                </div>
              </div>

              <div className="mobile-meal-plan-hero__signals">
                <div className="mobile-meal-plan-hero__signal">
                  <p className="mobile-section__eyebrow">Saved plans</p>
                  <h3 className="mobile-section__title">{view.bookmarkState.savedPlanCountLabel}</h3>
                  <p className="mobile-section__description">Returned by the existing bookmark route.</p>
                </div>
                <div className="mobile-meal-plan-hero__signal">
                  <p className="mobile-section__eyebrow">Folders</p>
                  <h3 className="mobile-section__title">{view.bookmarkState.folderCountLabel}</h3>
                  <p className="mobile-section__description">Folder state remains read-only on this page.</p>
                </div>
              </div>
            </MobileCard>

            {view.summaryCards.map((card) => (
              <MobileStatCard
                key={card.label}
                label={card.label}
                value={card.value}
                progressText={card.progressText}
              />
            ))}
          </MobileSection>

          <MobileSection
            eyebrow="Saved state"
            title="Folder summary"
            description="Bookmark folders and saved-plan counts are shown here without inventing editing or watchlist actions."
          >
            <MobileCard as="article" variant="accent" className="mobile-pt-detail-action-card">
              <div className="mobile-pt-client-card__header">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Current bookmark state</p>
                  <h3 className="mobile-section__title">{view.bookmarkState.savedPlanCountLabel}</h3>
                  <p className="mobile-section__description">{view.bookmarkState.emptyMessage}</p>
                </div>
                <span className="mobile-pill mobile-pill--yellow">{view.bookmarkState.folderCountLabel}</span>
              </div>

              <dl className="mobile-pt-training-meta-grid">
                <div>
                  <dt>Folders</dt>
                  <dd>{view.bookmarkState.folderCountLabel}</dd>
                </div>
                <div>
                  <dt>Saved plans</dt>
                  <dd>{view.bookmarkState.savedPlanCountLabel}</dd>
                </div>
                <div>
                  <dt>Primary folder</dt>
                  <dd>{view.bookmarkState.latestFolderLabel}</dd>
                </div>
              </dl>
            </MobileCard>
          </MobileSection>

          {view.emptyState ? (
            <MobileSection
              eyebrow="Empty"
              title="No bookmark folders"
              description="The bookmark route returned no folders for this protected client session."
            >
              <BookmarkStateCard
                title={view.emptyState.title}
                message={view.emptyState.message}
                action={<ActionPill href="/client/meal-plans" tone="yellow">Browse meal plans</ActionPill>}
              />
            </MobileSection>
          ) : (
            <MobileSection
              eyebrow="Folders"
              title="Saved meal-plan folders"
              description="Each folder is shown only from the current bookmark payload. This phase does not invent folder editing or remove actions."
            >
              <div className="mobile-pt-detail-stack">
                {view.folders.map((folder) => (
                  <MobileCard key={folder.id} as="article" variant="soft" className="mobile-pt-detail-action-card">
                    <div className="mobile-pt-client-card__header">
                      <div className="mobile-section__copy">
                        <p className="mobile-section__eyebrow">Bookmark folder</p>
                        <h3 className="mobile-section__title">{folder.name}</h3>
                        <p className="mobile-section__description">
                          {folder.description?.trim() || folder.itemCountLabel}
                        </p>
                      </div>
                      <span className="mobile-pill mobile-pill--yellow">{folder.itemCountLabel}</span>
                    </div>

                    {folder.isEmpty ? (
                      <BookmarkStateCard
                        title="No saved plans in this folder"
                        message="This folder exists, but it does not currently contain any saved meal plans."
                      />
                    ) : (
                      <div className="mobile-pt-detail-stack">
                        {folder.items.map((row) => (
                          <SavedMealPlanCard key={`${folder.id}-${row.id ?? row.name}`} row={row} />
                        ))}
                      </div>
                    )}
                  </MobileCard>
                ))}
              </div>
            </MobileSection>
          )}
        </>
      ) : null}
    </MobileAppShell>
  );
}
