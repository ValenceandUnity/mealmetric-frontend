"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileHeaderUtilities } from "@/components/mobile/MobileHeaderUtilities";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileRoutineCard } from "@/components/mobile/MobileRoutineCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import { adaptClientTrainingView } from "@/lib/view-models/client-training";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";

type TrainingHubResponse = ApiResponse<JsonValue>;

type ActionPillProps = {
  href: string;
  children: string;
  tone?: "purple" | "yellow";
};

type TrainingStateCardProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function TrainingStateCard({ title, message, action }: TrainingStateCardProps) {
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

function matchesQuery(query: string, fields: Array<string | null | undefined>): boolean {
  if (!query) {
    return true;
  }

  return fields.some((field) => field?.toLowerCase().includes(query));
}

function buildAssignmentSubtitle(args: {
  subtitle: string;
  progressLabel: string | null;
  scheduleLabel: string;
}): string {
  const detailLabels = [
    args.progressLabel,
    args.scheduleLabel !== "Dates not provided" ? args.scheduleLabel : null,
  ].filter(Boolean);

  if (detailLabels.length === 0) {
    return args.subtitle;
  }

  if (args.subtitle.startsWith("Structured training assignment")) {
    return detailLabels.join(" · ");
  }

  return `${args.subtitle} · ${detailLabels.join(" · ")}`;
}

export default function ClientTrainingHubPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [trainingData, setTrainingData] = useState<JsonValue | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const deferredSearch = useDeferredValue(searchValue);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "client") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/client/training", { cache: "no-store" });
        const payload = (await response.json()) as TrainingHubResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setErrorMessage(payload.error.message ?? "Unable to load training.");
          setTrainingData(null);
          return;
        }

        setTrainingData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load training.");
          setTrainingData(null);
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
    return <LoadingBlock title="Loading training workspace" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Client training requires an authenticated client session." />;
  }

  const view = adaptClientTrainingView({
    assignments: trainingData,
  });
  const query = deferredSearch.trim().toLowerCase();
  const filteredAssignments = view.assignmentCards.filter((assignment) =>
    matchesQuery(query, [
      assignment.title,
      assignment.subtitle,
      assignment.progressLabel,
      assignment.statusLabel,
      assignment.coachLabel,
      assignment.scheduleLabel,
      assignment.checklistLabel,
      assignment.routineCountLabel,
    ]),
  );
  const filteredChecklist = view.weeklyChecklist.filter((preview) =>
    matchesQuery(query, [
      preview.title,
      preview.statusLabel,
      preview.guidance,
      ...preview.items.map((item) => item.label),
      ...preview.items.map((item) => item.note ?? ""),
    ]),
  );
  const showLoadingState = loading && !trainingData && !errorMessage;
  const showFilteredEmptyState = query.length > 0;
  const featuredAssignment = filteredAssignments[0] ?? null;

  return (
    <MobileAppShell
      className="client-training-parity-shell"
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="Training Journal"
      subtitle="Assigned workouts, weekly checklist cues, and rep logging stay inside the existing protected client routes."
      searchLabel="Search training"
      searchPlaceholder="Search packages, routines, or checklist items"
      searchValue={searchValue}
      onSearchChange={(nextValue) => {
        startTransition(() => {
          setSearchValue(nextValue);
        });
      }}
      notificationSlot={(
        <MobileHeaderUtilities
          role="client"
          settingsHref="/client/settings"
          leadingSlot={<ActionPill href="/client/training/history" tone="purple">History</ActionPill>}
        />
      )}
      topHubAction={<ActionPill href="/client/add-log">Log your reps</ActionPill>}
      activePath="/client/training"
      showAvatar={false}
      statusStrip={(
        <>
          <span className="mobile-pill mobile-pill--purple">
            {filteredAssignments.length > 0
              ? `${filteredAssignments.length} routine${filteredAssignments.length === 1 ? "" : "s"}`
              : "Workout journal"}
          </span>
          <span className="mobile-pill">
            {filteredChecklist.length > 0
              ? `${filteredChecklist.length} checklist row${filteredChecklist.length === 1 ? "" : "s"}`
              : "Checklist preview"}
          </span>
        </>
      )}
    >
      {errorMessage ? (
        <MobileSection
          eyebrow="Training sync"
          title="Training unavailable"
          description="This screen stays on the existing client training BFF and does not fall back to direct backend calls."
        >
          <TrainingStateCard
            title="Unable to load training"
            message={errorMessage}
            action={<ActionPill href="/client">Back home</ActionPill>}
          />
        </MobileSection>
      ) : null}

      {showLoadingState ? (
        <MobileSection
          className="client-training-parity-section client-training-parity-section--state"
          eyebrow="Syncing"
          title="Loading your workout journal"
          description="Fetching assigned training through the current protected client training route."
        >
          <TrainingStateCard
            title="Refreshing assignments"
            message="Your client training view is loading through the signed frontend-to-BFF path."
          />
        </MobileSection>
      ) : (
        <>
          <MobileSection
            className="client-training-parity-section client-training-parity-section--journal"
            eyebrow="Workout journal"
            title="Workout Journal"
            description="Image-forward routine cards preserve the existing assignment detail and add-log paths while moving closer to the PDF workout flow."
            action={<ActionPill href="/client/training/history" tone="purple">Open history</ActionPill>}
            contentClassName="client-training-parity-strip"
            scroll
          >
            {featuredAssignment ? (
              <div className="client-training-parity-featured">
                <div className="client-training-parity-featured__copy">
                  <p className="client-training-parity-featured__eyebrow">Featured routine</p>
                  <h3 className="client-training-parity-featured__title">{featuredAssignment.title}</h3>
                  <p className="client-training-parity-featured__subtitle">
                    {buildAssignmentSubtitle({
                      subtitle: featuredAssignment.subtitle,
                      progressLabel: featuredAssignment.progressLabel,
                      scheduleLabel: featuredAssignment.scheduleLabel,
                    })}
                  </p>
                </div>
                <div className="mobile-training-pill-row">
                  {featuredAssignment.statusLabel ? (
                    <span className="mobile-pill mobile-pill--purple">{featuredAssignment.statusLabel}</span>
                  ) : null}
                  <span className="mobile-pill">{featuredAssignment.routineCountLabel}</span>
                </div>
              </div>
            ) : null}
            {filteredAssignments.length > 0 ? (
              filteredAssignments.map((assignment, index) => (
                <MobileRoutineCard
                  className="client-training-parity-card"
                  key={assignment.id ?? `${assignment.title}-${index}`}
                  title={assignment.title}
                  subtitle={buildAssignmentSubtitle({
                    subtitle: assignment.subtitle,
                    progressLabel: assignment.progressLabel,
                    scheduleLabel: assignment.scheduleLabel,
                  })}
                  taskCount={assignment.taskCount}
                  category={assignment.coachLabel ?? assignment.statusLabel ?? "Training package"}
                  gradient={assignment.gradient}
                  media={(
                    <div className="mobile-routine-card__visual mobile-training-card-media client-training-parity-card__visual">
                      <div className="mobile-training-pill-row">
                        {assignment.statusLabel ? (
                          <span className="mobile-pill mobile-pill--purple">{assignment.statusLabel}</span>
                        ) : null}
                        <span className="mobile-pill mobile-pill--yellow">{assignment.checklistLabel}</span>
                        <span className="mobile-pill">{assignment.routineCountLabel}</span>
                      </div>
                      <div className="client-training-parity-card__footer">
                        <span className="client-training-parity-card__caption">Log your reps</span>
                      </div>
                    </div>
                  )}
                  action={<ActionPill href={assignment.href}>{index === 0 ? "Open routine" : "View package"}</ActionPill>}
                />
              ))
            ) : showFilteredEmptyState ? (
              <TrainingStateCard
                title="No assignments match this search"
                message={`No training packages matched "${searchValue.trim()}". Adjust the local filter to see available assignments again.`}
              />
            ) : view.hasAssignments ? (
              <TrainingStateCard
                title="Training data is not display-ready"
                message="The client training route returned records, but they did not adapt into package-ready workout journal cards."
              />
            ) : (
              <TrainingStateCard
                title="No training assigned yet"
                message="Assigned packages will appear here when your protected client training response includes active assignments."
                action={<ActionPill href="/client">Back home</ActionPill>}
              />
            )}
          </MobileSection>

          <MobileSection
            className="client-training-parity-section client-training-parity-section--checklist"
            eyebrow="Checklist"
            title="Workout Checklist For the Week"
            description="Checklist rows come only from the assignment data already returned here. If detail is missing, the route stays explicit instead of inventing exercise state."
            action={<ActionPill href="/client/add-log">Quick log</ActionPill>}
          >
            {filteredChecklist.length > 0 ? (
              filteredChecklist.map((preview) => (
                <MobileCard
                  key={preview.id}
                  as="article"
                  variant={preview.items.length > 0 ? "action" : "soft"}
                  className="mobile-training-checklist-card"
                >
                  <div className="mobile-training-checklist-card__header">
                    <div className="mobile-section__copy">
                      <p className="mobile-section__eyebrow">Weekly checklist</p>
                      <h3 className="mobile-section__title">{preview.title}</h3>
                      <p className="mobile-section__description">{preview.guidance}</p>
                    </div>
                    {preview.statusLabel ? (
                      <span className="mobile-pill mobile-pill--purple">{preview.statusLabel}</span>
                    ) : null}
                  </div>

                  {preview.items.length > 0 ? (
                    <ul className="mobile-training-checklist-list" aria-label={`${preview.title} checklist preview`}>
                      {preview.items.map((item) => (
                        <li key={item.id} className="mobile-training-checklist-list__item">
                          <span className={`mobile-pill ${item.complete ? "mobile-pill--yellow" : "mobile-pill--purple"}`}>
                            {item.complete ? "Done" : "Open"}
                          </span>
                          <div className="mobile-section__copy">
                            <p className="mobile-training-checklist-item__label">{item.label}</p>
                            {item.note ? <p className="mobile-section__description">{item.note}</p> : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mobile-section__description">Open routine to view checklist.</p>
                  )}

                  <div className="mobile-training-action-row">
                    <ActionPill href={preview.href}>{preview.items.length > 0 ? "Open routine" : "View package"}</ActionPill>
                  </div>
                </MobileCard>
              ))
            ) : showFilteredEmptyState ? (
              <TrainingStateCard
                title="No checklist rows match this search"
                message={`No weekly checklist preview matched "${searchValue.trim()}".`}
              />
            ) : view.hasAssignments ? (
              <TrainingStateCard
                title="Checklist preview is not available yet"
                message="The current training list response does not expose explicit checklist rows, so this section points you to the package detail instead."
              />
            ) : (
              <TrainingStateCard
                title="No weekly checklist yet"
                message="Checklist detail will appear here when a client assignment is available."
              />
            )}
          </MobileSection>
        </>
      )}
    </MobileAppShell>
  );
}
