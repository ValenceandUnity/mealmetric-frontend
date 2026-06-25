"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileHeaderUtilities } from "@/components/mobile/MobileHeaderUtilities";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import { adaptPTTrainingView } from "@/lib/view-models/pt-training";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";

type PTTrainingApiResponse = ApiResponse<JsonValue>;

type SectionErrors = {
  folders: string | null;
  packages: string | null;
  routines: string | null;
};

type PortfolioFolderGroup = {
  id: string;
  title: string;
  description: string;
  countLabel: string;
  packageCountLabel: string;
  routineCountLabel: string;
  sortOrderLabel: string;
  packages: Array<{
    id: string;
    title: string;
    description: string;
    statusLabel: string;
    durationLabel: string;
    templateLabel: string;
  }>;
  routines: Array<{
    id: string;
    title: string;
    description: string;
    difficultyLabel: string;
    estimatedMinutesLabel: string;
    archiveLabel: string;
  }>;
  searchFields: string[];
  themeClassName: string;
};

const EMPTY_SECTION_ERRORS: SectionErrors = {
  folders: null,
  packages: null,
  routines: null,
};

const PORTFOLIO_THEME_CLASS_NAMES = [
  "pt-training-portfolio-card--green",
  "pt-training-portfolio-card--red",
  "pt-training-portfolio-card--purple",
  "pt-training-portfolio-card--blue",
  "pt-training-portfolio-card--amber",
] as const;

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

function PortfolioChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m8 10 4 4 4-4" />
    </svg>
  );
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
  const [openPortfolioFolderId, setOpenPortfolioFolderId] = useState<string | null>(null);
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
    () =>
      adaptPTTrainingView({
        folders: foldersData,
        packages: packagesData,
        routines: routinesData,
        selectedFolderId: openPortfolioFolderId,
      }),
    [foldersData, packagesData, routinesData, openPortfolioFolderId],
  );

  const query = deferredSearch.trim().toLowerCase();
  const hasSearchValue = query.length > 0;
  const partialErrorMessages = Object.values(sectionErrors).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  const detailErrorMessages = [sectionErrors.packages, sectionErrors.routines].filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  const showLoadingState = loading && !view.hasAnyData && partialErrorMessages.length === 0;
  const allSectionsFailed = !loading && !view.hasAnyData && partialErrorMessages.length === 3;

  const portfolioFolders = useMemo<PortfolioFolderGroup[]>(
    () =>
      view.folderTiles.map((folder, index) => {
        const packages = view.packageCards
          .filter((item) => item.folderId === folder.id)
          .map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            statusLabel: item.statusLabel,
            durationLabel: item.durationLabel,
            templateLabel: item.templateLabel,
          }));
        const routines = view.routineCards
          .filter((item) => item.folderId === folder.id)
          .map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            difficultyLabel: item.difficultyLabel,
            estimatedMinutesLabel: item.estimatedMinutesLabel,
            archiveLabel: item.archiveLabel,
          }));

        return {
          id: folder.id,
          title: folder.title,
          description: folder.description,
          countLabel: folder.countLabel,
          packageCountLabel: folder.packageCountLabel,
          routineCountLabel: folder.routineCountLabel,
          sortOrderLabel: folder.sortOrderLabel,
          packages,
          routines,
          searchFields: [
            folder.title,
            folder.description,
            folder.countLabel,
            folder.packageCountLabel,
            folder.routineCountLabel,
            folder.sortOrderLabel,
            ...packages.flatMap((item) => [
              item.title,
              item.description,
              item.statusLabel,
              item.durationLabel,
              item.templateLabel,
            ]),
            ...routines.flatMap((item) => [
              item.title,
              item.description,
              item.difficultyLabel,
              item.estimatedMinutesLabel,
              item.archiveLabel,
            ]),
          ],
          themeClassName:
            PORTFOLIO_THEME_CLASS_NAMES[index % PORTFOLIO_THEME_CLASS_NAMES.length] ??
            PORTFOLIO_THEME_CLASS_NAMES[0],
        };
      }),
    [view.folderTiles, view.packageCards, view.routineCards],
  );

  const filteredPortfolioFolders = hasSearchValue
    ? portfolioFolders.filter((folder) => matchesTrainingQuery(query, folder.searchFields))
    : portfolioFolders;

  useEffect(() => {
    if (!openPortfolioFolderId) {
      return;
    }

    if (!filteredPortfolioFolders.some((folder) => folder.id === openPortfolioFolderId)) {
      setOpenPortfolioFolderId(null);
    }
  }, [filteredPortfolioFolders, openPortfolioFolderId]);

  if (status === "loading") {
    return <LoadingBlock title="Loading PT training" message="Validating your BFF-managed PT session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="PT training requires an authenticated PT session." />;
  }

  return (
    <MobileAppShell
      user={user}
      greeting={formatDisplayNameFromUser(user)}
      title="PT Training"
      subtitle="Training portfolios and routines stay inside the existing PT BFF layer and use local-only filtering on the frontend."
      searchLabel="Search PT training"
      searchPlaceholder="Search training portfolios or routines"
      searchValue={searchValue}
      onSearchChange={(nextValue) => {
        startTransition(() => {
          setSearchValue(nextValue);
        });
      }}
      notificationSlot={<MobileHeaderUtilities settingsHref="/pt/settings" />}
      topHubAction={<ActionPill href="/pt/clients">Open clients</ActionPill>}
      activePath="/pt/training"
      showAvatar={false}
    >
      {allSectionsFailed ? (
        <MobileSection
          eyebrow="Training sync"
          title="Training Portfolio unavailable"
          description="This screen stays on protected frontend-to-BFF PT routes and does not fall back to direct backend calls."
        >
          <TrainingStateCard
            title="Training Portfolio unavailable"
            message={sectionErrors.folders ?? "Unable to load PT folders."}
            action={<ActionPill href="/pt">Back home</ActionPill>}
          />
        </MobileSection>
      ) : null}

      {showLoadingState ? (
        <MobileSection
          eyebrow="Syncing"
          title="Loading Training Portfolio"
          description="Fetching folders, portfolios, and routines through the current signed PT BFF routes."
        >
          <TrainingStateCard
            title="Refreshing Training Portfolio"
            message="Your PT training workspace is loading through the protected frontend-to-BFF path."
          />
        </MobileSection>
      ) : null}

      {!showLoadingState && !allSectionsFailed ? (
        <>
          <MobileSection
            eyebrow="PT training"
            title="Training Portfolio"
            description="Organize client training routines into custom folder lanes from the existing PT folders route."
          >
            {sectionErrors.folders && !view.hasFolders ? (
              <TrainingStateCard
                title="Training Portfolio unavailable"
                message={sectionErrors.folders}
              />
            ) : view.hasFolders ? (
              filteredPortfolioFolders.length > 0 ? (
                <div className="pt-training-portfolio" role="list" aria-label="Training portfolio folders">
                  {filteredPortfolioFolders.map((folder) => {
                    const isOpen = openPortfolioFolderId === folder.id;
                    const triggerId = `pt-training-folder-${folder.id}-trigger`;
                    const panelId = `pt-training-folder-${folder.id}-panel`;

                    return (
                      <article
                        key={folder.id}
                        role="listitem"
                        className={[
                          "pt-training-portfolio-card",
                          folder.themeClassName,
                          isOpen ? "pt-training-portfolio-card--open" : "",
                        ].filter(Boolean).join(" ")}
                      >
                        <button
                          id={triggerId}
                          type="button"
                          className="pt-training-portfolio-trigger mobile-focus-ring"
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() => {
                            setOpenPortfolioFolderId((current) => (current === folder.id ? null : folder.id));
                          }}
                        >
                          <span className="pt-training-portfolio-title">{folder.title}</span>
                          <span className="pt-training-portfolio-chevron" aria-hidden="true">
                            <PortfolioChevronIcon />
                          </span>
                        </button>

                        {isOpen ? (
                          <div
                            id={panelId}
                            role="region"
                            aria-labelledby={triggerId}
                            className="pt-training-portfolio-panel"
                          >
                            <div className="mobile-section__copy">
                              <p className="mobile-section__description">
                                {folder.description}
                              </p>
                            </div>

                            <div className="pt-training-portfolio-meta" aria-label={`${folder.title} folder details`}>
                              <span className="mobile-pill mobile-pill--purple">{folder.packageCountLabel}</span>
                              <span className="mobile-pill">{folder.routineCountLabel}</span>
                              <span className="mobile-pill">{folder.sortOrderLabel}</span>
                            </div>

                            {folder.packages.length === 0 && folder.routines.length === 0 ? (
                              <p className="pt-training-portfolio-empty">
                                No training routines are assigned to this folder yet.
                              </p>
                            ) : (
                              <div className="pt-training-portfolio-list">
                                {folder.packages.length > 0 ? (
                                  <section className="pt-training-portfolio-list-block">
                                    <p className="pt-training-portfolio-list-label">Training portfolios</p>
                                    <ul className="pt-training-portfolio-list-items">
                                      {folder.packages.map((item) => (
                                        <li key={item.id} className="pt-training-portfolio-list-item">
                                          <div className="pt-training-portfolio-list-copy">
                                            <p className="pt-training-portfolio-list-title">{item.title}</p>
                                            <p className="pt-training-portfolio-list-description">
                                              {item.description}
                                            </p>
                                          </div>
                                          <div className="pt-training-portfolio-list-pills">
                                            <span className="mobile-pill mobile-pill--yellow">{item.statusLabel}</span>
                                            <span className="mobile-pill">{item.durationLabel}</span>
                                            <span className="mobile-pill">{item.templateLabel}</span>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </section>
                                ) : null}

                                {folder.routines.length > 0 ? (
                                  <section className="pt-training-portfolio-list-block">
                                    <p className="pt-training-portfolio-list-label">Training routines</p>
                                    <ul className="pt-training-portfolio-list-items">
                                      {folder.routines.map((item) => (
                                        <li key={item.id} className="pt-training-portfolio-list-item">
                                          <div className="pt-training-portfolio-list-copy">
                                            <p className="pt-training-portfolio-list-title">{item.title}</p>
                                            <p className="pt-training-portfolio-list-description">
                                              {item.description}
                                            </p>
                                          </div>
                                          <div className="pt-training-portfolio-list-pills">
                                            <span className="mobile-pill mobile-pill--yellow">{item.difficultyLabel}</span>
                                            <span className="mobile-pill">{item.estimatedMinutesLabel}</span>
                                            <span className="mobile-pill">{item.archiveLabel}</span>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </section>
                                ) : null}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <TrainingStateCard
                  title="No training portfolio folders match this search."
                  message={`No loaded PT folders matched "${searchValue.trim()}". Adjust the local filter to see the returned folder lanes again.`}
                />
              )
            ) : (
              <TrainingStateCard
                title="No training folders yet."
                message="Training folders will appear here when the current PT folders route returns custom folder records."
              />
            )}
          </MobileSection>

          {detailErrorMessages.length > 0 && view.hasFolders ? (
            <MobileSection
              eyebrow="Partial data"
              title="Some training details are unavailable"
              description="Folder blocks still render from the PT folders route while linked training details stay limited to the package and routine routes that succeeded."
            >
              <TrainingStateCard
                title="Partial PT training data"
                message={detailErrorMessages.join(" ")}
              />
            </MobileSection>
          ) : null}
        </>
      ) : null}
    </MobileAppShell>
  );
}
