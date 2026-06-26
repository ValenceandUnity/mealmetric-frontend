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
  createLocalPTDraftId,
  createLocalPTExerciseDraft,
  createLocalPTFolderDraft,
  createLocalPTRoutineDraft,
  readLocalPTCustomFitnessAttributes,
  readLocalPTCustomFitnessTargets,
  readLocalPTExerciseDrafts,
  readLocalPTFolderDrafts,
  readLocalPTRoutineDrafts,
  type LocalPTExerciseDraft,
  type LocalPTFolderDraft,
  type LocalPTRoutineDraft,
  writeLocalPTCustomFitnessAttributes,
  writeLocalPTCustomFitnessTargets,
  writeLocalPTExerciseDrafts,
  writeLocalPTFolderDrafts,
  writeLocalPTRoutineDrafts,
} from "@/lib/client/pt-training-drafts";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, JsonValue } from "@/lib/types/api";
import { formatDisplayNameFromUser } from "@/lib/view-models/common";
import { adaptPTTrainingView } from "@/lib/view-models/pt-training";

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

type BuilderOption = {
  kind: "exercise" | "routine";
  badge: string;
  title: string;
  copy: string;
  className: string;
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

type ExerciseFormErrors = {
  description?: string;
  instructions?: string;
  objective?: string;
};

type RoutineDetailsErrors = {
  routineName?: string;
  description?: string;
  fitnessTargets?: string;
  fitnessAttributes?: string;
  setAmount?: string;
};

type RoutineExerciseRow = {
  id: string;
  exerciseName: string;
  repGoal: string;
  instructions: string;
  weightsInvolved: boolean;
};

type RoutineExerciseRowErrors = {
  exerciseName?: string;
  repGoal?: string;
  instructions?: string;
};

type RoutineOptionDialogKind = "target" | "attribute" | null;

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

const BUILDER_OPTIONS: BuilderOption[] = [
  {
    kind: "exercise",
    badge: "Exercise",
    title: "Add an Exercise",
    copy: "Draft one reusable exercise movement.",
    className: "pt-training-builder-card--exercise",
  },
  {
    kind: "routine",
    badge: "Routine",
    title: "Create a Routine",
    copy: "Draft a structured routine with exercise goals.",
    className: "pt-training-builder-card--routine",
  },
];

const DEFAULT_FITNESS_TARGETS = [
  "Biceps",
  "Back",
  "Neck",
  "Triceps",
  "Achilles",
  "Knees",
  "Forearm",
  "Lats",
  "Quads",
  "Hands",
] as const;

const DEFAULT_FITNESS_ATTRIBUTES = [
  "Hand Eye Coordination",
  "Strength",
  "Endurance",
  "Vertical",
  "Speed",
  "Agility",
  "Heart Rate",
  "Elusiveness",
] as const;

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

function ExerciseArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {direction === "left" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

function sanitizeNumericInput(value: string) {
  return value.replace(/\D+/g, "");
}

function normalizeOptionValue(value: string) {
  return value.trim().toLowerCase();
}

function dedupeStringValues(values: string[]) {
  const seen = new Set<string>();
  const next: string[] = [];

  values.forEach((value) => {
    const trimmed = value.trim();
    const normalized = normalizeOptionValue(trimmed);

    if (!trimmed || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    next.push(trimmed);
  });

  return next;
}

function formatSummaryList(values: string[]) {
  if (values.length === 0) {
    return "None selected";
  }

  if (values.length <= 3) {
    return values.join(", ");
  }

  return `${values.slice(0, 3).join(", ")} +${values.length - 3} more`;
}

function createRoutineExerciseRow(): RoutineExerciseRow {
  return {
    id: createLocalPTDraftId(),
    exerciseName: "",
    repGoal: "",
    instructions: "",
    weightsInvolved: false,
  };
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
  const [routineDrafts, setRoutineDrafts] = useState<LocalPTRoutineDraft[]>([]);
  const [customFitnessTargets, setCustomFitnessTargets] = useState<string[]>([]);
  const [customFitnessAttributes, setCustomFitnessAttributes] = useState<string[]>([]);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [folderDraftName, setFolderDraftName] = useState("");
  const [folderDraftNote, setFolderDraftNote] = useState("");
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [exerciseDescription, setExerciseDescription] = useState("");
  const [exerciseInstructions, setExerciseInstructions] = useState("");
  const [exerciseObjective, setExerciseObjective] = useState("");
  const [exerciseErrors, setExerciseErrors] = useState<ExerciseFormErrors>({});
  const [routineDialogOpen, setRoutineDialogOpen] = useState(false);
  const [routineDialogPage, setRoutineDialogPage] = useState<"details" | "exercises">("details");
  const [routineName, setRoutineName] = useState("");
  const [routineDescription, setRoutineDescription] = useState("");
  const [fitnessTargets, setFitnessTargets] = useState<string[]>([]);
  const [fitnessAttributes, setFitnessAttributes] = useState<string[]>([]);
  const [timedByDuration, setTimedByDuration] = useState(false);
  const [setAmount, setSetAmount] = useState("");
  const [routineRows, setRoutineRows] = useState<RoutineExerciseRow[]>([createRoutineExerciseRow()]);
  const [activeRoutineExerciseIndex, setActiveRoutineExerciseIndex] = useState(0);
  const [routineDetailsErrors, setRoutineDetailsErrors] = useState<RoutineDetailsErrors>({});
  const [routineRowErrors, setRoutineRowErrors] = useState<Record<string, RoutineExerciseRowErrors>>(
    {},
  );
  const [routineOptionDialogKind, setRoutineOptionDialogKind] = useState<RoutineOptionDialogKind>(null);
  const [routineOptionValue, setRoutineOptionValue] = useState("");
  const [routineOptionError, setRoutineOptionError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(searchValue);

  useEffect(() => {
    setFolderDrafts(readLocalPTFolderDrafts());
    setExerciseDrafts(readLocalPTExerciseDrafts());
    setRoutineDrafts(readLocalPTRoutineDrafts());
    setCustomFitnessTargets(readLocalPTCustomFitnessTargets());
    setCustomFitnessAttributes(readLocalPTCustomFitnessAttributes());
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

  useEffect(() => {
    if (
      !createFolderDialogOpen &&
      !exerciseDialogOpen &&
      !routineDialogOpen &&
      !routineOptionDialogKind
    ) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (routineOptionDialogKind) {
        closeRoutineOptionDialog();
        return;
      }

      setCreateFolderDialogOpen(false);
      setFolderDraftName("");
      setFolderDraftNote("");
      setExerciseDialogOpen(false);
      setExerciseDescription("");
      setExerciseInstructions("");
      setExerciseObjective("");
      setExerciseErrors({});
      setRoutineDialogOpen(false);
      setRoutineDialogPage("details");
      setRoutineName("");
      setRoutineDescription("");
      setFitnessTargets([]);
      setFitnessAttributes([]);
      setTimedByDuration(false);
      setSetAmount("");
      setRoutineRows([createRoutineExerciseRow()]);
      setActiveRoutineExerciseIndex(0);
      setRoutineDetailsErrors({});
      setRoutineRowErrors({});
      closeRoutineOptionDialog();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [createFolderDialogOpen, exerciseDialogOpen, routineDialogOpen, routineOptionDialogKind]);

  const view = useMemo(
    () =>
      adaptPTTrainingView({
        folders: foldersData,
        packages: packagesData,
        routines: routinesData,
        selectedFolderId: openPortfolioFolderId,
      }),
    [foldersData, openPortfolioFolderId, packagesData, routinesData],
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

  const fitnessTargetOptions = useMemo(
    () => dedupeStringValues([...DEFAULT_FITNESS_TARGETS, ...customFitnessTargets]),
    [customFitnessTargets],
  );

  const fitnessAttributeOptions = useMemo(
    () => dedupeStringValues([...DEFAULT_FITNESS_ATTRIBUTES, ...customFitnessAttributes]),
    [customFitnessAttributes],
  );

  const routineExerciseSuggestions = useMemo(() => {
    const localExerciseSuggestions = exerciseDrafts.map((draft) => draft.description);
    const localRoutineSuggestions = routineDrafts.flatMap((draft) =>
      draft.exercises.map((exercise) => exercise.exerciseName),
    );
    const loadedSuggestions = [
      ...view.routineCards.map((item) => item.title),
      ...view.packageCards.map((item) => item.title),
    ];
    const inProgressRoutineSuggestions = routineRows.map((row) => row.exerciseName);

    return dedupeStringValues([
      ...localExerciseSuggestions,
      ...localRoutineSuggestions,
      ...loadedSuggestions,
      ...inProgressRoutineSuggestions,
    ]);
  }, [exerciseDrafts, routineDrafts, routineRows, view.packageCards, view.routineCards]);

  const activeRoutineRow = routineRows[activeRoutineExerciseIndex] ?? null;

  useEffect(() => {
    if (!openPortfolioFolderId) {
      return;
    }

    if (!filteredPortfolioFolders.some((folder) => folder.id === openPortfolioFolderId)) {
      setOpenPortfolioFolderId(null);
    }
  }, [filteredPortfolioFolders, openPortfolioFolderId]);

  useEffect(() => {
    if (activeRoutineExerciseIndex <= routineRows.length - 1) {
      return;
    }

    setActiveRoutineExerciseIndex(Math.max(0, routineRows.length - 1));
  }, [activeRoutineExerciseIndex, routineRows.length]);

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

  function openExerciseDialog() {
    setExerciseDescription("");
    setExerciseInstructions("");
    setExerciseObjective("");
    setExerciseErrors({});
    setExerciseDialogOpen(true);
  }

  function closeExerciseDialog() {
    setExerciseDialogOpen(false);
    setExerciseDescription("");
    setExerciseInstructions("");
    setExerciseObjective("");
    setExerciseErrors({});
  }

  function handleSaveExerciseDraft() {
    const nextErrors: ExerciseFormErrors = {};

    if (exerciseDescription.trim().length === 0) {
      nextErrors.description = "Exercise description is required.";
    }

    if (exerciseInstructions.trim().length === 0) {
      nextErrors.instructions = "Instructions are required.";
    }

    if (exerciseObjective.trim().length === 0) {
      nextErrors.objective = "Main objective is required.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setExerciseErrors(nextErrors);
      return;
    }

    const nextDraft = createLocalPTExerciseDraft({
      description: exerciseDescription,
      instructions: exerciseInstructions,
      objective: exerciseObjective,
    });
    const nextDrafts = [nextDraft, ...exerciseDrafts];
    setExerciseDrafts(nextDrafts);
    writeLocalPTExerciseDrafts(nextDrafts);
    closeExerciseDialog();
  }

  function removeExerciseDraft(draftId: string) {
    const nextDrafts = exerciseDrafts.filter((draft) => draft.id !== draftId);
    setExerciseDrafts(nextDrafts);
    writeLocalPTExerciseDrafts(nextDrafts);
  }

  function openRoutineDialog() {
    setRoutineDialogOpen(true);
    setRoutineDialogPage("details");
    setRoutineName("");
    setRoutineDescription("");
    setFitnessTargets([]);
    setFitnessAttributes([]);
    setTimedByDuration(false);
    setSetAmount("");
    setRoutineRows([createRoutineExerciseRow()]);
    setActiveRoutineExerciseIndex(0);
    setRoutineDetailsErrors({});
    setRoutineRowErrors({});
    closeRoutineOptionDialog();
  }

  function closeRoutineDialog() {
    setRoutineDialogOpen(false);
    setRoutineDialogPage("details");
    setRoutineName("");
    setRoutineDescription("");
    setFitnessTargets([]);
    setFitnessAttributes([]);
    setTimedByDuration(false);
    setSetAmount("");
    setRoutineRows([createRoutineExerciseRow()]);
    setActiveRoutineExerciseIndex(0);
    setRoutineDetailsErrors({});
    setRoutineRowErrors({});
    closeRoutineOptionDialog();
  }

  function openRoutineOptionDialog(kind: Exclude<RoutineOptionDialogKind, null>) {
    setRoutineOptionDialogKind(kind);
    setRoutineOptionValue("");
    setRoutineOptionError(null);
  }

  function closeRoutineOptionDialog() {
    setRoutineOptionDialogKind(null);
    setRoutineOptionValue("");
    setRoutineOptionError(null);
  }

  function toggleSelection(value: string, selected: string[], setSelected: (value: string[]) => void) {
    const normalized = normalizeOptionValue(value);
    const exists = selected.some((item) => normalizeOptionValue(item) === normalized);

    if (exists) {
      setSelected(selected.filter((item) => normalizeOptionValue(item) !== normalized));
      return;
    }

    setSelected([...selected, value]);
  }

  function handleAddRoutineOption() {
    if (!routineOptionDialogKind) {
      return;
    }

    const trimmed = routineOptionValue.trim();
    if (!trimmed) {
      setRoutineOptionError(
        routineOptionDialogKind === "target"
          ? "Body target is required."
          : "Physical attribute is required.",
      );
      return;
    }

    if (routineOptionDialogKind === "target") {
      const existing = dedupeStringValues([...fitnessTargetOptions, ...fitnessTargets]);
      if (existing.some((item) => normalizeOptionValue(item) === normalizeOptionValue(trimmed))) {
        setRoutineOptionError("That body target already exists.");
        return;
      }

      const nextCustomTargets = [...customFitnessTargets, trimmed];
      setCustomFitnessTargets(nextCustomTargets);
      writeLocalPTCustomFitnessTargets(nextCustomTargets);
      setFitnessTargets((current) => [...current, trimmed]);
      setRoutineDetailsErrors((current) => ({ ...current, fitnessTargets: undefined }));
      closeRoutineOptionDialog();
      return;
    }

    const existing = dedupeStringValues([...fitnessAttributeOptions, ...fitnessAttributes]);
    if (existing.some((item) => normalizeOptionValue(item) === normalizeOptionValue(trimmed))) {
      setRoutineOptionError("That physical attribute already exists.");
      return;
    }

    const nextCustomAttributes = [...customFitnessAttributes, trimmed];
    setCustomFitnessAttributes(nextCustomAttributes);
    writeLocalPTCustomFitnessAttributes(nextCustomAttributes);
    setFitnessAttributes((current) => [...current, trimmed]);
    setRoutineDetailsErrors((current) => ({ ...current, fitnessAttributes: undefined }));
    closeRoutineOptionDialog();
  }

  function validateRoutineDetails() {
    const nextErrors: RoutineDetailsErrors = {};

    if (routineName.trim().length === 0) {
      nextErrors.routineName = "Routine name is required.";
    }

    if (routineDescription.trim().length === 0) {
      nextErrors.description = "Description is required.";
    }

    if (fitnessTargets.length === 0) {
      nextErrors.fitnessTargets = "Select at least one Fitness Target.";
    }

    if (fitnessAttributes.length === 0) {
      nextErrors.fitnessAttributes = "Select at least one Fitness Attribute.";
    }

    if (setAmount.trim().length === 0) {
      nextErrors.setAmount = "How many Sets? is required.";
    }

    setRoutineDetailsErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateRoutineRows() {
    const nextErrors: Record<string, RoutineExerciseRowErrors> = {};

    routineRows.forEach((row) => {
      const rowErrors: RoutineExerciseRowErrors = {};

      if (row.exerciseName.trim().length === 0) {
        rowErrors.exerciseName = "Exercise is required.";
      }

      if (row.repGoal.trim().length === 0) {
        rowErrors.repGoal = "Rep Goal is required.";
      }

      if (row.instructions.trim().length === 0) {
        rowErrors.instructions = "Instructions are required.";
      }

      if (Object.keys(rowErrors).length > 0) {
        nextErrors[row.id] = rowErrors;
      }
    });

    setRoutineRowErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleRoutineNextPage() {
    if (!validateRoutineDetails()) {
      return;
    }

    setRoutineDialogPage("exercises");
  }

  function handleRoutineRowChange(
    rowId: string,
    key: keyof RoutineExerciseRow,
    value: string | boolean,
  ) {
    setRoutineRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        return {
          ...row,
          [key]: value,
        };
      }),
    );

    setRoutineRowErrors((current) => {
      if (!current[rowId]) {
        return current;
      }

      const next = { ...current };
      const nextRowErrors = { ...next[rowId] };
      delete nextRowErrors[key as keyof RoutineExerciseRowErrors];

      if (Object.keys(nextRowErrors).length === 0) {
        delete next[rowId];
      } else {
        next[rowId] = nextRowErrors;
      }

      return next;
    });
  }

  function handleAddRoutineExerciseRow() {
    const nextRow = createRoutineExerciseRow();
    setRoutineRows((current) => [...current, nextRow]);
    setActiveRoutineExerciseIndex(routineRows.length);
  }

  function handleRemoveRoutineExerciseRow(rowId: string) {
    const removeIndex = routineRows.findIndex((row) => row.id === rowId);
    const nextRows = routineRows.filter((row) => row.id !== rowId);
    setRoutineRows(nextRows);
    setRoutineRowErrors((current) => {
      const next = { ...current };
      delete next[rowId];
      return next;
    });

    if (nextRows.length === 0) {
      setRoutineRows([createRoutineExerciseRow()]);
      setActiveRoutineExerciseIndex(0);
      return;
    }

    if (removeIndex < activeRoutineExerciseIndex) {
      setActiveRoutineExerciseIndex((current) => Math.max(0, current - 1));
      return;
    }

    if (removeIndex === activeRoutineExerciseIndex) {
      setActiveRoutineExerciseIndex(Math.min(activeRoutineExerciseIndex, nextRows.length - 1));
    }
  }

  function handleSaveRoutineDraft() {
    const detailsValid = validateRoutineDetails();
    const rowsValid = validateRoutineRows();

    if (!detailsValid) {
      setRoutineDialogPage("details");
      return;
    }

    if (!rowsValid) {
      setRoutineDialogPage("exercises");
      const nextInvalidIndex = routineRows.findIndex((row) => {
        const rowErrors = routineRowErrors[row.id];
        return rowErrors && Object.keys(rowErrors).length > 0;
      });
      if (nextInvalidIndex >= 0) {
        setActiveRoutineExerciseIndex(nextInvalidIndex);
      }
      return;
    }

    const nextDraft = createLocalPTRoutineDraft({
      routineName,
      description: routineDescription,
      fitnessTargets,
      fitnessAttributes,
      timedByDuration,
      setAmount: Number(setAmount),
      exercises: routineRows.map((row) => ({
        id: row.id,
        exerciseName: row.exerciseName,
        repGoal: Number(row.repGoal),
        instructions: row.instructions,
        weightsInvolved: row.weightsInvolved,
      })),
    });
    const nextDrafts = [nextDraft, ...routineDrafts];
    setRoutineDrafts(nextDrafts);
    writeLocalPTRoutineDrafts(nextDrafts);
    closeRoutineDialog();
  }

  function removeRoutineDraft(draftId: string) {
    const nextDrafts = routineDrafts.filter((draft) => draft.id !== draftId);
    setRoutineDrafts(nextDrafts);
    writeLocalPTRoutineDrafts(nextDrafts);
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
              <div className="pt-training-create-folder-card-wrap">
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
              </div>

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
              <TrainingStateCard title="Training Portfolio unavailable" message={sectionErrors.folders} />
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
                        ]
                          .filter(Boolean)
                          .join(" ")}
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
            description="Create local draft exercises and routines that can later be attached to training portfolio folders when save routes are wired."
          >
            <div className="pt-training-builder-frame">
              <div className="pt-training-builder-grid">
                {BUILDER_OPTIONS.map((item) => (
                  <button
                    key={item.kind}
                    type="button"
                    className={["pt-training-builder-card", item.className, "mobile-focus-ring"].join(" ")}
                    aria-label={item.title}
                    onClick={() => {
                      if (item.kind === "exercise") {
                        openExerciseDialog();
                        return;
                      }

                      openRoutineDialog();
                    }}
                    aria-haspopup="dialog"
                    aria-controls={item.kind === "exercise" ? "pt-training-exercise-dialog" : "pt-training-routine-dialog"}
                  >
                    <span className="pt-training-builder-card__badge">{item.badge}</span>
                    <span className="pt-training-builder-card__title">{item.title}</span>
                    <span className="pt-training-builder-card__copy">{item.copy}</span>
                  </button>
                ))}
              </div>

              {exerciseDrafts.length > 0 ? (
                <div className="pt-training-builder-drafts">
                  <p className="pt-training-builder-drafts__title">Local exercise drafts</p>
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
                            <p className="pt-training-local-draft-card__title">{draft.description}</p>
                            <span className="pt-training-local-draft-tag">Local draft</span>
                          </div>
                          <p className="pt-training-local-draft-card__meta">Main objective: {draft.objective}</p>
                          <p className="pt-training-local-draft-card__note">{draft.instructions}</p>
                        </div>
                        <button
                          type="button"
                          className="pt-training-local-draft-remove mobile-focus-ring"
                          onClick={() => {
                            removeExerciseDraft(draft.id);
                          }}
                          aria-label={`Remove local exercise draft ${draft.description}`}
                        >
                          Remove
                        </button>
                      </MobileCard>
                    ))}
                  </div>
                </div>
              ) : null}

              {routineDrafts.length > 0 ? (
                <div className="pt-training-builder-drafts">
                  <p className="pt-training-builder-drafts__title">Local routine drafts</p>
                  <div className="pt-training-builder-drafts__list">
                    {routineDrafts.map((draft) => (
                      <MobileCard
                        key={draft.id}
                        as="article"
                        variant="soft"
                        className="pt-training-local-draft-card"
                      >
                        <div className="pt-training-local-draft-card__copy">
                          <div className="pt-training-local-draft-card__header">
                            <p className="pt-training-local-draft-card__title">{draft.routineName}</p>
                            <span className="pt-training-local-draft-tag">Local draft</span>
                          </div>
                          <p className="pt-training-local-draft-card__meta">
                            Fitness targets: {formatSummaryList(draft.fitnessTargets)}
                          </p>
                          <p className="pt-training-local-draft-card__meta">
                            Fitness attributes: {formatSummaryList(draft.fitnessAttributes)}
                          </p>
                          <p className="pt-training-local-draft-card__note">
                            Set amount: {draft.setAmount} | Exercise count: {draft.exercises.length}
                            {draft.timedByDuration ? " | Timed by duration: Yes" : " | Timed by duration: No"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="pt-training-local-draft-remove mobile-focus-ring"
                          onClick={() => {
                            removeRoutineDraft(draft.id);
                          }}
                          aria-label={`Remove local routine draft ${draft.routineName}`}
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
              <TrainingStateCard title="Partial PT training data" message={detailErrorMessages.join(" ")} />
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
                className="pt-training-modal__secondary-action mobile-focus-ring"
                onClick={closeCreateFolderDialog}
              >
                Close
              </button>
            </div>

            <div className="pt-training-modal__form pt-training-builder-form">
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
                  className="pt-training-modal__secondary-action mobile-focus-ring"
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

      {exerciseDialogOpen ? (
        <div
          className="pt-training-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeExerciseDialog();
            }
          }}
        >
          <section
            id="pt-training-exercise-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pt-training-exercise-dialog-title"
            className="pt-training-modal"
          >
            <div className="pt-training-modal__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Local builder staging</p>
                <h2 id="pt-training-exercise-dialog-title" className="mobile-section__title">
                  Add an Exercise
                </h2>
                <p className="mobile-section__description">
                  This draft stays local to the browser until PT exercise save routes are wired. It does not create a backend exercise record or attach anything to a live folder.
                </p>
              </div>
              <button
                type="button"
                className="pt-training-modal__secondary-action mobile-focus-ring"
                onClick={closeExerciseDialog}
              >
                Close
              </button>
            </div>

            <div className="pt-training-modal__form pt-training-builder-form">
              <div className="pt-training-builder-form__field">
                <label htmlFor="pt-training-exercise-description">Exercise description</label>
                <textarea
                  id="pt-training-exercise-description"
                  value={exerciseDescription}
                  onChange={(event) => {
                    setExerciseDescription(event.target.value);
                    setExerciseErrors((current) => ({ ...current, description: undefined }));
                  }}
                  rows={3}
                />
                {exerciseErrors.description ? (
                  <p className="pt-training-builder-form__error" role="alert">
                    {exerciseErrors.description}
                  </p>
                ) : null}
              </div>

              <div className="pt-training-builder-form__field">
                <label htmlFor="pt-training-exercise-instructions">Instructions</label>
                <textarea
                  id="pt-training-exercise-instructions"
                  value={exerciseInstructions}
                  onChange={(event) => {
                    setExerciseInstructions(event.target.value);
                    setExerciseErrors((current) => ({ ...current, instructions: undefined }));
                  }}
                  rows={4}
                />
                {exerciseErrors.instructions ? (
                  <p className="pt-training-builder-form__error" role="alert">
                    {exerciseErrors.instructions}
                  </p>
                ) : null}
              </div>

              <div className="pt-training-builder-form__field">
                <label htmlFor="pt-training-exercise-objective">Main objective</label>
                <textarea
                  id="pt-training-exercise-objective"
                  value={exerciseObjective}
                  onChange={(event) => {
                    setExerciseObjective(event.target.value);
                    setExerciseErrors((current) => ({ ...current, objective: undefined }));
                  }}
                  rows={3}
                />
                {exerciseErrors.objective ? (
                  <p className="pt-training-builder-form__error" role="alert">
                    {exerciseErrors.objective}
                  </p>
                ) : null}
              </div>

              <div className="pt-training-modal__actions">
                <button
                  type="button"
                  className="pt-training-modal__secondary-action mobile-focus-ring"
                  onClick={closeExerciseDialog}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="pt-training-modal__primary-action mobile-focus-ring"
                  onClick={handleSaveExerciseDraft}
                >
                  Save local draft
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {routineDialogOpen ? (
        <div
          className="pt-training-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeRoutineDialog();
            }
          }}
        >
          <section
            id="pt-training-routine-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pt-training-routine-dialog-title"
            className="pt-training-modal pt-training-routine-form"
          >
            <div className="pt-training-modal__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Local builder staging</p>
                <h2 id="pt-training-routine-dialog-title" className="mobile-section__title">
                  Create a Routine
                </h2>
                <p className="mobile-section__description">
                  This draft stays local to the browser until PT routine save routes are wired. If Weights Involved is Yes, future client assignments will need a numeric weight input for that exercise.
                </p>
              </div>
              <button
                type="button"
                className="pt-training-modal__secondary-action mobile-focus-ring"
                onClick={closeRoutineDialog}
              >
                Close
              </button>
            </div>

            <div className="pt-training-modal__form pt-training-builder-form">
              {routineDialogPage === "details" ? (
                <>
                  <div className="pt-training-builder-form__section-copy">
                    <p className="pt-training-builder-form__section-eyebrow">Page 1</p>
                    <h3 className="pt-training-builder-form__section-title">Routine Details</h3>
                  </div>

                  <div className="pt-training-builder-form__field">
                    <label htmlFor="pt-training-routine-name">Routine name</label>
                    <input
                      id="pt-training-routine-name"
                      value={routineName}
                      onChange={(event) => {
                        setRoutineName(event.target.value);
                        setRoutineDetailsErrors((current) => ({ ...current, routineName: undefined }));
                      }}
                    />
                    {routineDetailsErrors.routineName ? (
                      <p className="pt-training-builder-form__error" role="alert">
                        {routineDetailsErrors.routineName}
                      </p>
                    ) : null}
                  </div>

                  <div className="pt-training-builder-form__field">
                    <label htmlFor="pt-training-routine-description">Description</label>
                    <textarea
                      id="pt-training-routine-description"
                      value={routineDescription}
                      onChange={(event) => {
                        setRoutineDescription(event.target.value);
                        setRoutineDetailsErrors((current) => ({ ...current, description: undefined }));
                      }}
                      rows={4}
                    />
                    {routineDetailsErrors.description ? (
                      <p className="pt-training-builder-form__error" role="alert">
                        {routineDetailsErrors.description}
                      </p>
                    ) : null}
                  </div>

                  <fieldset className="pt-training-builder-form__field pt-training-routine-form__checkbox-fieldset">
                    <legend className="pt-training-routine-form__field-header">
                      <span>Fitness Target</span>
                      <button
                        type="button"
                        className="pt-training-routine-form__field-action mobile-focus-ring"
                        onClick={() => {
                          openRoutineOptionDialog("target");
                        }}
                      >
                        Add Target
                      </button>
                    </legend>
                    <p className="pt-training-builder-form__helper">
                      Which body targets does this routine contribute to?
                    </p>
                    <div className="pt-training-routine-form__checkbox-grid">
                      {fitnessTargetOptions.map((option) => {
                        const optionId = `pt-training-routine-target-${option.toLowerCase().replace(/\s+/g, "-")}`;
                        const checked = fitnessTargets.some(
                          (item) => normalizeOptionValue(item) === normalizeOptionValue(option),
                        );

                        return (
                          <label key={option} htmlFor={optionId} className="pt-training-routine-form__checkbox-option">
                            <input
                              id={optionId}
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                toggleSelection(option, fitnessTargets, setFitnessTargets);
                                setRoutineDetailsErrors((current) => ({ ...current, fitnessTargets: undefined }));
                              }}
                            />
                            <span>{option}</span>
                          </label>
                        );
                      })}
                    </div>
                    {routineDetailsErrors.fitnessTargets ? (
                      <p className="pt-training-builder-form__error" role="alert">
                        {routineDetailsErrors.fitnessTargets}
                      </p>
                    ) : null}
                  </fieldset>

                  <fieldset className="pt-training-builder-form__field pt-training-routine-form__checkbox-fieldset">
                    <legend className="pt-training-routine-form__field-header">
                      <span>Fitness Attributes</span>
                      <button
                        type="button"
                        className="pt-training-routine-form__field-action mobile-focus-ring"
                        onClick={() => {
                          openRoutineOptionDialog("attribute");
                        }}
                      >
                        Add Attribute
                      </button>
                    </legend>
                    <p className="pt-training-builder-form__helper">
                      Which physical attributes does this routine contribute to?
                    </p>
                    <div className="pt-training-routine-form__checkbox-grid">
                      {fitnessAttributeOptions.map((option) => {
                        const optionId = `pt-training-routine-attribute-${option.toLowerCase().replace(/\s+/g, "-")}`;
                        const checked = fitnessAttributes.some(
                          (item) => normalizeOptionValue(item) === normalizeOptionValue(option),
                        );

                        return (
                          <label key={option} htmlFor={optionId} className="pt-training-routine-form__checkbox-option">
                            <input
                              id={optionId}
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                toggleSelection(option, fitnessAttributes, setFitnessAttributes);
                                setRoutineDetailsErrors((current) => ({ ...current, fitnessAttributes: undefined }));
                              }}
                            />
                            <span>{option}</span>
                          </label>
                        );
                      })}
                    </div>
                    {routineDetailsErrors.fitnessAttributes ? (
                      <p className="pt-training-builder-form__error" role="alert">
                        {routineDetailsErrors.fitnessAttributes}
                      </p>
                    ) : null}
                  </fieldset>

                  <fieldset className="pt-training-builder-form__field pt-training-builder-form__toggle-field">
                    <legend>Timed by duration</legend>
                    <div className="pt-training-builder-form__toggle-group" role="radiogroup" aria-label="Timed by duration">
                      <label className="pt-training-builder-form__toggle">
                        <input
                          type="radio"
                          name="pt-training-routine-timed"
                          checked={timedByDuration}
                          onChange={() => {
                            setTimedByDuration(true);
                          }}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="pt-training-builder-form__toggle">
                        <input
                          type="radio"
                          name="pt-training-routine-timed"
                          checked={!timedByDuration}
                          onChange={() => {
                            setTimedByDuration(false);
                          }}
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </fieldset>

                  <div className="pt-training-builder-form__field">
                    <label htmlFor="pt-training-routine-set-amount">How many Sets?</label>
                    <input
                      id="pt-training-routine-set-amount"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={setAmount}
                      onChange={(event) => {
                        setSetAmount(sanitizeNumericInput(event.target.value));
                        setRoutineDetailsErrors((current) => ({ ...current, setAmount: undefined }));
                      }}
                    />
                    {routineDetailsErrors.setAmount ? (
                      <p className="pt-training-builder-form__error" role="alert">
                        {routineDetailsErrors.setAmount}
                      </p>
                    ) : null}
                  </div>

                  <div className="pt-training-modal__actions">
                    <button
                      type="button"
                      className="pt-training-modal__secondary-action mobile-focus-ring"
                      onClick={closeRoutineDialog}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="pt-training-modal__primary-action mobile-focus-ring"
                      onClick={handleRoutineNextPage}
                    >
                      Next: Add Exercises
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="pt-training-builder-form__section-copy">
                    <p className="pt-training-builder-form__section-eyebrow">Page 2</p>
                    <h3 className="pt-training-builder-form__section-title">Routine Exercises</h3>
                  </div>

                  <datalist id="pt-training-routine-exercise-suggestions">
                    {routineExerciseSuggestions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>

                  {activeRoutineRow ? (
                    <section className="pt-training-builder-form__exercise-row">
                      <div className="pt-training-builder-form__exercise-row-header">
                        <p className="pt-training-builder-form__exercise-row-title">
                          Exercise {activeRoutineExerciseIndex + 1}
                        </p>
                        {routineRows.length > 1 ? (
                          <button
                            type="button"
                            className="pt-training-local-draft-remove mobile-focus-ring"
                            onClick={() => {
                              handleRemoveRoutineExerciseRow(activeRoutineRow.id);
                            }}
                          >
                            Remove exercise row
                          </button>
                        ) : null}
                      </div>

                      <div className="pt-training-builder-form__field">
                        <label htmlFor={`pt-training-routine-exercise-name-${activeRoutineRow.id}`}>Exercise</label>
                        <input
                          id={`pt-training-routine-exercise-name-${activeRoutineRow.id}`}
                          list="pt-training-routine-exercise-suggestions"
                          value={activeRoutineRow.exerciseName}
                          onChange={(event) => {
                            handleRoutineRowChange(activeRoutineRow.id, "exerciseName", event.target.value);
                          }}
                        />
                        {routineRowErrors[activeRoutineRow.id]?.exerciseName ? (
                          <p className="pt-training-builder-form__error" role="alert">
                            {routineRowErrors[activeRoutineRow.id]?.exerciseName}
                          </p>
                        ) : null}
                      </div>

                      <div className="pt-training-builder-form__field">
                        <label htmlFor={`pt-training-routine-rep-goal-${activeRoutineRow.id}`}>Rep Goal</label>
                        <input
                          id={`pt-training-routine-rep-goal-${activeRoutineRow.id}`}
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          value={activeRoutineRow.repGoal}
                          onChange={(event) => {
                            handleRoutineRowChange(
                              activeRoutineRow.id,
                              "repGoal",
                              sanitizeNumericInput(event.target.value),
                            );
                          }}
                        />
                        {routineRowErrors[activeRoutineRow.id]?.repGoal ? (
                          <p className="pt-training-builder-form__error" role="alert">
                            {routineRowErrors[activeRoutineRow.id]?.repGoal}
                          </p>
                        ) : null}
                      </div>

                      <div className="pt-training-builder-form__field">
                        <label htmlFor={`pt-training-routine-instructions-${activeRoutineRow.id}`}>Instructions</label>
                        <textarea
                          id={`pt-training-routine-instructions-${activeRoutineRow.id}`}
                          value={activeRoutineRow.instructions}
                          onChange={(event) => {
                            handleRoutineRowChange(activeRoutineRow.id, "instructions", event.target.value);
                          }}
                          rows={4}
                        />
                        {routineRowErrors[activeRoutineRow.id]?.instructions ? (
                          <p className="pt-training-builder-form__error" role="alert">
                            {routineRowErrors[activeRoutineRow.id]?.instructions}
                          </p>
                        ) : null}
                      </div>

                      <fieldset className="pt-training-builder-form__field pt-training-builder-form__toggle-field">
                        <legend>Weights Involved?</legend>
                        <p className="pt-training-builder-form__helper">
                          If Yes, clients will need a numeric weight input when this exercise is assigned in a future training package flow.
                        </p>
                        <div
                          className="pt-training-builder-form__toggle-group"
                          role="radiogroup"
                          aria-label={`Weights Involved for exercise ${activeRoutineExerciseIndex + 1}`}
                        >
                          <label className="pt-training-builder-form__toggle">
                            <input
                              type="radio"
                              name={`pt-training-routine-weights-${activeRoutineRow.id}`}
                              checked={activeRoutineRow.weightsInvolved}
                              onChange={() => {
                                handleRoutineRowChange(activeRoutineRow.id, "weightsInvolved", true);
                              }}
                            />
                            <span>Yes</span>
                          </label>
                          <label className="pt-training-builder-form__toggle">
                            <input
                              type="radio"
                              name={`pt-training-routine-weights-${activeRoutineRow.id}`}
                              checked={!activeRoutineRow.weightsInvolved}
                              onChange={() => {
                                handleRoutineRowChange(activeRoutineRow.id, "weightsInvolved", false);
                              }}
                            />
                            <span>No</span>
                          </label>
                        </div>
                      </fieldset>
                    </section>
                  ) : null}

                  <div className="pt-training-routine-form__add-exercise-wrap">
                    <button
                      type="button"
                      className="pt-training-modal__secondary-action mobile-focus-ring"
                      onClick={handleAddRoutineExerciseRow}
                    >
                      Add Another Exercise
                    </button>
                  </div>

                  {routineRows.length > 1 ? (
                    <div className="pt-training-routine-form__exercise-nav">
                      <button
                        type="button"
                        className="pt-training-routine-form__exercise-nav-button mobile-focus-ring"
                        onClick={() => {
                          setActiveRoutineExerciseIndex((current) => Math.max(0, current - 1));
                        }}
                        disabled={activeRoutineExerciseIndex === 0}
                        aria-label="Previous exercise"
                      >
                        <ExerciseArrowIcon direction="left" />
                      </button>
                      <p className="pt-training-routine-form__exercise-index">
                        Exercise {activeRoutineExerciseIndex + 1} of {routineRows.length}
                      </p>
                      <button
                        type="button"
                        className="pt-training-routine-form__exercise-nav-button mobile-focus-ring"
                        onClick={() => {
                          setActiveRoutineExerciseIndex((current) =>
                            Math.min(routineRows.length - 1, current + 1),
                          );
                        }}
                        disabled={activeRoutineExerciseIndex === routineRows.length - 1}
                        aria-label="Next exercise"
                      >
                        <ExerciseArrowIcon direction="right" />
                      </button>
                    </div>
                  ) : null}

                  <div className="pt-training-modal__actions">
                    <button
                      type="button"
                      className="pt-training-modal__secondary-action mobile-focus-ring"
                      onClick={closeRoutineDialog}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="pt-training-modal__secondary-action mobile-focus-ring"
                      onClick={() => {
                        setRoutineDialogPage("details");
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="pt-training-modal__primary-action mobile-focus-ring"
                      onClick={handleSaveRoutineDraft}
                    >
                      Save local routine draft
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {routineOptionDialogKind ? (
        <div
          className="pt-training-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeRoutineOptionDialog();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={
              routineOptionDialogKind === "target"
                ? "pt-training-add-target-dialog-title"
                : "pt-training-add-attribute-dialog-title"
            }
            className="pt-training-modal pt-training-routine-form__add-option-dialog"
          >
            <div className="pt-training-modal__header">
              <div className="mobile-section__copy">
                <p className="mobile-section__eyebrow">Local-only option</p>
                <h2
                  id={
                    routineOptionDialogKind === "target"
                      ? "pt-training-add-target-dialog-title"
                      : "pt-training-add-attribute-dialog-title"
                  }
                  className="mobile-section__title"
                >
                  {routineOptionDialogKind === "target" ? "Add Fitness Target" : "Add Fitness Attribute"}
                </h2>
              </div>
              <button
                type="button"
                className="pt-training-modal__secondary-action mobile-focus-ring"
                onClick={closeRoutineOptionDialog}
              >
                Close
              </button>
            </div>

            <div className="pt-training-modal__form pt-training-builder-form">
              <div className="pt-training-builder-form__field">
                <label htmlFor="pt-training-routine-option-value">
                  {routineOptionDialogKind === "target" ? "Body target" : "Physical attribute"}
                </label>
                <input
                  id="pt-training-routine-option-value"
                  value={routineOptionValue}
                  onChange={(event) => {
                    setRoutineOptionValue(event.target.value);
                    setRoutineOptionError(null);
                  }}
                />
                {routineOptionError ? (
                  <p className="pt-training-builder-form__error" role="alert">
                    {routineOptionError}
                  </p>
                ) : null}
              </div>

              <div className="pt-training-modal__actions">
                <button
                  type="button"
                  className="pt-training-modal__secondary-action mobile-focus-ring"
                  onClick={closeRoutineOptionDialog}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="pt-training-modal__primary-action mobile-focus-ring"
                  onClick={handleAddRoutineOption}
                >
                  {routineOptionDialogKind === "target" ? "Add Target" : "Add Attribute"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </MobileAppShell>
  );
}
