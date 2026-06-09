"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileMealPlanRow } from "@/components/mobile/MobileMealPlanRow";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type {
  ApiResponse,
  BookmarkFolder,
  BookmarkFolderListPayload,
  JsonValue,
} from "@/lib/types/api";
import {
  formatDisplayNameFromUser,
  formatNumber,
  getNumberLike,
} from "@/lib/view-models/common";
import { adaptMealPlanDetailView } from "@/lib/view-models/meal-plans";

type MealPlanDetailResponse = ApiResponse<JsonValue>;
type BookmarksApiResponse = ApiResponse<BookmarkFolderListPayload>;
type CreateFolderResponse = ApiResponse<BookmarkFolder>;
type CheckoutSessionResponse = ApiResponse<JsonValue>;

type FeedbackState = {
  tone: "info" | "success" | "error";
  title: string;
  message: string;
};

type SectionErrors = {
  bookmarks: string | null;
};

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type ActionPillButtonProps = {
  onClick: () => void;
  children: string;
  tone?: "purple" | "yellow";
  disabled?: boolean;
  ariaLabel?: string;
};

type DetailStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
  role?: "status" | "alert";
};

type DetailFeedbackCardProps = {
  feedback: FeedbackState;
};

const EMPTY_SECTION_ERRORS: SectionErrors = {
  bookmarks: null,
};

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function ActionPillButton({
  onClick,
  children,
  tone = "yellow",
  disabled = false,
  ariaLabel,
}: ActionPillButtonProps) {
  return (
    <button
      type="button"
      className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

function DetailStateCard({
  title,
  message,
  action,
  role = "status",
}: DetailStateCardProps) {
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

function DetailFeedbackCard({ feedback }: DetailFeedbackCardProps) {
  const tone = feedback.tone === "success" ? "yellow" : "purple";
  const liveRole = feedback.tone === "error" ? "alert" : "status";

  return (
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
      <div className="mobile-pt-client-card__header" role={liveRole} aria-live="polite">
        <div className="mobile-section__copy">
          <p className="mobile-section__eyebrow">Detail status</p>
          <h3 className="mobile-section__title">{feedback.title}</h3>
          <p className="mobile-section__description">{feedback.message}</p>
        </div>
        <span className={`mobile-pill mobile-pill--${tone}`}>{feedback.tone}</span>
      </div>
    </MobileCard>
  );
}

function findBookmarkMatch(
  bookmarks: BookmarkFolderListPayload,
  mealPlanId: string,
): { folderId: string; itemId: string } | null {
  for (const folder of bookmarks.items) {
    for (const item of folder.items) {
      if (item.meal_plan_id === mealPlanId) {
        return {
          folderId: folder.id,
          itemId: item.id,
        };
      }
    }
  }

  return null;
}

export default function ClientMealPlanDetailPage() {
  const params = useParams<{ mealPlanId: string }>();
  const mealPlanId = typeof params?.mealPlanId === "string" ? params.mealPlanId : "";

  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [mealPlan, setMealPlan] = useState<JsonValue | null>(null);
  const [bookmarksData, setBookmarksData] = useState<BookmarkFolderListPayload | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<SectionErrors>(EMPTY_SECTION_ERRORS);
  const [bookmarkFeedback, setBookmarkFeedback] = useState<FeedbackState | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarkBusyId, setBookmarkBusyId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [redirectingToCheckout, setRedirectingToCheckout] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    if (!mealPlanId) {
      setLoading(false);
      setMealPlan(null);
      setDetailError("Meal plan identifier unavailable.");
      setBookmarksData(null);
      setSectionErrors(EMPTY_SECTION_ERRORS);
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setDetailError(null);
      setSectionErrors(EMPTY_SECTION_ERRORS);
      setBookmarkFeedback(null);

      try {
        const [detailResult, bookmarksResult] = await Promise.allSettled([
          fetch(`/api/client/meal-plans/${mealPlanId}`, {
            cache: "no-store",
          }).then((response) => response.json() as Promise<MealPlanDetailResponse>),
          fetch("/api/client/bookmarks", {
            cache: "no-store",
          }).then((response) => response.json() as Promise<BookmarksApiResponse>),
        ]);

        if (!active) {
          return;
        }

        if (detailResult.status === "fulfilled") {
          if (detailResult.value.ok) {
            setMealPlan(detailResult.value.data);
          } else {
            setMealPlan(null);
            setDetailError(detailResult.value.error.message);
          }
        } else {
          setMealPlan(null);
          setDetailError("Unable to load meal plan detail.");
        }

        if (bookmarksResult.status === "fulfilled") {
          if (bookmarksResult.value.ok) {
            setBookmarksData(bookmarksResult.value.data);
          } else {
            setBookmarksData(null);
            setSectionErrors({
              bookmarks: bookmarksResult.value.error.message ?? "Unable to load bookmarks.",
            });
          }
        } else {
          setBookmarksData(null);
          setSectionErrors({
            bookmarks: "Unable to load bookmarks.",
          });
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
  }, [mealPlanId, status, user]);

  async function refreshBookmarks() {
    const response = await fetch("/api/client/bookmarks", { cache: "no-store" });
    const payload = (await response.json()) as BookmarksApiResponse;

    if (!payload.ok) {
      throw new Error(payload.error.message);
    }

    setBookmarksData(payload.data);
    setSectionErrors(EMPTY_SECTION_ERRORS);
  }

  async function ensureDefaultFolder(): Promise<BookmarkFolder | null> {
    if (bookmarksData?.items?.length) {
      return bookmarksData.items[0] ?? null;
    }

    const response = await fetch("/api/client/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Favorites" }),
    });
    const payload = (await response.json()) as CreateFolderResponse;

    if (!payload.ok) {
      setBookmarkFeedback({
        tone: "error",
        title: "Bookmark update failed",
        message: payload.error.message,
      });
      return null;
    }

    setBookmarksData({
      items: [payload.data],
      count: 1,
    });
    setSectionErrors(EMPTY_SECTION_ERRORS);

    return payload.data;
  }

  async function handleToggleBookmark(planId: string | null, planName: string) {
    if (!planId) {
      setBookmarkFeedback({
        tone: "error",
        title: "Bookmark update failed",
        message: "This meal plan is missing an identifier.",
      });
      return;
    }

    if (!bookmarksData) {
      setBookmarkFeedback({
        tone: "error",
        title: "Bookmarks unavailable",
        message: "Bookmark folders are unavailable right now, so saved-state updates are disabled.",
      });
      return;
    }

    const existing = findBookmarkMatch(bookmarksData, planId);
    const removing = Boolean(existing);

    setBookmarkBusyId(planId);
    setBookmarkFeedback({
      tone: "info",
      title: removing ? "Removing bookmark" : "Saving bookmark",
      message: removing
        ? `${planName} is being removed from your saved plans.`
        : `${planName} is being added to your saved plans.`,
    });

    try {
      if (existing) {
        const response = await fetch(
          `/api/client/bookmarks/${existing.folderId}/items/${existing.itemId}`,
          { method: "DELETE" },
        );
        const payload = (await response.json()) as ApiResponse<{ deleted: true }>;

        if (!payload.ok) {
          throw new Error(payload.error.message);
        }
      } else {
        const folder = await ensureDefaultFolder();
        if (!folder) {
          return;
        }

        const response = await fetch(`/api/client/bookmarks/${folder.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meal_plan_id: planId }),
        });
        const payload = (await response.json()) as ApiResponse<unknown>;

        if (!payload.ok) {
          throw new Error(payload.error.message);
        }
      }

      await refreshBookmarks();

      setBookmarkFeedback({
        tone: "success",
        title: removing ? "Bookmark removed" : "Bookmark saved",
        message: removing
          ? `${planName} was removed from your saved plans.`
          : `${planName} was added to your saved plans.`,
      });
    } catch (error) {
      setBookmarkFeedback({
        tone: "error",
        title: "Bookmark update failed",
        message: error instanceof Error ? error.message : "Unable to update bookmark.",
      });
    } finally {
      setBookmarkBusyId(null);
    }
  }

  async function handleStartCheckout() {
    if (!mealPlanId) {
      setCheckoutError("We couldn't start checkout. Please try again.");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);
    setCheckoutSuccess(null);
    setCheckoutUrl(null);
    setRedirectingToCheckout(false);

    try {
      const response = await fetch("/api/client/checkout/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meal_plan_id: mealPlanId,
        }),
      });
      const payload = (await response.json()) as CheckoutSessionResponse;

      if (!payload.ok) {
        setCheckoutError("We couldn't start checkout. Please try again.");
        return;
      }

      const data =
        typeof payload.data === "object" && payload.data !== null && !Array.isArray(payload.data)
          ? payload.data
          : null;

      const returnedCheckoutUrl =
        data && typeof data.checkout_url === "string" ? data.checkout_url : null;

      setCheckoutUrl(returnedCheckoutUrl);
      setCheckoutSuccess(
        returnedCheckoutUrl
          ? "Ordering options are ready. Continue when you want to review the next step."
          : "Ordering options were prepared for this meal plan.",
      );
    } catch {
      setCheckoutError("We couldn't start checkout. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (status === "loading") {
    return <LoadingBlock title="Loading meal plan" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return (
      <LoadingBlock
        title="Redirecting"
        message="Meal plan detail requires an authenticated client session."
      />
    );
  }

  const view = adaptMealPlanDetailView({
    mealPlan,
    mealPlanId,
    bookmarks: bookmarksData,
  });
  const currentPlanId = view.checkout.mealPlanId;
  const bookmarksAvailable = bookmarksData !== null;
  const bookmarkBusy = currentPlanId !== null && bookmarkBusyId === currentPlanId;
  const bookmarkActionLabel = view.bookmark.isBookmarked ? "Remove bookmark" : "Save plan";
  const bookmarkButtonLabel = bookmarkBusy
    ? view.bookmark.isBookmarked
      ? "Removing..."
      : "Saving..."
    : bookmarksAvailable
      ? bookmarkActionLabel
      : "Bookmarks unavailable";
  const detailCalories = getNumberLike(mealPlan, ["total_calories", "calories"]);
  const selected = selectedPlanId === mealPlanId;
  const actionState = checkoutUrl ? "ready" : selected ? "selected" : "default";
  const actionTitle =
    actionState === "ready"
      ? "Ordering options ready"
      : actionState === "selected"
        ? "Plan selected"
        : "Review this plan";
  const actionDescription =
    actionState === "ready"
      ? "Your next step is ready when you want to continue."
      : actionState === "selected"
        ? "This meal plan is selected in your current page session."
        : "Selection stays local until you decide to continue.";
  const actionHelperText =
    actionState === "ready"
      ? "You're about to continue to secure checkout"
      : actionState === "selected"
        ? "Choose how you'd like to proceed with this plan"
        : "Select this plan to view ordering options";

  return (
    <MobileAppShell
      user={user}
      activePath="/client/meal-plans"
      greeting={formatDisplayNameFromUser(user)}
      title="Meal plan detail"
      subtitle={!loading && !detailError ? view.hero.title : "Review the selected marketplace plan."}
      notificationSlot={<ActionPill href="/client/meal-plans/bookmark">Bookmark page</ActionPill>}
      topHubAction={<ActionPill href="/client/meal-plans" tone="purple">Back to plans</ActionPill>}
    >
      {loading ? (
        <MobileSection
          eyebrow="Loading"
          title="Loading detail"
          description={`Fetching /api/client/meal-plans/${mealPlanId}.`}
        >
          <DetailStateCard
            title="Loading detail"
            message="The protected client detail route is still loading."
          />
        </MobileSection>
      ) : null}

      {detailError ? (
        <MobileSection
          eyebrow="Unavailable"
          title="Unable to load meal plan detail"
          description="The protected detail route did not return a usable meal plan."
        >
          <DetailStateCard
            title="Meal plan unavailable"
            message={detailError}
            action={<ActionPill href="/client/meal-plans" tone="purple">Back to plans</ActionPill>}
            role="alert"
          />
        </MobileSection>
      ) : null}

      {!loading && !detailError ? (
        <>
          {bookmarkFeedback ? <DetailFeedbackCard feedback={bookmarkFeedback} /> : null}
          {sectionErrors.bookmarks ? (
            <DetailFeedbackCard
              feedback={{
                tone: "error",
                title: "Bookmarks unavailable",
                message: sectionErrors.bookmarks,
              }}
            />
          ) : null}

          <MobileCard as="section" variant="action" className="mobile-pt-detail-hero client-meal-plan-detail-hero">
            {view.hero.heroImageUrl ? (
              <div
                className="mobile-training-card-media client-meal-plan-detail-hero__media"
                style={{
                  minHeight: "12rem",
                  padding: 0,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <Image
                  src={view.hero.heroImageUrl}
                  alt={view.hero.title}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 960px"
                  style={{ objectFit: "cover" }}
                />
              </div>
            ) : (
              <div className="mobile-meal-plan-placeholder client-meal-plan-detail-hero__media" aria-hidden="true">
                <div className="mobile-meal-plan-placeholder__grid" />
              </div>
            )}

            {typeof detailCalories === "number" ? (
              <MobileMealPlanRow
                className="client-meal-plan-detail-summary"
                name={view.hero.title}
                vendorName={view.hero.vendorName}
                calories={formatNumber(detailCalories)}
                price={view.hero.priceLabel}
                badge={
                  <span
                    className={`mobile-pill ${
                      view.bookmark.isBookmarked ? "mobile-pill--yellow" : "mobile-pill--purple"
                    }`}
                  >
                    {view.bookmark.isBookmarked ? "Saved" : view.hero.statusLabel}
                  </span>
                }
              />
            ) : (
              <div className="mobile-pt-client-card__header client-meal-plan-detail-summary">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Meal plan</p>
                  <h2 className="mobile-section__title">{view.hero.title}</h2>
                  <p className="mobile-section__description">{view.hero.vendorName}</p>
                </div>
                <span
                  className={`mobile-pill ${
                    view.bookmark.isBookmarked ? "mobile-pill--yellow" : "mobile-pill--purple"
                  }`}
                >
                  {view.bookmark.isBookmarked ? "Saved" : view.hero.statusLabel}
                </span>
              </div>
            )}

            <p className="mobile-section__description">{view.hero.description}</p>

            <dl className="mobile-pt-training-meta-grid client-meal-plan-detail-summary__stats">
              <div>
                <dt>Vendor ZIP</dt>
                <dd>{view.hero.vendorZipLabel}</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>{view.hero.priceLabel}</dd>
              </div>
              <div>
                <dt>Items</dt>
                <dd>{view.hero.itemCountLabel}</dd>
              </div>
              <div>
                <dt>Availability</dt>
                <dd>{view.hero.availabilityLabel}</dd>
              </div>
            </dl>

            <div className="mobile-pt-actions">
              <ActionPill href="/client/meal-plans" tone="purple">Back to plans</ActionPill>
              <ActionPillButton
                onClick={() => void handleToggleBookmark(currentPlanId, view.hero.title)}
                tone={view.bookmark.isBookmarked ? "yellow" : "purple"}
                disabled={!bookmarksAvailable || bookmarkBusy}
                ariaLabel={`${bookmarkActionLabel} for ${view.hero.title}`}
              >
                {bookmarkButtonLabel}
              </ActionPillButton>
            </div>
          </MobileCard>

          <MobileSection
            eyebrow="Overview"
            title="Nutrition and price"
            description="Only fields surfaced by the current protected detail payload are shown here."
          >
            <div
              className="mobile-pt-detail-stat-grid"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))" }}
            >
              <MobileStatCard label="Price" value={view.hero.priceLabel} />
              <MobileStatCard label="Calories" value={view.hero.caloriesLabel} />
              <MobileStatCard label="Items" value={view.hero.itemCountLabel} />
              <MobileStatCard label="Availability" value={view.hero.availabilityLabel} />
            </div>
            {view.macros.length > 0 ? (
              <div className="mobile-pt-training-meta-grid">
                {view.macros.map((macro) => (
                  <div key={macro.label}>
                    <dt>{macro.label}</dt>
                    <dd>{macro.value}</dd>
                  </div>
                ))}
              </div>
            ) : null}
          </MobileSection>

          <MobileSection
            eyebrow="Included"
            title="Meal items"
            description={
              view.hasMeals
                ? "These items are currently surfaced in the selected meal plan."
                : "The current detail payload does not include named meal items."
            }
          >
            {view.hasMeals ? (
              <div className="mobile-pt-detail-stack client-meal-plan-detail-includes">
                {view.meals.map((item) => (
                  <MobileCard
                    key={item.key}
                    as="article"
                    variant="soft"
                    className="mobile-pt-detail-action-card client-meal-plan-detail-includes__item"
                  >
                    <div className="mobile-pt-client-card__header">
                      <div className="mobile-section__copy">
                        <p className="mobile-section__eyebrow">Included item</p>
                        <h3 className="mobile-section__title">{item.name}</h3>
                      </div>
                      {item.caloriesLabel ? (
                        <span className="mobile-pill mobile-pill--purple">{item.caloriesLabel}</span>
                      ) : null}
                    </div>

                    <dl className="mobile-pt-training-meta-grid client-meal-plan-detail-includes__meta">
                      {item.quantityLabel ? (
                        <div>
                          <dt>Quantity</dt>
                          <dd>{item.quantityLabel}</dd>
                        </div>
                      ) : null}
                      {item.priceLabel ? (
                        <div>
                          <dt>Price</dt>
                          <dd>{item.priceLabel}</dd>
                        </div>
                      ) : null}
                      {item.noteLabel ? (
                        <div>
                          <dt>Notes</dt>
                          <dd>{item.noteLabel}</dd>
                        </div>
                      ) : null}
                      {item.metadata.map((entry) => (
                        <div key={`${item.key}-${entry.label}`}>
                          <dt>{entry.label}</dt>
                          <dd>{entry.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </MobileCard>
                ))}
              </div>
            ) : (
              <DetailStateCard
                title="Included meals are not listed yet"
                message="Use the overview above to evaluate the plan while more detailed contents remain unavailable."
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Vendor"
            title="Vendor and pickup"
            description="Source details are shown only when the current meal-plan payload supports them."
          >
            {view.hasVendorDetails ? (
              <MobileCard as="div" variant="soft" className="mobile-pt-detail-action-card client-meal-plan-detail-vendor">
                <dl className="mobile-pt-training-meta-grid client-meal-plan-detail-vendor__stats">
                  {view.vendorDetails.map((entry) => (
                    <div key={`${entry.label}-${entry.value}`}>
                      <dt>{entry.label}</dt>
                      <dd>{entry.value}</dd>
                    </div>
                  ))}
                </dl>
              </MobileCard>
            ) : (
              <DetailStateCard
                title="Vendor detail is limited"
                message="The current meal-plan payload does not expose extra vendor or pickup fields."
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Availability"
            title="Pickup and availability"
            description={
              view.hasAvailability
                ? "Pickup windows and inventory are shown only when the current payload exposes them."
                : "Availability counts are shown above when supported, even if the payload omits individual pickup windows."
            }
          >
            {view.hasAvailability ? (
              <div className="mobile-pt-detail-stack">
                {view.availability.map((entry) => (
                  <MobileCard
                    key={entry.key}
                    as="article"
                    variant="soft"
                    className="mobile-pt-detail-action-card"
                  >
                    <div className="mobile-pt-client-card__header">
                      <div className="mobile-section__copy">
                        <p className="mobile-section__eyebrow">Pickup window</p>
                        <h3 className="mobile-section__title">{entry.title}</h3>
                      </div>
                      {entry.statusLabel ? (
                        <span className="mobile-pill mobile-pill--purple">{entry.statusLabel}</span>
                      ) : null}
                    </div>

                    <dl className="mobile-pt-training-meta-grid">
                      {entry.windowLabel ? (
                        <div>
                          <dt>Window</dt>
                          <dd>{entry.windowLabel}</dd>
                        </div>
                      ) : null}
                      {entry.inventoryLabel ? (
                        <div>
                          <dt>Inventory</dt>
                          <dd>{entry.inventoryLabel}</dd>
                        </div>
                      ) : null}
                      {entry.locationLabel ? (
                        <div>
                          <dt>Location</dt>
                          <dd>{entry.locationLabel}</dd>
                        </div>
                      ) : null}
                      {entry.noteLabel ? (
                        <div>
                          <dt>Notes</dt>
                          <dd>{entry.noteLabel}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </MobileCard>
                ))}
              </div>
            ) : (
              <DetailStateCard
                title="Pickup windows are not listed yet"
                message={
                  view.hero.availabilityLabel === "Availability unavailable"
                    ? "The current meal-plan payload does not include pickup-window detail."
                    : "Availability counts are visible above, but the payload does not include individual pickup-window details."
                }
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Next step"
            title="Choose how to continue"
            description="Keep selection local to this page, or open the currently supported ordering options."
          >
            <MobileCard as="div" variant="soft" className={`mobile-pt-detail-action-card client-meal-plan-detail-actions ${actionState === "selected" ? "client-meal-plan-detail-actions--selected" : actionState === "ready" ? "client-meal-plan-detail-actions--ready" : ""}`}>
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Next step</p>
                <h3 className="mobile-section__title">{actionTitle}</h3>
                <p className="mobile-section__description">{actionDescription}</p>
              </div>

              <div className="mobile-pt-actions">
                {actionState === "ready" && checkoutUrl ? (
                  <a
                    className="mobile-pill mobile-pill--yellow mobile-focus-ring"
                    href={checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setRedirectingToCheckout(true)}
                  >
                    Secure Checkout
                  </a>
                ) : actionState === "selected" ? (
                  <ActionPillButton
                    onClick={() => void handleStartCheckout()}
                    disabled={checkoutLoading || !view.checkout.canCheckout}
                    ariaLabel={`View ordering options for ${view.hero.title}`}
                  >
                    {checkoutLoading ? "Preparing..." : "View Ordering Options"}
                  </ActionPillButton>
                ) : (
                  <ActionPillButton
                    onClick={() => {
                      setRedirectingToCheckout(false);
                      setSelectedPlanId(mealPlanId);
                    }}
                    disabled={!view.checkout.canCheckout}
                    ariaLabel={`Select ${view.hero.title} for checkout`}
                  >
                    Select Plan
                  </ActionPillButton>
                )}
              </div>

              <p className="mobile-section__description">
                {view.checkout.canCheckout
                  ? actionHelperText
                  : view.checkout.disabledReason ?? actionHelperText}
              </p>

              {actionState === "selected" ? (
                <MobileCard as="div" variant="accent" className="mobile-pt-detail-action-card">
                  <div className="mobile-section__copy">
                    <p className="mobile-section__eyebrow">Ordering options</p>
                    <h3 className="mobile-section__title">{view.hero.title}</h3>
                    <p className="mobile-section__description">
                      You&apos;ll be redirected to complete your order.
                    </p>
                  </div>
                  <dl className="mobile-pt-training-meta-grid">
                    <div>
                      <dt>Plan</dt>
                      <dd>{view.hero.title}</dd>
                    </div>
                    <div>
                      <dt>Vendor</dt>
                      <dd>{view.hero.vendorName}</dd>
                    </div>
                    <div>
                      <dt>Summary</dt>
                      <dd>{view.hero.description}</dd>
                    </div>
                  </dl>
                </MobileCard>
              ) : null}

              {actionState === "selected" ? (
                <p className="mobile-section__description">Plan selected for this session.</p>
              ) : null}
              {redirectingToCheckout ? (
                <p className="mobile-section__description">Redirecting to secure checkout...</p>
              ) : null}
              {checkoutSuccess ? (
                <p className="mobile-section__description">{checkoutSuccess}</p>
              ) : null}
              {checkoutError ? (
                <p className="mobile-section__description" role="alert">{checkoutError}</p>
              ) : null}
            </MobileCard>
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
