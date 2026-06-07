"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import { adaptPTTrainingView } from "@/lib/view-models/pt-training";
import { formatCountLabel, formatDisplayNameFromUser } from "@/lib/view-models/common";

type PTTrainingApiResponse = ApiResponse<JsonValue>;

type SectionErrors = {
  folders: string | null;
  packages: string | null;
  routines: string | null;
};

const EMPTY_SECTION_ERRORS: SectionErrors = {
  folders: null,
  packages: null,
  routines: null,
};

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
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
      <div className="mobile-section__copy">
        <h3 className="mobile-section__title">{title}</h3>
        <p className="mobile-section__description">{message}</p>
      </div>
      {action ? <div className="mobile-pt-actions">{action}</div> : null}
    </MobileCard>
  );
}

function matchesTrainingQuery(query: string, fields: Array<string | null | undefined>): boolean {
  if (!query) {
    return true;
  }

  return fields.some((field) => field?.toLowerCase().includes(query));
}

function getTrainingIcon(label: string) {
  switch (label.toLowerCase()) {
    case "folders":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.5 7.5h5l1.8 2H19a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 19 18.5H5A1.5 1.5 0 0 1 3.5 17V9A1.5 1.5 0 0 1 5 7.5Z" />
        </svg>
      );
    case "portfolios":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 6.5h10a2 2 0 0 1 2 2V18l-4-2-4 2-4-2-4 2V8.5a2 2 0 0 1 2-2h2Z" />
          <path d="M9 10h6m-6 3h5" />
        </svg>
      );
    case "routines":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 7.5h12M12 7.5v9m-3-3h6" />
        </svg>
      );
    case "drafts":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 18h12M8 15.5 16 7.5m-6 8 8-8" />
        </svg>
      );
    case "active portfolios":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 12.5 10 16l8-9" />
        </svg>
      );
    case "archived routines":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 8h12M8 11v6m4-6v6m4-6v6" />
          <path d="M5 8.5h14L18 19H6L5 8.5Z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function PTTrainingPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "pt",
    unauthenticatedRedirectTo: "/login",
  });

  const [foldersData, setFoldersData] = useState<JsonValue | null>(null);
  const [packagesData, setPackagesData] = useState<JsonValue | null>(null);
  const [routinesData, setRoutinesData] = useState<JsonValue | null>(null);
  const [sectionErrors, setSectionErrors] = useState<SectionErrors>(EMPTY_SECTION_ERRORS);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(searchValue);

  useEffect(() => {
    if (status !== "authenticated" || !user || user.role !== "pt") {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setSectionErrors(EMPTY_SECTION_ERRORS);

      try {
        const [foldersResponse, packagesResponse, routinesResponse] = await Promise.all([
          fetch("/api/pt/folders", { cache: "no-store" }),
          fetch("/api/pt/packages", { cache: "no-store" }),
          fetch("/api/pt/routines", { cache: "no-store" }),
        ]);

        const [foldersPayload, packagesPayload, routinesPayload] = (await Promise.all([
          foldersResponse.json(),
          packagesResponse.json(),
          routinesResponse.json(),
        ])) as [PTTrainingApiResponse, PTTrainingApiResponse, PTTrainingApiResponse];

        if (!active) {
          return;
        }

        const nextErrors: SectionErrors = { ...EMPTY_SECTION_ERRORS };

        if (foldersPayload.ok) {
          setFoldersData(foldersPayload.data);
        } else {
          nextErrors.folders = foldersPayload.error.message ?? "Unable to load PT folders.";
          setFoldersData(null);
        }

        if (packagesPayload.ok) {
          setPackagesData(packagesPayload.data);
        } else {
          nextErrors.packages = packagesPayload.error.message ?? "Unable to load PT packages.";
          setPackagesData(null);
        }

        if (routinesPayload.ok) {
          setRoutinesData(routinesPayload.data);
        } else {
          nextErrors.routines = routinesPayload.error.message ?? "Unable to load PT routines.";
          setRoutinesData(null);
        }

        setSectionErrors(nextErrors);
      } catch {
        if (!active) {
          return;
        }

        setFoldersData(null);
        setPackagesData(null);
        setRoutinesData(null);
        setSectionErrors({
          folders: "Unable to load PT folders.",
          packages: "Unable to load PT packages.",
          routines: "Unable to load PT routines.",
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
  }, [status, user]);

  const view = useMemo(
    () => adaptPTTrainingView({
      folders: foldersData,
      packages: packagesData,
      routines: routinesData,
      selectedFolderId,
    }),
    [foldersData, packagesData, routinesData, selectedFolderId],
  );

  useEffect(() => {
    if (!selectedFolderId) {
      return;
    }

    if (!view.folderTiles.some((item) => item.id === selectedFolderId)) {
      setSelectedFolderId(null);
    }
  }, [selectedFolderId, view.folderTiles]);

  if (status === "loading") {
    return <LoadingBlock title="Loading PT training" message="Validating your BFF-managed PT session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT training requires an authenticated PT session." />;
  }

  const query = deferredSearch.trim().toLowerCase();
  const hasSearchValue = query.length > 0;
  const partialErrorMessages = Object.values(sectionErrors).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  const showLoadingState = loading && !view.hasAnyData && partialErrorMessages.length === 0;
  const allSectionsFailed = !loading && !view.hasAnyData && partialErrorMessages.length === 3;
  const filteredFolderTiles = hasSearchValue
    ? view.folderTiles.filter((item) =>
        matchesTrainingQuery(query, [
          item.title,
          item.description,
          item.countLabel,
          item.packageCountLabel,
          item.routineCountLabel,
          item.sortOrderLabel,
        ]))
    : view.folderTiles;
  const filteredPackageCards = view.packageCards.filter((item) =>
    (selectedFolderId === null || item.folderId === selectedFolderId) &&
    matchesTrainingQuery(query, [
      item.title,
      item.description,
      item.statusLabel,
      item.durationLabel,
      item.folderLabel,
      item.templateLabel,
    ]),
  );
  const filteredRoutineCards = view.routineCards.filter((item) =>
    (selectedFolderId === null || item.folderId === selectedFolderId) &&
    matchesTrainingQuery(query, [
      item.title,
      item.description,
      item.difficultyLabel,
      item.estimatedMinutesLabel,
      item.folderLabel,
      item.archiveLabel,
    ]),
  );

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="PT Training"
      subtitle="Folders, portfolios, and routines stay inside the existing PT BFF layer and use local-only filtering on the frontend."
      searchLabel="Search PT training"
      searchPlaceholder="Search folders, portfolios, or routines"
      searchValue={searchValue}
      onSearchChange={(nextValue) => {
        startTransition(() => {
          setSearchValue(nextValue);
        });
      }}
      notificationSlot={<ActionPill href="/pt" tone="purple">PT home</ActionPill>}
      topHubAction={<ActionPill href="/pt/clients">Open clients</ActionPill>}
      activePath="/pt/training"
    >
      {allSectionsFailed ? (
        <MobileSection
          eyebrow="Training sync"
          title="PT training unavailable"
          description="This screen stays on protected frontend-to-BFF PT routes and does not fall back to direct backend calls."
        >
          <TrainingStateCard
            title="Unable to load PT training"
            message={partialErrorMessages.join(" ")}
            action={<ActionPill href="/pt">Back home</ActionPill>}
          />
        </MobileSection>
      ) : null}

      {showLoadingState ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading the PT training hub"
          description="Fetching folders, portfolios, and routines through the current signed PT BFF routes."
        >
          <TrainingStateCard
            title="Refreshing PT training data"
            message="Your PT training hub is loading through the protected frontend-to-BFF path."
          />
        </MobileSection>
      ) : null}

      {!showLoadingState && !allSectionsFailed ? (
        <>
          {partialErrorMessages.length > 0 && view.hasAnyData ? (
            <MobileSection
              eyebrow="Partial data"
              title="Some PT training sources are unavailable"
              description="This hub still renders the PT routes that succeeded instead of inventing missing data."
            >
              <TrainingStateCard
                title="Partial PT training data"
                message={partialErrorMessages.join(" ")}
              />
            </MobileSection>
          ) : null}

          <MobileSection
            eyebrow="PT training hub"
            title="Training overview"
            description="Summary cards reflect only the data returned by the current PT folders, packages, and routines routes."
          >
            {view.summaryCards.map((item) => (
              <MobileStatCard
                key={item.label}
                label={item.label}
                value={item.value}
                progressText={item.progressText}
                icon={getTrainingIcon(item.label)}
              />
            ))}
          </MobileSection>

          <MobileSection
            eyebrow="Folders"
            title="Folder tiles"
            description="Folder tiles filter the PT training hub locally and do not trigger new backend requests."
          >
            {sectionErrors.folders && !view.hasFolders ? (
              <TrainingStateCard
                title="Folders unavailable"
                message={sectionErrors.folders}
              />
            ) : view.hasFolders ? (
              <div className="mobile-pt-chip-grid" role="list" aria-label="PT training folders">
                <button
                  type="button"
                  className={[
                    "mobile-pt-chip-card",
                    selectedFolderId === null ? "mobile-pt-chip-card--active" : "",
                    "mobile-focus-ring",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label="Filter to all training folders"
                  aria-pressed={selectedFolderId === null}
                  onClick={() => setSelectedFolderId(null)}
                >
                  <p className="mobile-pt-chip-card__title">All training</p>
                  <p className="mobile-pt-chip-card__meta">
                    {formatCountLabel(view.packageCards.length, "portfolio")} | {formatCountLabel(view.routineCards.length, "routine")}
                  </p>
                </button>

                {filteredFolderTiles.length > 0 ? (
                  filteredFolderTiles.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={[
                        "mobile-pt-chip-card",
                        item.active ? "mobile-pt-chip-card--active" : "",
                        "mobile-focus-ring",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-label={`Filter to ${item.title} folder`}
                      aria-pressed={item.active}
                      onClick={() => setSelectedFolderId(item.id)}
                    >
                      <p className="mobile-pt-chip-card__title">{item.title}</p>
                      <p className="mobile-pt-chip-card__meta">{item.description}</p>
                      <p className="mobile-pt-chip-card__meta">{item.countLabel}</p>
                      <p className="mobile-pt-chip-card__meta">{item.sortOrderLabel}</p>
                    </button>
                  ))
                ) : hasSearchValue ? (
                  <TrainingStateCard
                    title="No folders match this search"
                    message={`No PT folders matched "${searchValue.trim()}". Adjust the local filter to see returned training folders again.`}
                  />
                ) : null}
              </div>
            ) : (
              <TrainingStateCard
                title="No folders yet"
                message="PT folders will appear here when the current folders route returns training folder records."
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Portfolios"
            title="Training portfolios"
            description="Portfolio cards come only from the current PT packages route. No editor or detail route is invented when one does not exist."
          >
            {sectionErrors.packages && !view.hasPackages ? (
              <TrainingStateCard
                title="Portfolios unavailable"
                message={sectionErrors.packages}
              />
            ) : filteredPackageCards.length > 0 ? (
              <div className="mobile-pt-training-stack">
                {filteredPackageCards.map((item) => (
                  <MobileCard key={item.id} as="article" variant="action" className="mobile-pt-training-card">
                    <div
                      className="mobile-training-card-media"
                      style={{ "--mobile-routine-gradient": item.gradient } as CSSProperties}
                    >
                      <div className="mobile-training-pill-row">
                        <span className="mobile-pill mobile-pill--purple">{item.statusLabel}</span>
                        <span className="mobile-pill mobile-pill--yellow">{item.templateLabel}</span>
                        <span className="mobile-pill">{item.durationLabel}</span>
                      </div>
                    </div>

                    <div className="mobile-section__copy">
                      <p className="mobile-section__eyebrow">Training portfolio</p>
                      <h3 className="mobile-section__title">{item.title}</h3>
                      <p className="mobile-section__description">{item.description}</p>
                    </div>

                    <dl className="mobile-pt-training-meta-grid">
                      <div>
                        <dt>Folder</dt>
                        <dd>{item.folderLabel}</dd>
                      </div>
                      <div>
                        <dt>Editor</dt>
                        <dd>Not wired</dd>
                      </div>
                    </dl>

                    <p className="mobile-section__description">{item.managementNote}</p>
                  </MobileCard>
                ))}
              </div>
            ) : hasSearchValue && view.hasPackages ? (
              <TrainingStateCard
                title="No portfolios match this search"
                message={`No PT training portfolios matched "${searchValue.trim()}".`}
              />
            ) : (
              <TrainingStateCard
                title="No portfolios yet"
                message="PT training portfolios will appear here when the current packages route returns training package records."
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Routines"
            title="Your Training Routines"
            description="Routine cards come only from the current PT routines route and remain read-only until a stable editor route exists."
          >
            {sectionErrors.routines && !view.hasRoutines ? (
              <TrainingStateCard
                title="Routines unavailable"
                message={sectionErrors.routines}
              />
            ) : filteredRoutineCards.length > 0 ? (
              <div className="mobile-pt-training-stack">
                {filteredRoutineCards.map((item) => (
                  <MobileCard key={item.id} as="article" variant="image" className="mobile-pt-training-card">
                    <div
                      className="mobile-training-card-media"
                      style={{ "--mobile-routine-gradient": item.gradient } as CSSProperties}
                    >
                      <div className="mobile-training-pill-row">
                        <span className="mobile-pill mobile-pill--purple">{item.difficultyLabel}</span>
                        <span className="mobile-pill mobile-pill--yellow">{item.estimatedMinutesLabel}</span>
                        <span className="mobile-pill">{item.archiveLabel}</span>
                      </div>
                    </div>

                    <div className="mobile-section__copy">
                      <p className="mobile-section__eyebrow">Routine</p>
                      <h3 className="mobile-section__title">{item.title}</h3>
                      <p className="mobile-section__description">{item.description}</p>
                    </div>

                    <dl className="mobile-pt-training-meta-grid">
                      <div>
                        <dt>Folder</dt>
                        <dd>{item.folderLabel}</dd>
                      </div>
                      <div>
                        <dt>Editor</dt>
                        <dd>Not wired</dd>
                      </div>
                    </dl>

                    <p className="mobile-section__description">{item.managementNote}</p>
                  </MobileCard>
                ))}
              </div>
            ) : hasSearchValue && view.hasRoutines ? (
              <TrainingStateCard
                title="No routines match this search"
                message={`No PT routines matched "${searchValue.trim()}".`}
              />
            ) : (
              <TrainingStateCard
                title="No routines yet"
                message="PT routines will appear here when the current routines route returns routine records."
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Management"
            title="Management actions"
            description="This phase keeps PT training management read-only unless a stable editor route already exists."
          >
            <MobileCard as="article" variant="soft" className="mobile-pt-training-management-card">
              <div className="mobile-section__copy">
                <h3 className="mobile-section__title">Editor routes are not wired yet</h3>
                <p className="mobile-section__description">
                  Dedicated PT folder and portfolio editor screens do not currently exist in the frontend route map, so this hub stops at safe read-only summary cards.
                </p>
              </div>
              <div className="mobile-pt-training-disabled-actions" aria-describedby="pt-training-management-note">
                <button
                  type="button"
                  className="mobile-pt-button mobile-focus-ring"
                  aria-label="Edit folders unavailable"
                  disabled
                >
                  Edit folders unavailable
                </button>
                <button
                  type="button"
                  className="mobile-pt-button mobile-focus-ring"
                  aria-label="Add new portfolio unavailable"
                  disabled
                >
                  Add new portfolio unavailable
                </button>
              </div>
              <p id="pt-training-management-note" className="mobile-section__description">
                Management actions will be available after stable PT training editor routes are wired into the frontend.
              </p>
            </MobileCard>
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
