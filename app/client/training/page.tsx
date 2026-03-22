"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PackageList } from "@/components/training/PackageList";
import { RoutineDetailView } from "@/components/training/RoutineDetailView";
import { RoutineList } from "@/components/training/RoutineList";
import { PageShell } from "@/components/layout/PageShell";
import { ActionRow } from "@/components/ui/ActionRow";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { StatPill } from "@/components/ui/StatPill";
import {
  adaptAssignmentDetail,
  adaptTrainingAssignments,
  type TrainingAssignmentView,
  type TrainingRoutineView,
} from "@/lib/adapters/training";
import { getArray } from "@/lib/adapters/common";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";

type TrainingHubResponse = ApiResponse<JsonValue>;
type AssignmentDetailResponse = ApiResponse<JsonValue>;
type DetailState = {
  loading: boolean;
  data: JsonValue | null;
  error: string | null;
};

export default function ClientTrainingHubPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [trainingData, setTrainingData] = useState<JsonValue | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<TrainingAssignmentView | null>(null);
  const [selectedRoutine, setSelectedRoutine] = useState<TrainingRoutineView | null>(null);
  const [detailByPackageId, setDetailByPackageId] = useState<Record<string, DetailState>>({});

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
          setErrorMessage(payload.error.message);
          setTrainingData(null);
          return;
        }

        setTrainingData(payload.data);
      } catch {
        if (active) {
          setErrorMessage("Unable to load the training workspace.");
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

  const packages = useMemo(() => adaptTrainingAssignments(trainingData), [trainingData]);
  const packageCount = packages.length;
  const rawTrainingCount = getArray(trainingData).length;
  const displayReadyPackages = packages.filter((item) => item.id || item.title || item.packageId).length;
  const packagesWithRoutineCount = packages.filter((item) => item.routineCount).length;

  useEffect(() => {
    setSelectedRoutine(null);
  }, [selectedPackage?.id]);

  useEffect(() => {
    if (!selectedPackage?.id || detailByPackageId[selectedPackage.id]) {
      return;
    }

    let active = true;
    const packageId = selectedPackage.id;

    setDetailByPackageId((current) => ({
      ...current,
      [packageId]: { loading: true, data: null, error: null },
    }));

    async function loadPackageDetail() {
      try {
        const response = await fetch(`/api/client/training/assignments/${packageId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as AssignmentDetailResponse;

        if (!active) {
          return;
        }

        if (!payload.ok) {
          setDetailByPackageId((current) => ({
            ...current,
            [packageId]: {
              loading: false,
              data: null,
              error: payload.error.message,
            },
          }));
          return;
        }

        setDetailByPackageId((current) => ({
          ...current,
          [packageId]: {
            loading: false,
            data: payload.data,
            error: null,
          },
        }));
      } catch {
        if (!active) {
          return;
        }

        setDetailByPackageId((current) => ({
          ...current,
          [packageId]: {
            loading: false,
            data: null,
            error: "Unable to load package detail.",
          },
        }));
      }
    }

    void loadPackageDetail();

    return () => {
      active = false;
    };
  }, [detailByPackageId, selectedPackage]);

  if (status === "loading") {
    return <LoadingBlock title="Loading training workspace" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Client training routes require an authenticated client session." />;
  }

  const selectedPackageDetail =
    selectedPackage?.id ? detailByPackageId[selectedPackage.id] ?? null : null;
  const selectedPackageView = selectedPackageDetail?.data
    ? adaptAssignmentDetail(selectedPackageDetail.data)
    : null;

  return (
    <PageShell title="Training" user={user} className="app-shell--client-training-workspace">
      {loading ? <LoadingBlock title="Loading training packages" message="Fetching your current training assignments." /> : null}
      {errorMessage ? <ErrorBlock title="Unable to load training" message={errorMessage} /> : null}

      {!loading && !errorMessage ? (
        <>
          <Card className="client-training-workspace-hero" variant="accent" as="section">
            <PageHeader
              eyebrow="Client training"
              title={selectedPackage ? selectedPackage.title : "Training Packages"}
              description={
                selectedPackage
                  ? "This package view stays in place and swaps into routine structure without routing away."
                  : "Packages come first here. Open one to move directly into its routine list."
              }
              chips={[
                `${packageCount} package${packageCount === 1 ? "" : "s"}`,
                `${packagesWithRoutineCount} with routine counts`,
              ]}
              actions={
                selectedRoutine ? (
                  <ActionRow>
                    <button type="button" onClick={() => setSelectedRoutine(null)}>
                      Back to Routines
                    </button>
                    <button type="button" onClick={() => setSelectedPackage(null)}>
                      Back to Packages
                    </button>
                  </ActionRow>
                ) : selectedPackage ? (
                  <ActionRow>
                    <button type="button" onClick={() => setSelectedPackage(null)}>
                      Back to Packages
                    </button>
                    <Link className="link-button" href="/client">
                      Client home
                    </Link>
                  </ActionRow>
                ) : (
                  <ActionRow>
                    <Link className="link-button" href="/client">
                      Client home
                    </Link>
                  </ActionRow>
                )
              }
            />
            {!selectedPackage ? (
              <div className="client-training-workspace-hero__stats">
                <StatPill
                  label="Packages"
                  value={`${packageCount}`}
                  hint="Display-ready package cards derived from the client training BFF route."
                  active
                />
                <StatPill
                  label="Routines exposed"
                  value={`${packagesWithRoutineCount}`}
                  hint="Packages that already expose routine counts in current route data."
                />
                <StatPill
                  label="Source items"
                  value={`${rawTrainingCount}`}
                  hint="Raw records returned by the protected client training route."
                />
                <StatPill
                  label="Display-ready"
                  value={`${displayReadyPackages}`}
                  hint="Records that adapt cleanly into package cards."
                />
              </div>
            ) : null}
          </Card>

          {!selectedPackage ? (
            <SectionBlock
              eyebrow="Level 1"
              title="Training Packages"
              description="Select a package to switch this workspace into its routine list."
            >
              {packageCount === 0 ? (
                rawTrainingCount === 0 ? (
                  <EmptyState
                    title="No training assigned yet"
                    message="Once your PT assigns training, packages will appear here."
                  />
                ) : (
                  <EmptyState
                    title="Training data is not display-ready"
                    message="Training data was returned, but it does not expose a package-ready structure for this view."
                  />
                )
              ) : (
                <PackageList
                  packages={packages}
                  selectedPackageId={selectedPackage?.id ?? null}
                  onOpenPackage={(trainingPackage) => {
                    setSelectedRoutine(null);
                    setSelectedPackage(trainingPackage);
                  }}
                />
              )}
            </SectionBlock>
          ) : selectedRoutine ? (
            <SectionBlock
              eyebrow="Level 3"
              title="Routine Detail"
              description="Exercises are shown only when the selected routine exposes them in the current package detail payload."
            >
              <RoutineDetailView
                routine={selectedRoutine}
                addLogHref={
                  selectedPackage.id
                    ? `/client/add-log?assignmentId=${encodeURIComponent(selectedPackage.id)}&routineId=${encodeURIComponent(selectedRoutine.id ?? "")}&routineName=${encodeURIComponent(selectedRoutine.title)}&routineLabel=${encodeURIComponent(selectedRoutine.label ?? "")}`
                    : "/client/add-log"
                }
              />
            </SectionBlock>
          ) : (
            <SectionBlock
              eyebrow="Level 2"
              title="Routines"
              description="Each item below comes from the selected package detail only when the current data exposes routine-ready fields."
            >
              <Card className="client-training-package-summary" variant="soft">
                <PageHeader
                  eyebrow={selectedPackage.coachName ? `With ${selectedPackage.coachName}` : "Selected package"}
                  title={selectedPackage.title}
                  description={selectedPackage.description}
                  chips={[
                    selectedPackage.routineCount ?? "Routine count unavailable",
                    selectedPackage.progressLabel ?? "No progress label returned",
                  ]}
                />
              </Card>

              {!selectedPackage.id ? (
                <EmptyState
                  title="Package detail is unavailable"
                  message="This package does not expose an assignment identifier, so the workspace cannot safely load its routine list."
                />
              ) : !selectedPackageDetail ? (
                <LoadingBlock
                  title="Loading routines"
                  message={`Fetching the routine structure for ${selectedPackage.title}.`}
                />
              ) : selectedPackageDetail?.loading ? (
                <LoadingBlock
                  title="Loading routines"
                  message={`Fetching the routine structure for ${selectedPackage.title}.`}
                />
              ) : selectedPackageDetail?.error ? (
                <ErrorBlock title="Unable to load routines" message={selectedPackageDetail.error} />
              ) : selectedPackageView ? (
                selectedPackageView.routines.length > 0 ? (
                  <RoutineList
                    routines={selectedPackageView.routines}
                    onOpenRoutine={setSelectedRoutine}
                  />
                ) : selectedPackageView.summary.title ? (
                  <EmptyState
                    title="Routine data is not display-ready"
                    message="This package detail loaded, but it did not expose routine-ready entries for the workspace."
                  />
                ) : (
                  <EmptyState
                    title="Routines are not ready"
                    message="The package is selected, but its detail payload has not produced a routine-ready view."
                  />
                )
              ) : (
                <EmptyState
                  title="Routines are not ready"
                  message="The package is selected, but its detail payload has not produced a routine-ready view."
                />
              )}
            </SectionBlock>
          )}
        </>
      ) : null}
    </PageShell>
  );
}
