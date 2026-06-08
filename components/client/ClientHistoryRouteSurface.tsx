"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import {
  adaptClientHistoryView,
  type ClientHistoryModeFilter,
} from "@/lib/view-models/client-history";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";

type WorkoutHistoryResponse = ApiResponse<JsonValue>;

export type ClientHistoryRouteSurfaceProps = {
  activePath: string;
  backHref: string;
  backLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  sectionTitle: string;
  sectionDescription: string;
};

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type StateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

const HISTORY_API_PATH = "/api/client/training/workout-logs";
const PAGE_LIMIT = 30;

const FILTER_OPTIONS: Array<{ value: ClientHistoryModeFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "rep", label: "Rep" },
  { value: "set", label: "Set" },
  { value: "general_workout", label: "General Workout" },
];

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function StateCard({ title, message, action }: StateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="mobile-training-state-card">
      <div className="mobile-section__copy">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
      {action ? <div className="mobile-training-action-row">{action}</div> : null}
    </MobileCard>
  );
}

export function ClientHistoryRouteSurface({
  activePath,
  backHref,
  backLabel,
  pageTitle,
  pageSubtitle,
  sectionTitle,
  sectionDescription,
}: ClientHistoryRouteSurfaceProps) {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [historyData, setHistoryData] = useState<JsonValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ClientHistoryModeFilter>("all");
  const [searchValue, setSearchValue] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams({
          limit: String(PAGE_LIMIT),
          offset: String(offset),
        });
        const normalizedSearch = searchValue.trim();

        if (typeFilter !== "all") {
          params.set("mode", typeFilter);
        }

        if (normalizedSearch.length > 0) {
          params.set("search", normalizedSearch);
        }

        const response = await fetch(`${HISTORY_API_PATH}?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as WorkoutHistoryResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message);
          setHistoryData(null);
          return;
        }

        setHistoryData(payload.data);
      } catch {
        if (!active || controller.signal.aborted) {
          return;
        }

        setErrorMessage("Unable to load workout history.");
        setHistoryData(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [offset, searchValue, status, typeFilter, user]);

  const historyView = useMemo(() => adaptClientHistoryView(historyData), [historyData]);

  if (status === "loading") {
    return <LoadingBlock title="Loading workout history" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Workout history requires an authenticated client session." />;
  }

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title={pageTitle}
      subtitle={pageSubtitle}
      notificationSlot={<ActionPill href={backHref} tone="purple">{backLabel}</ActionPill>}
      activePath={activePath}
    >
      {loading ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading history"
          description="Fetching saved workout logs through the protected client route."
        >
          <StateCard
            title="Refreshing workout history"
            message="This mobile history utility is waiting on the current signed frontend-to-BFF responses."
          />
        </MobileSection>
      ) : null}

      {errorMessage ? (
        <MobileSection
          eyebrow="Workout history"
          title="Unable to load workout history"
          description="This client utility route stays on the existing workout-log BFF and does not fall back to direct backend calls."
        >
          <StateCard title="Unable to load workout history" message={errorMessage} />
        </MobileSection>
      ) : null}

      {!loading && !errorMessage ? (
        <>
          <MobileSection
            eyebrow="History utility"
            title={sectionTitle}
            description={sectionDescription}
          >
            <MobileCard as="article" variant="action" className="mobile-training-log-card">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Protected client route</p>
                <h2 className="mobile-section__title">Workout history</h2>
                <p className="mobile-section__description">
                  Filters, search, and older-entry pagination remain sourced only from the current client workout-log BFF route.
                </p>
              </div>
            </MobileCard>

            {historyView.count !== null ? (
              <div className="mobile-training-meta-grid">
                <MobileStatCard
                  label="Returned logs"
                  value={historyView.countLabel}
                  progressText={historyView.pageWindowLabel}
                />
                <MobileStatCard
                  label="Older entries"
                  value={historyView.olderEntriesLabel}
                  progressText={
                    historyView.hasMore
                      ? "Use the current older-entries control to advance."
                      : "This history page has no next offset."
                  }
                />
              </div>
            ) : null}
          </MobileSection>

          <MobileSection
            eyebrow="Log history"
            title="Workout history"
            description="Review and filter saved workout entries from newest to oldest."
          >
            <div
              className="mobile-training-pill-row"
              role="radiogroup"
              aria-label="Workout type filter"
            >
              {FILTER_OPTIONS.map((option) => {
                const active = typeFilter === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={[
                      "mobile-pill",
                      active ? "mobile-pill--yellow" : "mobile-pill--purple",
                      "mobile-focus-ring",
                    ].join(" ")}
                    onClick={() => {
                      setTypeFilter(option.value);
                      setOffset(0);
                    }}
                    aria-pressed={active}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="field">
              <label htmlFor="history-search">Search</label>
              <input
                id="history-search"
                className="mobile-focus-ring"
                type="search"
                placeholder="Search exercises, equipment, or notes"
                value={searchValue}
                onChange={(event) => {
                  setSearchValue(event.target.value);
                  setOffset(0);
                }}
              />
            </div>

            {historyView.rows.length > 0 ? (
              <div className="stacked-list">
                {historyView.rows.map((row, index) => (
                  <MobileCard
                    key={row.id}
                    as="article"
                    variant={index === 0 ? "accent" : "soft"}
                    className="mobile-training-checklist-card"
                  >
                    <div className="mobile-training-checklist-card__header">
                      <div className="mobile-section__copy">
                        <p className="mobile-section__eyebrow">{row.performedAtLabel}</p>
                        <h3 className="mobile-section__title">{row.exerciseName}</h3>
                        <p className="mobile-section__description">Notes: {row.notes}</p>
                      </div>
                      <span className="mobile-pill mobile-pill--yellow">{row.typeLabel}</span>
                    </div>

                    <div className="mobile-training-pill-row" aria-label={`${row.exerciseName} preview`}>
                      <span className="mobile-pill">Sets {row.sets}</span>
                      <span className="mobile-pill">Reps {row.reps}</span>
                      <span className="mobile-pill">Weight {row.weight}</span>
                      <span className="mobile-pill">Time {row.duration}</span>
                    </div>
                  </MobileCard>
                ))}
              </div>
            ) : (
              <StateCard
                title="No logged workouts yet."
                message="Saved workout entries will appear here once you use the current client workout logging flow."
              />
            )}

            <div className="mobile-training-action-row">
              <button
                type="button"
                className="utility-icon-link mobile-focus-ring"
                onClick={() => {
                  if (historyView.nextOffset !== null) {
                    setOffset(historyView.nextOffset);
                  }
                }}
                disabled={!historyView.hasMore || historyView.nextOffset === null}
                aria-label="Show older workout entries"
                title="Show older workout entries"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.97 5.97a.75.75 0 0 1 1.06 0l5.5 5.5a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 1 1-1.06-1.06L13.94 12 8.97 7.03a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </button>
            </div>
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
