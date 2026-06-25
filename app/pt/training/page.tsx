"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileHeaderUtilities } from "@/components/mobile/MobileHeaderUtilities";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import {
  createLocalPTExerciseDraft,
  createLocalPTFolderDraft,
  readLocalPTExerciseDrafts,
  readLocalPTFolderDrafts,
  type LocalPTExerciseDraft,
  type LocalPTExerciseDraftKind,
  type LocalPTFolderDraft,
  writeLocalPTExerciseDrafts,
  writeLocalPTFolderDrafts,
} from "@/lib/client/pt-training-drafts";
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

type BuilderCardDefinition = {
  kind: LocalPTExerciseDraftKind;
  badge: string;
  title: string;
  copy: string;
  dialogTitle: string;
  primaryLabel: string;
  secondaryLabel: string;
  detailLabel?: string;
  className: string;
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

const BUILDER_CARD_DEFINITIONS: BuilderCardDefinition[] = [
  {
    kind: "rep",
    badge: "Rep",
    title: "Add A Rep",
    copy: "Draft a single movement entry.",
    dialogTitle: "Add A Rep Draft",
    primaryLabel: "Exercise name",
    secondaryLabel: "Weight note or target note",
    className: "pt-training-builder-card--rep",
  },
  {
    kind: "set",
    badge: "Set",
    title: "Add A Set",
    copy: "Draft a repeated movement block.",
    dialogTitle: "Add A Set Draft",
    primaryLabel: "Exercise name",
    secondaryLabel: "Reps target",
    detailLabel: "Weight note or target note",
    className: "pt-training-builder-card--set",
  },
  {
    kind: "routine",
    badge: "Workout Routine",
    title: "Add a Workout Routine",
    copy: "Draft a routine made of multiple movements.",
    dialogTitle: "Add a Workout Routine Draft",
    primaryLabel: "Routine name",
    secondaryLabel: "Routine notes",
    className: "pt-training-builder-card--routine",
  },
  {
    kind: "cues",
    badge: "Cues",
    title: "Goals and Cues",
    copy: "Draft coaching cues for a client routine.",
    dialogTitle: "Goals and Cues Draft",
    primaryLabel: "Cue title",
    secondaryLabel: "Coaching note",
    className: "pt-training-builder-card--cues",
  },
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

function CreateFolderPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function formatDraftKindLabel(kind: LocalPTExerciseDraftKind) {
  switch (kind) {
    case "rep":
      return "Rep";
    case "set":
      return "Set";
    case "routine":
      return "Workout Routine";
    case "cues":
      return "Goals and Cues";
    default:
      return "Draft";
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
  const [openPortfolioFolderId, setOpenPortfolioFolderId] = useState<string | null>(null);
  const [folderDrafts, setFolderDrafts] = useState<LocalPTFolderDraft[]>([]);
  const [exerciseDrafts, setExerciseDrafts] = useState<LocalPTExerciseDraft[]>([]);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [folderDraftName, setFolderDraftName] = useState("");
  const [folderDraftNote, setFolderDraftNote] = useState("");
  const [builderDialogKind, setBuilderDialogKind] = useState<LocalPTExerciseDraftKind | null>(null);
  const [builderPrimaryValue, setBuilderPrimaryValue] = useState("");
  const [builderSecondaryValue, setBuilderSecondaryValue] = useState("");
  const [builderDetailValue, setBuilderDetailValue] = useState("");
  const deferredSearch = useDeferredValue(searchValue);

  useEffect(() => {
    setFolderDrafts(readLocalPTFolderDrafts());
    setExerciseDrafts(readLocalPTExerciseDrafts());
  }, []);

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

  const activeBuilderDefinition = BUILDER_CARD_DEFINITIONS.find(
    (item) => item.kind === builderDialogKind,
  ) ?? null;

  useEffect(() => {
    if (!createFolderDialogOpen && !activeBuilderDefinition) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setCreateFolderDialogOpen(false);
      setBuilderDialogKind(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeBuilderDefinition, createFolderDialogOpen]);

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

  function closeCreateFolderDialog() {
    setCreateFolderDialogOpen(false);
    setFolderDraftName("");
    setFolderDraftNote("");
  }

  function handleSaveFolderDraft() {
    const nextDraft = createLocalPTFolderDraft({
      name: folderDraftName,
      note: folderDraftNote,
    });
    const nextDrafts = [nextDraft, ...folderDrafts];
    setFolderDrafts(nextDrafts);
    writeLocalPTFolderDrafts(nextDrafts);
    closeCreateFolderDialog();
  }

  function removeFolderDraft(draftId: string) {
    const nextDrafts = folderDrafts.filter((draft) => draft.id !== draftId);
    setFolderDrafts(nextDrafts);
    writeLocalPTFolderDrafts(nextDrafts);
  }

  function openBuilderDialog(kind: LocalPTExerciseDraftKind) {
    setBuilderDialogKind(kind);
    setBuilderPrimaryValue("");
    setBuilderSecondaryValue("");
    setBuilderDetailValue("");
  }

  function closeBuilderDialog() {
    setBuilderDialogKind(null);
    setBuilderPrimaryValue("");
    setBuilderSecondaryValue("");
    setBuilderDetailValue("");
  }

  function handleSaveExerciseDraft() {
    if (!activeBuilderDefinition) {
      return;
    }

    const noteParts = [builderSecondaryValue.trim(), builderDetailValue.trim()].filter(Boolean);
    const nextDraft = createLocalPTExerciseDraft({
      kind: activeBuilderDefinition.kind,
      title: builderPrimaryValue,
      note: noteParts.join(" | "),
    });
    const nextDrafts = [nextDraft, ...exerciseDrafts];
    setExerciseDrafts(nextDrafts);
    writeLocalPTExerciseDrafts(nextDrafts);
    closeBuilderDialog();
  }

  function removeExerciseDraft(draftId: string) {
    const nextDrafts = exerciseDrafts.filter((draft) => draft.id !== draftId);
    setExerciseDrafts(nextDrafts);
    writeLocalPTExerciseDrafts(nextDrafts);
  }

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
            <div className="pt-training-create-folder">
              <button
                id="pt-training-create-folder-trigger"
                type="button"
                className="pt-training-create-folder-card mobile-focus-ring"
                aria-haspopup="dialog"
                aria-controls="pt-training-create-folder-dialog"
                onClick={() => {
                  setCreateFolderDialogOpen(true);
                }}
              >
                <span className="pt-training-create-folder-card__icon" aria-hidden="true">
                  <CreateFolderPlusIcon />
                </span>
                <span className="pt-training-create-folder-card__label">Create New Folder</span>
              </button>

              {folderDrafts.length > 0 ? (
                <div className="pt-training-create-folder-drafts">
                  <p className="pt-training-create-folder-drafts__title">Local folder drafts</p>
                  <div className="pt-training-create-folder-drafts__list">
                    {folderDrafts.map((draft) => (
                      <MobileCard
                        key={draft.id}
                        as="article"
                        variant="soft"
                        className="pt-training-local-draft-card"
                      >
                        <div className="pt-training-local-draft-card__copy">
                          <div className="pt-training-local-draft-card__header">
                            <p className="pt-training-local-draft-card__title">{draft.name}</p>
                            <span className="pt-training-local-draft-tag">Local draft</span>
                          </div>
                          <p className="pt-training-local-draft-card__note">
                            {draft.note.length > 0 ? draft.note : "No local folder note yet."}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="pt-training-local-draft-remove mobile-focus-ring"
                          onClick={() => {
                            removeFolderDraft(draft.id);
                          }}
                          aria-label={`Remove local folder draft ${draft.name}`}
                        >
                          Remove
                        </button>
                      </MobileCard>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

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
                              <p className="mobile-section__description">{folder.description}</p>
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

          <MobileSection
            className="pt-training-builder-section"
            eyebrow="Routine builder"
            title="Build Training Routine"
            description="Create local draft exercise blocks that can later be attached to training portfolio folders when folder and routine save routes are wired."
          >
            <div className="pt-training-builder-frame">
              <div className="pt-training-builder-grid">
                {BUILDER_CARD_DEFINITIONS.map((item) => (
                  <button
                    key={item.kind}
                    type="button"
                    className={[
                      "pt-training-builder-card",
                      item.className,
                      "mobile-focus-ring",
                    ].join(" ")}
                    onClick={() => {
                      openBuilderDialog(item.kind);
                    }}
                    aria-haspopup="dialog"
                    aria-controls="pt-training-builder-dialog"
                    aria-label={item.dialogTitle}
                  >
                    <span className="pt-training-builder-card__badge">{item.badge}</span>
                    <span className="pt-training-builder-card__title">{item.title}</span>
                    <span className="pt-training-builder-card__copy">{item.copy}</span>
                  </button>
                ))}
              </div>

              {exerciseDrafts.length > 0 ? (
                <div className="pt-training-builder-drafts">
                  <p className="pt-training-builder-drafts__title">Local routine drafts</p>
                  <div className="pt-training-builder-drafts__list">
                    {exerciseDrafts.map((draft) => (
                      <MobileCard
                        key={draft.id}
                        as="article"
                        variant="soft"
                        className="pt-training-local-draft-card"
                      >
                        <div className="pt-training-local-draft-card__copy">
                          <div className="pt-training-local-draft-card__header">
                            <p className="pt-training-local-draft-card__title">{draft.title}</p>
                            <span className="pt-training-local-draft-tag">Local draft</span>
                          </div>
                          <p className="pt-training-local-draft-card__meta">
                            {formatDraftKindLabel(draft.kind)}
                          </p>
                          <p className="pt-training-local-draft-card__note">
                            {draft.note.length > 0 ? draft.note : "No local builder note yet."}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="pt-training-local-draft-remove mobile-focus-ring"
                          onClick={() => {
                            removeExerciseDraft(draft.id);
                          }}
                          aria-label={`Remove local routine draft ${draft.title}`}
                        >
                          Remove
                        </button>
                      </MobileCard>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
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

      {createFolderDialogOpen ? (
        <div
          className="pt-training-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateFolderDialog();
            }
          }}
        >
          <section
            id="pt-training-create-folder-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pt-training-create-folder-dialog-title"
            className="pt-training-modal"
          >
            <div className="pt-training-modal__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Local folder planning</p>
                <h2 id="pt-training-create-folder-dialog-title" className="mobile-section__title">
                  Create New Folder
                </h2>
                <p className="mobile-section__description">
                  Folder creation is not connected to the PT folders save route yet. This screen can stage the folder name locally for layout planning only.
                </p>
              </div>
              <button
                type="button"
                className="mobile-pill mobile-pill--purple mobile-focus-ring"
                onClick={closeCreateFolderDialog}
              >
                Close
              </button>
            </div>

            <div className="pt-training-modal__form">
              <div className="field">
                <label htmlFor="pt-training-folder-draft-name">Folder name</label>
                <input
                  id="pt-training-folder-draft-name"
                  value={folderDraftName}
                  onChange={(event) => setFolderDraftName(event.target.value)}
                  placeholder="Strength Builder"
                />
              </div>
              <div className="field">
                <label htmlFor="pt-training-folder-draft-note">Folder note</label>
                <textarea
                  id="pt-training-folder-draft-note"
                  value={folderDraftNote}
                  onChange={(event) => setFolderDraftNote(event.target.value)}
                  placeholder="Local planning notes for future folder wiring"
                  rows={4}
                />
              </div>
              <div className="pt-training-modal__actions">
                <button
                  type="button"
                  className="mobile-pill mobile-pill--purple mobile-focus-ring"
                  onClick={closeCreateFolderDialog}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="pt-training-modal__primary-action mobile-focus-ring"
                  onClick={handleSaveFolderDraft}
                  disabled={folderDraftName.trim().length === 0}
                >
                  Save local draft
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {activeBuilderDefinition ? (
        <div
          className="pt-training-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeBuilderDialog();
            }
          }}
        >
          <section
            id="pt-training-builder-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pt-training-builder-dialog-title"
            className="pt-training-modal"
          >
            <div className="pt-training-modal__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Local builder staging</p>
                <h2 id="pt-training-builder-dialog-title" className="mobile-section__title">
                  {activeBuilderDefinition.dialogTitle}
                </h2>
                <p className="mobile-section__description">
                  This draft stays local to the browser until PT routine save routes are wired. It does not create a backend routine or attach anything to a live folder.
                </p>
              </div>
              <button
                type="button"
                className="mobile-pill mobile-pill--purple mobile-focus-ring"
                onClick={closeBuilderDialog}
              >
                Close
              </button>
            </div>

            <div className="pt-training-modal__form">
              <div className="field">
                <label htmlFor="pt-training-builder-primary">{activeBuilderDefinition.primaryLabel}</label>
                <input
                  id="pt-training-builder-primary"
                  value={builderPrimaryValue}
                  onChange={(event) => setBuilderPrimaryValue(event.target.value)}
                  placeholder={activeBuilderDefinition.primaryLabel}
                />
              </div>
              <div className="field">
                <label htmlFor="pt-training-builder-secondary">{activeBuilderDefinition.secondaryLabel}</label>
                {activeBuilderDefinition.kind === "set" ? (
                  <input
                    id="pt-training-builder-secondary"
                    value={builderSecondaryValue}
                    onChange={(event) => setBuilderSecondaryValue(event.target.value)}
                    placeholder={activeBuilderDefinition.secondaryLabel}
                  />
                ) : (
                  <textarea
                    id="pt-training-builder-secondary"
                    value={builderSecondaryValue}
                    onChange={(event) => setBuilderSecondaryValue(event.target.value)}
                    placeholder={activeBuilderDefinition.secondaryLabel}
                    rows={3}
                  />
                )}
              </div>
              {activeBuilderDefinition.detailLabel ? (
                <div className="field">
                  <label htmlFor="pt-training-builder-detail">{activeBuilderDefinition.detailLabel}</label>
                  <textarea
                    id="pt-training-builder-detail"
                    value={builderDetailValue}
                    onChange={(event) => setBuilderDetailValue(event.target.value)}
                    placeholder={activeBuilderDefinition.detailLabel}
                    rows={3}
                  />
                </div>
              ) : null}
              <div className="pt-training-modal__actions">
                <button
                  type="button"
                  className="mobile-pill mobile-pill--purple mobile-focus-ring"
                  onClick={closeBuilderDialog}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="pt-training-modal__primary-action mobile-focus-ring"
                  onClick={handleSaveExerciseDraft}
                  disabled={builderPrimaryValue.trim().length === 0}
                >
                  Save local draft
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </MobileAppShell>
  );
}
