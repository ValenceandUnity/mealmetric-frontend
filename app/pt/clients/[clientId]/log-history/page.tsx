"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";
import {
  adaptPTLogHistoryView,
  type PTLogHistoryModeFilter,
} from "@/lib/view-models/pt-log-history";

type JsonApiResponse = ApiResponse<JsonValue>;

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

const PAGE_LIMIT = 30;

const FILTER_OPTIONS: Array<{ value: PTLogHistoryModeFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "rep", label: "Rep" },
  { value: "set", label: "Set" },
  { value: "general_workout", label: "General Workout" },
];

const filterRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.75rem",
};

const paginationStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
};

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function StateCard({ title, message, action }: StateCardProps) {
  return (
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
      <div className="mobile-section__copy">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
      {action ? <div className="mobile-pt-actions">{action}</div> : null}
    </MobileCard>
  );
}

export default function PTClientLogHistoryPage() {
  const params = useParams<{ clientId: string }>();
  const searchParams = useSearchParams();
  const clientId = typeof params?.clientId === "string" ? params.clientId : "";
  const clientEmail = searchParams.get("clientEmail")?.trim() ?? "";
  const title = clientEmail.length > 0 ? clientEmail : "Client Log History";
  const historyApiPath = `/api/pt/clients/${clientId}/workout-logs`;

  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [historyData, setHistoryData] = useState<JsonValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<PTLogHistoryModeFilter>("all");
  const [searchValue, setSearchValue] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "pt") {
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

        const response = await fetch(`${historyApiPath}?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as JsonApiResponse;

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
  }, [historyApiPath, offset, searchValue, status, typeFilter, user]);

  const historyView = useMemo(() => adaptPTLogHistoryView(historyData), [historyData]);

  if (status === "loading") {
    return <LoadingBlock title="Loading workout history" message="Validating your PT session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Workout history requires an authenticated pt session." />;
  }

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title={title}
      subtitle="Read-only log history for a linked client, filtered through the protected PT BFF route."
      notificationSlot={<ActionPill href="/pt/clients" tone="purple">Back to clients</ActionPill>}
      activePath="/pt/clients"
    >
      {loading ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading workout history"
          description="Fetching saved workout logs through the protected PT route."
        >
          <StateCard
            title="Refreshing linked-client history"
            message="This mobile PT history surface is waiting on the current signed frontend-to-BFF responses."
          />
        </MobileSection>
      ) : null}

      {errorMessage ? (
        <MobileSection
          eyebrow="Workout history"
          title="Unable to load workout history"
          description="This PT route stays read-only and does not fall back to direct backend requests."
        >
          <StateCard title="Unable to load workout history" message={errorMessage} />
        </MobileSection>
      ) : null}

      {!loading && !errorMessage ? (
        <>
          <MobileSection
            eyebrow="PT history"
            title="Client log history"
            description="Review saved workout entries from newest to oldest for this linked client."
          >
            <MobileCard as="article" variant="action" className="mobile-pt-detail-action-card">
              <div className="mobile-pt-client-card__header">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Linked client</p>
                  <h2 className="mobile-section__title">{clientEmail || "Client label unavailable"}</h2>
                  <p className="mobile-section__description">Client ID: {clientId || "Unavailable"}</p>
                </div>
                <span className="mobile-pill mobile-pill--purple">PT read-only</span>
              </div>

              <p className="mobile-section__description">
                This route keeps the existing PT workout-log history flow on the protected BFF path and does not add note, edit, or delete mutations.
              </p>
            </MobileCard>

            <div className="mobile-pt-detail-stat-grid">
              <MobileStatCard
                label="Returned logs"
                value={historyView.countLabel}
                progressText={historyView.pageWindowLabel}
              />
              <MobileStatCard
                label="Visible rows"
                value={historyView.visibleRowsLabel}
                progressText="Flattened exercise rows shown from the current history page."
              />
              <MobileStatCard
                label="Older entries"
                value={historyView.paginationStateLabel}
                progressText={historyView.nextOffsetLabel}
              />
            </div>
          </MobileSection>

          <MobileSection
            eyebrow="Controls"
            title="History filters"
            description="Filter and search using the same PT workout-log query params already supported by the current route."
          >
            <div style={filterRowStyle} role="radiogroup" aria-label="Workout type filter">
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
                    aria-pressed={active}
                    onClick={() => {
                      setTypeFilter(option.value);
                      setOffset(0);
                    }}
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
          </MobileSection>

          <MobileSection
            eyebrow="Workout history"
            title="Log history"
            description="Each card preserves the current read-only row fields returned by the PT workout-log route."
          >
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
                message="Saved workout entries will appear here once this linked client records activity through the existing logging flow."
              />
            )}

            <div style={paginationStyle}>
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
