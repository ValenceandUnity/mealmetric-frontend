"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { isObject } from "@/lib/adapters/common";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import {
  adaptPTClientDetailView,
  type MobilePTMetricSnapshotView,
  type MobilePTWorkoutLogPreviewView,
} from "@/lib/view-models/pt-client-detail";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";

type JsonApiResponse = ApiResponse<JsonValue>;

type SectionErrors = {
  detail: string | null;
  assignments: string | null;
  metrics: string | null;
  workoutLogs: string | null;
};

const EMPTY_SECTION_ERRORS: SectionErrors = {
  detail: null,
  assignments: null,
  metrics: null,
  workoutLogs: null,
};

function replaceWorkoutLogInResponse(current: JsonValue | null, updatedLog: JsonValue): JsonValue | null {
  if (isObject(current) && Array.isArray(current.items) && isObject(updatedLog)) {
    return {
      ...current,
      items: current.items.map((item) => (isObject(item) && item.id === updatedLog.id ? updatedLog : item)),
    };
  }

  if (Array.isArray(current) && isObject(updatedLog)) {
    return current.map((item) => (isObject(item) && item.id === updatedLog.id ? updatedLog : item));
  }

  return current;
}

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type DetailStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

type PTNoteEditorProps = {
  log: MobilePTWorkoutLogPreviewView;
  onSave: (workoutLogId: string, ptNotes: string | null) => Promise<void>;
};

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function DetailStateCard({ title, message, action }: DetailStateCardProps) {
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

function getMetricIcon(label: string) {
  switch (label.toLowerCase()) {
    case "intake ceiling":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4c2.4 2.8 4 5.1 4 7.7A4 4 0 0 1 8 11.7C8 9.1 9.6 6.8 12 4Z" />
          <path d="M8.5 13.5A3.5 3.5 0 0 0 12 17a3.5 3.5 0 0 0 3.5-3.5" />
        </svg>
      );
    case "expenditure floor":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 3c.4 2.8 2.7 3.6 2.7 6.2A2.7 2.7 0 0 1 11 11.9 3.9 3.9 0 0 1 7.5 8c-2 1.7-3.5 4.3-3.5 7a8 8 0 1 0 16 0c0-3.5-2-6.3-5-8.4" />
        </svg>
      );
    case "net balance":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 17V9m6 8V6m6 11v-5" />
        </svg>
      );
    case "weekly target deficit":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14m-5-5 5 5 5-5" />
        </svg>
      );
    case "deficit progress":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m7 12 3 3 7-7" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
    case "snapshot date":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 4v3m8-3v3M5 9h14M6.5 6.5h11A1.5 1.5 0 0 1 19 8v9.5A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5V8A1.5 1.5 0 0 1 6.5 6.5Z" />
        </svg>
      );
    default:
      return null;
  }
}

function PTNoteEditor({ log, onSave }: PTNoteEditorProps) {
  const [draft, setDraft] = useState(log.ptNoteText ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    setDraft(log.ptNoteText ?? "");
  }, [log.ptNoteText]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedbackMessage(null);
    setFeedbackTone(null);

    try {
      await onSave(log.id, draft.trim().length > 0 ? draft : null);
      setFeedbackMessage("PT note saved.");
      setFeedbackTone("success");
      setIsEditing(false);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Unable to save PT note.");
      setFeedbackTone("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mobile-pt-note-block">
      <div className="mobile-section__copy">
        <p className="mobile-section__eyebrow">PT notes</p>
        <p className="mobile-pt-note-text">{log.ptNoteText ?? log.notesForm.emptyLabel}</p>
      </div>

      {isEditing ? (
        <form className="mobile-pt-form-grid mobile-pt-note-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor={`pt-note-${log.id}`}>{log.notesForm.fieldLabel}</label>
            <textarea
              id={`pt-note-${log.id}`}
              className="mobile-focus-ring"
              value={draft}
              rows={4}
              disabled={saving}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
          <div className="mobile-pt-actions">
            <button
              type="submit"
              className="mobile-pt-button mobile-pt-button--primary mobile-focus-ring"
              disabled={saving}
            >
              {saving ? "Saving PT note..." : log.notesForm.saveActionLabel}
            </button>
            <button
              type="button"
              className="mobile-pt-button mobile-focus-ring"
              disabled={saving}
              onClick={() => {
                setDraft(log.ptNoteText ?? "");
                setFeedbackMessage(null);
                setFeedbackTone(null);
                setIsEditing(false);
              }}
            >
              {log.notesForm.cancelActionLabel}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="mobile-pt-button mobile-focus-ring"
          onClick={() => {
            setDraft(log.ptNoteText ?? "");
            setFeedbackMessage(null);
            setFeedbackTone(null);
            setIsEditing(true);
          }}
        >
          {log.ptNoteText ? log.notesForm.editActionLabel : log.notesForm.addActionLabel}
        </button>
      )}

      {feedbackMessage ? (
        <p
          className={[
            "mobile-pt-note-feedback",
            feedbackTone === "error" ? "mobile-pt-note-feedback--error" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          role={feedbackTone === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {feedbackMessage}
        </p>
      ) : null}
    </div>
  );
}

function MetricCardRow({ cards }: { cards: MobilePTMetricSnapshotView[] }) {
  return (
    <div className="mobile-pt-detail-stat-grid">
      {cards.map((card) => (
        <MobileStatCard
          key={card.label}
          label={card.label}
          value={card.value}
          unit={card.unit}
          target={card.target}
          progressText={card.progressText}
          icon={getMetricIcon(card.label)}
        />
      ))}
    </div>
  );
}

export default function PTClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = typeof params?.clientId === "string" ? params.clientId : "";

  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [clientDetailData, setClientDetailData] = useState<JsonValue | null>(null);
  const [assignmentsData, setAssignmentsData] = useState<JsonValue | null>(null);
  const [metricsData, setMetricsData] = useState<JsonValue | null>(null);
  const [workoutLogsData, setWorkoutLogsData] = useState<JsonValue | null>(null);
  const [sectionErrors, setSectionErrors] = useState<SectionErrors>(EMPTY_SECTION_ERRORS);
  const [loading, setLoading] = useState(true);

  async function handleSavePtNote(workoutLogId: string, ptNotes: string | null) {
    const response = await fetch(`/api/pt/workout-logs/${workoutLogId}/pt-notes`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pt_notes: ptNotes }),
    });
    const payload = (await response.json()) as JsonApiResponse;

    if (!payload.ok) {
      throw new Error(payload.error.message);
    }

    setWorkoutLogsData((current) => replaceWorkoutLogInResponse(current, payload.data));
  }

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "pt" || !clientId) {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setSectionErrors(EMPTY_SECTION_ERRORS);

      try {
        const [detailResponse, assignmentsResponse, metricsResponse, workoutLogsResponse] = await Promise.all([
          fetch(`/api/pt/clients/${clientId}`, { cache: "no-store" }),
          fetch(`/api/pt/clients/${clientId}/assignments`, { cache: "no-store" }),
          fetch(`/api/pt/clients/${clientId}/metrics`, { cache: "no-store" }),
          fetch(`/api/pt/clients/${clientId}/workout-logs`, { cache: "no-store" }),
        ]);

        const [detailPayload, assignmentsPayload, metricsPayload, workoutLogsPayload] = (await Promise.all([
          detailResponse.json(),
          assignmentsResponse.json(),
          metricsResponse.json(),
          workoutLogsResponse.json(),
        ])) as [JsonApiResponse, JsonApiResponse, JsonApiResponse, JsonApiResponse];

        if (!active) {
          return;
        }

        const nextErrors: SectionErrors = { ...EMPTY_SECTION_ERRORS };

        if (detailPayload.ok) {
          setClientDetailData(detailPayload.data);
        } else {
          nextErrors.detail = detailPayload.error.message ?? "Unable to load client detail.";
          setClientDetailData(null);
        }

        if (assignmentsPayload.ok) {
          setAssignmentsData(assignmentsPayload.data);
        } else {
          nextErrors.assignments = assignmentsPayload.error.message ?? "Unable to load client assignments.";
          setAssignmentsData(null);
        }

        if (metricsPayload.ok) {
          setMetricsData(metricsPayload.data);
        } else {
          nextErrors.metrics = metricsPayload.error.message ?? "Unable to load client metrics.";
          setMetricsData(null);
        }

        if (workoutLogsPayload.ok) {
          setWorkoutLogsData(workoutLogsPayload.data);
        } else {
          nextErrors.workoutLogs = workoutLogsPayload.error.message ?? "Unable to load client workout logs.";
          setWorkoutLogsData(null);
        }

        setSectionErrors(nextErrors);
      } catch {
        if (!active) {
          return;
        }

        setClientDetailData(null);
        setAssignmentsData(null);
        setMetricsData(null);
        setWorkoutLogsData(null);
        setSectionErrors({
          detail: "Unable to load client detail.",
          assignments: "Unable to load client assignments.",
          metrics: "Unable to load client metrics.",
          workoutLogs: "Unable to load client workout logs.",
        });
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
  }, [clientId, status, user]);

  const view = useMemo(
    () => adaptPTClientDetailView({
      clientId,
      detail: clientDetailData,
      assignments: assignmentsData,
      metrics: metricsData,
      workoutLogs: workoutLogsData,
    }),
    [assignmentsData, clientDetailData, clientId, metricsData, workoutLogsData],
  );

  if (status === "loading") {
    return <LoadingBlock title="Loading client workspace" message="Validating your BFF-managed PT session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT access requires an authenticated PT session." />;
  }

  const logHistoryAction = view.actions.find((item) => item.label === "Log history");
  const showLoadingState = loading && !clientDetailData && !sectionErrors.detail;
  const heroMetricCards = view.metricCards.slice(0, 3);

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="Client Workspace"
      subtitle={`${view.summary.clientDisplayLabel} | ${view.summary.clientEmail}`}
      notificationSlot={<ActionPill href="/pt/clients" tone="purple">Back to clients</ActionPill>}
      topHubAction={<ActionPill href={`/pt/clients/${clientId}/assign`}>Assign training</ActionPill>}
      activePath="/pt/clients"
    >
      {showLoadingState ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading PT client workspace"
          description="Fetching client detail, assignments, metrics, and workout logs through the existing protected PT BFF routes."
        >
          <DetailStateCard
            title="Refreshing client detail"
            message="This mobile PT surface is waiting on the current signed frontend-to-BFF responses."
          />
        </MobileSection>
      ) : null}

      {!showLoadingState && sectionErrors.detail ? (
        <MobileSection
          eyebrow="Client detail"
          title="Client workspace unavailable"
          description="The PT client-detail route did not return a usable payload, and this page does not fall back to direct backend requests."
        >
          <DetailStateCard
            title="Unable to load client detail"
            message={sectionErrors.detail}
            action={<ActionPill href="/pt/clients">Back to client portal</ActionPill>}
          />
        </MobileSection>
      ) : null}

      {!showLoadingState && !sectionErrors.detail ? (
        <>
          <MobileSection
            eyebrow="PT client detail"
            title="Client profile"
            description="Identity, assignment, activity, and nutrition fields are sourced only from the existing PT detail and metrics routes."
            action={<ActionPill href={`/pt/clients/${clientId}/metrics`} tone="purple">Metrics</ActionPill>}
          >
            <MobileCard as="article" variant="action" className="mobile-pt-detail-hero">
              <div className="mobile-pt-hero-masthead">
                <div className="mobile-pt-client-card__header">
                  <div className="mobile-section__copy">
                    <p className="mobile-section__eyebrow">Client workspace</p>
                    <h2 className="mobile-section__title">{view.summary.clientDisplayLabel}</h2>
                    <p className="mobile-section__description">{view.summary.clientEmail}</p>
                  </div>
                  <span className="mobile-pill mobile-pill--purple">{view.summary.clientStatusLabel}</span>
                </div>
                <p className="mobile-section__description">{view.summary.summaryText}</p>
              </div>

              <dl className="mobile-pt-fact-grid">
                {view.summary.factRows.map((item) => (
                  <div key={`${item.label}-${item.value}`}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </MobileCard>

            {heroMetricCards.length > 0 ? (
              <MetricCardRow cards={heroMetricCards} />
            ) : (
              <DetailStateCard
                title="No metrics snapshot yet"
                message="The current client detail payload does not include a usable metrics snapshot for this client."
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Quick actions"
            title="Route launch cards"
            description="These cards link only to existing PT client routes for assignment, metrics, recommendation, and workout-log history."
          >
            <div className="mobile-pt-detail-action-grid">
              {view.actions.map((action) => (
                <MobileCard key={action.label} as="article" variant="action" className="mobile-pt-detail-action-card">
                  <div className="mobile-section__copy">
                    <p className="mobile-section__eyebrow">Existing PT route</p>
                    <h3 className="mobile-section__title">{action.label}</h3>
                    <p className="mobile-section__description">{action.description}</p>
                  </div>
                  <div className="mobile-pt-actions">
                    <ActionPill href={action.href} tone={action.tone}>
                      {action.label}
                    </ActionPill>
                  </div>
                </MobileCard>
              ))}
            </div>
          </MobileSection>

          <MobileSection
            eyebrow="Assignments"
            title="Assignment deck"
            description="The client detail page preserves the current PT assignments route and falls back to embedded current assignments when needed."
            action={<ActionPill href={`/pt/clients/${clientId}/assign`}>Assign training</ActionPill>}
          >
            {sectionErrors.assignments && !view.hasAssignments ? (
              <DetailStateCard title="Assignments unavailable" message={sectionErrors.assignments} />
            ) : (
              <>
                {sectionErrors.assignments ? (
                  <DetailStateCard
                    title="Assignments route degraded"
                    message={`${sectionErrors.assignments} Showing assignment fields already present on the PT client detail payload.`}
                  />
                ) : null}

                {view.hasAssignments ? (
                  <div className="mobile-pt-detail-stack">
                    {view.assignments.map((assignment) => (
                      <MobileCard
                        key={assignment.id}
                        as="article"
                        variant="soft"
                        className="mobile-pt-detail-assignment-card"
                      >
                        <div className="mobile-pt-client-card__header">
                          <div className="mobile-section__copy">
                            <p className="mobile-section__eyebrow">Assignment</p>
                            <h3 className="mobile-section__title">{assignment.title}</h3>
                            <p className="mobile-section__description">{assignment.description}</p>
                          </div>
                          <span className="mobile-pill mobile-pill--yellow">{assignment.statusLabel}</span>
                        </div>

                        <p className="mobile-section__description">{assignment.dateRangeLabel}</p>

                        {assignment.metadata.length > 0 ? (
                          <dl className="mobile-pt-detail-meta-list">
                            {assignment.metadata.map((item) => (
                              <div key={`${assignment.id}-${item.label}`}>
                                <dt>{item.label}</dt>
                                <dd>{item.value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}
                      </MobileCard>
                    ))}
                  </div>
                ) : (
                  <DetailStateCard
                    title="No assignments yet"
                    message="This linked client does not currently have any returned assignments on the existing PT routes."
                  />
                )}
              </>
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Metrics"
            title="Nutrition snapshot"
            description="This section reflects the current PT metrics route only and does not compute new nutrition values in the browser."
            action={<ActionPill href={`/pt/clients/${clientId}/metrics`} tone="purple">Open metrics</ActionPill>}
          >
            {sectionErrors.metrics && !view.hasMetrics ? (
              <DetailStateCard title="Metrics unavailable" message={sectionErrors.metrics} />
            ) : (
              <>
                {sectionErrors.metrics && view.hasMetrics ? (
                  <DetailStateCard
                    title="Metrics route degraded"
                    message={`${sectionErrors.metrics} Showing the client snapshot fields already present on the PT detail payload.`}
                  />
                ) : null}

                {view.hasMetrics ? (
                  <MetricCardRow cards={view.metricCards} />
                ) : (
                  <DetailStateCard
                    title="No metrics snapshot yet"
                    message="The current PT detail and metrics routes did not return usable metrics fields for this client."
                  />
                )}
              </>
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Workout activity"
            title="Workout log preview"
            description="The latest linked-client workout logs stay on the current PT workout-log route, and PT notes save through the existing note endpoint."
            action={logHistoryAction ? <ActionPill href={logHistoryAction.href} tone="purple">Open log history</ActionPill> : undefined}
          >
            {sectionErrors.workoutLogs && !view.hasWorkoutLogs ? (
              <DetailStateCard title="Workout logs unavailable" message={sectionErrors.workoutLogs} />
            ) : view.hasWorkoutLogs ? (
              <div className="mobile-pt-detail-stack">
                {view.workoutLogPreview.map((log) => (
                  <MobileCard key={log.id} as="article" variant="action" className="mobile-pt-detail-log-card">
                    <div className="mobile-pt-client-card__header">
                      <div className="mobile-section__copy">
                        <p className="mobile-section__eyebrow">{log.eyebrow}</p>
                        <h3 className="mobile-section__title">{log.title}</h3>
                        <p className="mobile-section__description">{log.performedAtLabel}</p>
                      </div>
                      <span className="mobile-pill mobile-pill--yellow">{log.statusLabel}</span>
                    </div>

                    <dl className="mobile-pt-detail-meta-list mobile-pt-log-meta">
                      <div>
                        <dt>Routine</dt>
                        <dd>{log.routineLabel}</dd>
                      </div>
                      <div>
                        <dt>Duration</dt>
                        <dd>{log.durationLabel}</dd>
                      </div>
                      <div>
                        <dt>Exercises</dt>
                        <dd>{log.exerciseCountLabel}</dd>
                      </div>
                    </dl>

                    {log.clientNotesText ? (
                      <div className="mobile-pt-note-block">
                        <div className="mobile-section__copy">
                          <p className="mobile-section__eyebrow">Client notes</p>
                          <p className="mobile-pt-note-text">{log.clientNotesText}</p>
                        </div>
                      </div>
                    ) : null}

                    <PTNoteEditor log={log} onSave={handleSavePtNote} />
                  </MobileCard>
                ))}
              </div>
            ) : (
              <DetailStateCard
                title="No workout logs yet"
                message="Saved workout logs will appear here once this linked client records activity through the existing logging flow."
              />
            )}
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
