"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileSection } from "@/components/mobile/MobileSection";
import { MobileStatCard } from "@/components/mobile/MobileStatCard";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, BookmarkFolder, BookmarkFolderListPayload } from "@/lib/types/api";
import {
  formatCountLabel,
  formatDisplayNameFromUser,
  formatNumber,
  formatPriceCents,
} from "@/lib/view-models/common";

type BookmarksResponse = ApiResponse<BookmarkFolderListPayload>;
type FolderResponse = ApiResponse<BookmarkFolder>;

type FeedbackState = {
  tone: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
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
  role?: "status" | "alert";
};

type FeedbackCardProps = {
  feedback: FeedbackState;
};

function ActionPill({ href, children, tone = "yellow" }: ActionPillProps) {
  return (
    <Link href={href} className={`mobile-pill mobile-pill--${tone} mobile-focus-ring`}>
      {children}
    </Link>
  );
}

function StateCard({ title, message, action, role = "status" }: StateCardProps) {
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

function FeedbackCard({ feedback }: FeedbackCardProps) {
  const tone = feedback.tone === "success" ? "yellow" : "purple";

  return (
    <MobileCard as="div" variant="soft" className="mobile-pt-state-card">
      <div
        className="mobile-pt-client-card__header"
        role={feedback.tone === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        <div className="mobile-section__copy">
          <p className="mobile-section__eyebrow">Bookmark status</p>
          <h3 className="mobile-section__title">{feedback.title}</h3>
          <p className="mobile-section__description">{feedback.message}</p>
        </div>
        <span className={`mobile-pill mobile-pill--${tone}`}>{feedback.tone}</span>
      </div>
    </MobileCard>
  );
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) {
    return "Unavailable";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString();
}

function formatFolderDescription(description: string | null | undefined): string {
  return description?.trim() || "Saved meal plans grouped for quick reuse.";
}

function formatMealPlanDescription(description: string | null | undefined): string {
  return description?.trim() || "Meal-plan configuration available through the signed BFF flow.";
}

function formatZipLabel(value: string | null | undefined): string {
  return value?.trim() || "Unavailable";
}

function formatMealCountLabel(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Meals unavailable";
  }

  return formatCountLabel(value, "meal");
}

function formatFolderCountLabel(value: number): string {
  return formatCountLabel(value, "folder");
}

function formatSavedPlanCountLabel(value: number): string {
  return formatCountLabel(value, "saved plan");
}

function formatFolderItemCountValue(value: number): string {
  return formatNumber(value);
}

export default function ClientBookmarksPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [folderName, setFolderName] = useState("Favorites");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<FeedbackState | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [busyFolderId, setBusyFolderId] = useState<string | null>(null);
  const [busyItemKey, setBusyItemKey] = useState<string | null>(null);

  async function loadBookmarks(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true);
    }

    setLoadError(null);

    try {
      const response = await fetch("/api/client/bookmarks", { cache: "no-store" });
      const payload = (await response.json()) as BookmarksResponse;

      if (!payload.ok) {
        if (options?.silent) {
          throw new Error(payload.error.message);
        }

        setLoadError(payload.error.message);
        setFolders([]);
        return;
      }

      setFolders(payload.data.items);
    } catch {
      if (options?.silent) {
        throw new Error("Unable to load bookmarks.");
      }

      setLoadError("Unable to load bookmarks.");
      setFolders([]);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (status === "authenticated" && user?.role === "client") {
      void loadBookmarks();
    }
  }, [status, user]);

  const totalSavedItems = useMemo(
    () => folders.reduce((sum, folder) => sum + folder.items.length, 0),
    [folders],
  );

  const nonEmptyFolders = useMemo(
    () => folders.filter((folder) => folder.items.length > 0).length,
    [folders],
  );

  const emptyFolders = Math.max(folders.length - nonEmptyFolders, 0);
  const highlightedFolder = folders[0] ?? null;

  const latestSavedItem = useMemo(() => {
    const entries = folders.flatMap((folder) =>
      folder.items.map((item) => ({
        folderId: folder.id,
        folderName: folder.name,
        item,
      })),
    );

    return entries.sort(
      (left, right) =>
        new Date(right.item.created_at).getTime() - new Date(left.item.created_at).getTime(),
    )[0] ?? null;
  }, [folders]);

  async function handleCreateFolder() {
    if (folderName.trim().length === 0) {
      setActionFeedback({
        tone: "warning",
        title: "Folder name required",
        message: "Enter a folder name before saving.",
      });
      return;
    }

    setCreatingFolder(true);
    setActionFeedback({
      tone: "info",
      title: "Creating folder",
      message: `${folderName.trim()} is being added to your bookmarks workspace.`,
    });

    try {
      const response = await fetch("/api/client/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: folderName }),
      });
      const payload = (await response.json()) as FolderResponse;

      if (!payload.ok) {
        setActionFeedback({
          tone: "error",
          title: "Folder creation failed",
          message: payload.error.message,
        });
        return;
      }

      const createdFolderName = folderName.trim();
      setFolderName("");
      await loadBookmarks({ silent: true });
      setActionFeedback({
        tone: "success",
        title: "Folder created",
        message: `${createdFolderName} is ready for saved meal plans.`,
      });
    } catch {
      setActionFeedback({
        tone: "error",
        title: "Folder creation failed",
        message: "Unable to create bookmark folder.",
      });
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleDeleteFolder(folderId: string) {
    const folder = folders.find((entry) => entry.id === folderId);

    setBusyFolderId(folderId);
    setActionFeedback({
      tone: "info",
      title: "Removing folder",
      message: `${folder?.name ?? "Folder"} is being deleted from your bookmarks workspace.`,
    });

    try {
      const response = await fetch(`/api/client/bookmarks/${folderId}`, { method: "DELETE" });
      const payload = (await response.json()) as ApiResponse<{ deleted: true }>;

      if (!payload.ok) {
        setActionFeedback({
          tone: "error",
          title: "Folder deletion failed",
          message: payload.error.message,
        });
        return;
      }

      await loadBookmarks({ silent: true });
      setActionFeedback({
        tone: "success",
        title: "Folder deleted",
        message: `${folder?.name ?? "Folder"} was removed.`,
      });
    } catch {
      setActionFeedback({
        tone: "error",
        title: "Folder deletion failed",
        message: "Unable to delete bookmark folder.",
      });
    } finally {
      setBusyFolderId(null);
    }
  }

  async function handleDeleteItem(folderId: string, itemId: string) {
    const folder = folders.find((entry) => entry.id === folderId);
    const item = folder?.items.find((entry) => entry.id === itemId);
    const nextBusyKey = `${folderId}:${itemId}`;

    setBusyItemKey(nextBusyKey);
    setActionFeedback({
      tone: "info",
      title: "Removing saved plan",
      message: `${item?.meal_plan.name ?? "Saved plan"} is being removed from ${folder?.name ?? "this folder"}.`,
    });

    try {
      const response = await fetch(`/api/client/bookmarks/${folderId}/items/${itemId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as ApiResponse<{ deleted: true }>;

      if (!payload.ok) {
        setActionFeedback({
          tone: "error",
          title: "Saved plan removal failed",
          message: payload.error.message,
        });
        return;
      }

      await loadBookmarks({ silent: true });
      setActionFeedback({
        tone: "success",
        title: "Saved plan removed",
        message: `${item?.meal_plan.name ?? "Saved plan"} was removed from ${folder?.name ?? "the folder"}.`,
      });
    } catch {
      setActionFeedback({
        tone: "error",
        title: "Saved plan removal failed",
        message: "Unable to delete bookmark.",
      });
    } finally {
      setBusyItemKey(null);
    }
  }

  if (status === "loading") {
    return <LoadingBlock title="Loading bookmarks" message="Validating your client session." />;
  }

  if (status !== "authenticated" || !user) {
    return <LoadingBlock title="Redirecting" message="Bookmarks require an authenticated client session." />;
  }

  return (
    <MobileAppShell
      user={user}
      activePath="/client/meal-plans"
      greeting={formatDisplayNameFromUser(user)}
      title="Bookmarks"
      subtitle={
        folders.length > 0
          ? `${formatFolderCountLabel(folders.length)} | ${formatSavedPlanCountLabel(totalSavedItems)}`
          : "Client bookmark folders and saved meal plans."
      }
      notificationSlot={<ActionPill href="/client/metrics" tone="purple">Review metrics</ActionPill>}
      topHubAction={<ActionPill href="/client/meal-plans">Browse meal plans</ActionPill>}
    >
      {actionFeedback ? <FeedbackCard feedback={actionFeedback} /> : null}

      {loading ? (
        <MobileSection
          eyebrow="Loading"
          title="Loading bookmarks"
          description="Fetching bookmark folders."
        >
          <StateCard title="Loading bookmarks" message="Fetching bookmark folders." />
        </MobileSection>
      ) : null}

      {loadError ? (
        <MobileSection
          eyebrow="Unavailable"
          title="Unable to manage bookmarks"
          description="The current bookmarks workspace stays inside the protected client BFF boundary and does not fall back to direct backend calls."
        >
          <StateCard title="Unable to manage bookmarks" message={loadError} role="alert" />
        </MobileSection>
      ) : null}

      {!loading && !loadError ? (
        <>
          <MobileSection
            eyebrow="Client bookmarks"
            title="Saved-items workspace"
            description="Organize bookmarked meal plans into folders, review what you have saved, and return to plan detail without leaving the protected client shell."
          >
            <MobileCard as="article" variant="accent" className="mobile-pt-detail-action-card">
              <div className="mobile-pt-client-card__header">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Bookmark workspace</p>
                  <h2 className="mobile-section__title">Bookmark folders and saved plans</h2>
                  <p className="mobile-section__description">
                    This route remains the broader bookmark-management workspace, not the simpler saved-plans listing.
                  </p>
                </div>
                <span className="mobile-pill mobile-pill--yellow">{formatFolderCountLabel(folders.length)}</span>
              </div>

              <dl className="mobile-pt-fact-grid">
                <div>
                  <dt>Saved items</dt>
                  <dd>{formatSavedPlanCountLabel(totalSavedItems)}</dd>
                </div>
                <div>
                  <dt>Active folders</dt>
                  <dd>{formatFolderCountLabel(nonEmptyFolders)}</dd>
                </div>
                <div>
                  <dt>Empty folders</dt>
                  <dd>{formatFolderCountLabel(emptyFolders)}</dd>
                </div>
                <div>
                  <dt>Browse route</dt>
                  <dd>/client/meal-plans</dd>
                </div>
              </dl>
            </MobileCard>

            <div className="mobile-pt-detail-stat-grid">
              <MobileStatCard
                label="Folders"
                value={formatNumber(folders.length)}
                progressText="Bookmark folders returned through the current client bookmarks BFF route."
              />
              <MobileStatCard
                label="Saved items"
                value={formatNumber(totalSavedItems)}
                progressText="Total bookmarked meal plans across all current folders."
              />
              <MobileStatCard
                label="Folders with items"
                value={formatNumber(nonEmptyFolders)}
                progressText="Folders that currently contain at least one saved plan."
              />
              <MobileStatCard
                label="Empty folders"
                value={formatNumber(emptyFolders)}
                progressText="Folders ready to receive saved plans from the meal-plan catalog."
              />
            </div>
          </MobileSection>

          <MobileSection
            eyebrow="Overview"
            title="Saved overview"
            description="Summary framing from the currently returned bookmark folders."
          >
            <MobileCard as="article" variant="soft" className="mobile-pt-detail-action-card">
              <div className="mobile-pt-client-card__header">
                <div className="mobile-section__copy">
                  <p className="mobile-section__eyebrow">Workspace context</p>
                  <h3 className="mobile-section__title">
                    {highlightedFolder
                      ? `${highlightedFolder.name} is first in the current folder stack`
                      : "No folders are available yet"}
                  </h3>
                  <p className="mobile-section__description">
                    {highlightedFolder
                      ? "Folder grouping is supported by the current payload, so this screen keeps folders visible instead of flattening bookmarks into one list."
                      : "Create a folder first, then save meal plans from the discovery screen."}
                  </p>
                </div>
                <span className="mobile-pill mobile-pill--purple">
                  {latestSavedItem ? formatDateLabel(latestSavedItem.item.created_at) : "Unavailable"}
                </span>
              </div>

              <dl className="mobile-pt-fact-grid">
                <div>
                  <dt>Saved items</dt>
                  <dd>{formatSavedPlanCountLabel(totalSavedItems)}</dd>
                </div>
                <div>
                  <dt>Folders</dt>
                  <dd>{formatFolderCountLabel(folders.length)}</dd>
                </div>
                <div>
                  <dt>Latest saved</dt>
                  <dd>{latestSavedItem ? formatDateLabel(latestSavedItem.item.created_at) : "Unavailable"}</dd>
                </div>
                <div>
                  <dt>Browse route</dt>
                  <dd>/client/meal-plans</dd>
                </div>
              </dl>
            </MobileCard>
          </MobileSection>

          <MobileSection
            eyebrow="Actions"
            title="Create folder"
            description="Folder creation stays limited to the currently supported bookmarks route."
          >
            <MobileCard as="article" variant="soft" className="mobile-pt-detail-action-card">
              <form
                className="mobile-pt-form-grid"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleCreateFolder();
                }}
              >
                <div className="field">
                  <label htmlFor="folder-name">Folder name</label>
                  <input
                    id="folder-name"
                    className="mobile-focus-ring"
                    value={folderName}
                    onChange={(event) => setFolderName(event.target.value)}
                    placeholder="Favorites"
                    disabled={creatingFolder}
                  />
                </div>
                <div className="mobile-pt-actions">
                  <button
                    type="submit"
                    className="mobile-pt-button mobile-pt-button--primary mobile-focus-ring"
                    disabled={folderName.trim().length === 0 || creatingFolder}
                  >
                    {creatingFolder ? "Creating folder..." : "Create folder"}
                  </button>
                </div>
              </form>

              <div className="mobile-pt-actions">
                <span className="mobile-pill">Folders are real backend-backed groups</span>
                <span className="mobile-pill mobile-pill--purple">Saved plans stay in their current folder</span>
              </div>
            </MobileCard>
          </MobileSection>

          <MobileSection
            eyebrow="Highlight"
            title="Recently saved plan"
            description="This highlight uses actual bookmark timestamps from the current folder payload."
          >
            {latestSavedItem ? (
              <MobileCard as="article" variant="action" className="mobile-pt-detail-action-card">
                <div className="mobile-pt-client-card__header">
                  <div className="mobile-section__copy">
                    <p className="mobile-section__eyebrow">{latestSavedItem.folderName}</p>
                    <h3 className="mobile-section__title">{latestSavedItem.item.meal_plan.name}</h3>
                    <p className="mobile-section__description">
                      {formatMealPlanDescription(latestSavedItem.item.meal_plan.description)}
                    </p>
                  </div>
                  <span className="mobile-pill mobile-pill--yellow">
                    {formatDateLabel(latestSavedItem.item.created_at)}
                  </span>
                </div>

                <dl className="mobile-pt-fact-grid">
                  <div>
                    <dt>Vendor</dt>
                    <dd>{latestSavedItem.item.meal_plan.vendor_name}</dd>
                  </div>
                  <div>
                    <dt>Price</dt>
                    <dd>{formatPriceCents(latestSavedItem.item.meal_plan.total_price_cents)}</dd>
                  </div>
                  <div>
                    <dt>ZIP</dt>
                    <dd>{formatZipLabel(latestSavedItem.item.meal_plan.vendor_zip_code)}</dd>
                  </div>
                  <div>
                    <dt>Meals</dt>
                    <dd>{formatMealCountLabel(latestSavedItem.item.meal_plan.item_count)}</dd>
                  </div>
                </dl>

                <div className="mobile-pt-actions">
                  <ActionPill href={`/client/meal-plans/${latestSavedItem.item.meal_plan.id}`} tone="purple">
                    View plan
                  </ActionPill>
                  <ConfirmButton
                    idleLabel="Remove from folder"
                    confirmLabel="Confirm remove"
                    busyLabel="Removing..."
                    disabled={busyItemKey === `${latestSavedItem.folderId}:${latestSavedItem.item.id}`}
                    onConfirm={async () => {
                      await handleDeleteItem(latestSavedItem.folderId, latestSavedItem.item.id);
                    }}
                  />
                </div>
              </MobileCard>
            ) : (
              <StateCard
                title="No saved plan yet"
                message="Once you bookmark a meal plan, the latest saved item will be highlighted here."
              />
            )}
          </MobileSection>

          <MobileSection
            eyebrow="Folders"
            title="Saved folders"
            description="Folders remain visible as the primary grouping surface because the current bookmarks payload supports that organization directly."
          >
            {folders.length > 0 ? (
              <div className="mobile-pt-detail-stack">
                {folders.map((folder, index) => (
                  <MobileCard
                    key={folder.id}
                    as="article"
                    variant={index === 0 ? "action" : "soft"}
                    className="mobile-pt-detail-action-card"
                  >
                    <div className="mobile-pt-client-card__header">
                      <div className="mobile-section__copy">
                        <p className="mobile-section__eyebrow">Bookmark folder</p>
                        <h3 className="mobile-section__title">{folder.name}</h3>
                        <p className="mobile-section__description">
                          {formatFolderDescription(folder.description)}
                        </p>
                      </div>
                      <span className="mobile-pill mobile-pill--yellow">
                        {formatSavedPlanCountLabel(folder.items.length)}
                      </span>
                    </div>

                    <dl className="mobile-pt-fact-grid">
                      <div>
                        <dt>Items</dt>
                        <dd>{formatFolderItemCountValue(folder.items.length)}</dd>
                      </div>
                      <div>
                        <dt>Updated</dt>
                        <dd>{formatDateLabel(folder.updated_at)}</dd>
                      </div>
                    </dl>

                    {folder.items.length > 0 ? (
                      <div className="mobile-pt-detail-stack">
                        {folder.items.map((item) => (
                          <MobileCard
                            key={item.id}
                            as="article"
                            variant="soft"
                            className="mobile-pt-detail-action-card"
                          >
                            <div className="mobile-pt-client-card__header">
                              <div className="mobile-section__copy">
                                <p className="mobile-section__eyebrow">{item.meal_plan.vendor_name}</p>
                                <h4 className="mobile-section__title">{item.meal_plan.name}</h4>
                                <p className="mobile-section__description">
                                  {formatMealPlanDescription(item.meal_plan.description)}
                                </p>
                              </div>
                              <span className="mobile-pill mobile-pill--purple">Saved</span>
                            </div>

                            <dl className="mobile-pt-fact-grid">
                              <div>
                                <dt>Price</dt>
                                <dd>{formatPriceCents(item.meal_plan.total_price_cents)}</dd>
                              </div>
                              <div>
                                <dt>Meals</dt>
                                <dd>{formatMealCountLabel(item.meal_plan.item_count)}</dd>
                              </div>
                              <div>
                                <dt>ZIP</dt>
                                <dd>{formatZipLabel(item.meal_plan.vendor_zip_code)}</dd>
                              </div>
                            </dl>

                            <div className="mobile-pt-actions">
                              <ActionPill href={`/client/meal-plans/${item.meal_plan.id}`} tone="purple">
                                View plan
                              </ActionPill>
                              <ConfirmButton
                                idleLabel="Remove"
                                confirmLabel="Confirm remove"
                                busyLabel="Removing..."
                                disabled={busyItemKey === `${folder.id}:${item.id}`}
                                onConfirm={async () => {
                                  await handleDeleteItem(folder.id, item.id);
                                }}
                              />
                            </div>
                          </MobileCard>
                        ))}
                      </div>
                    ) : (
                      <StateCard
                        title="Folder is empty"
                        message="Use the bookmark action on a meal plan to populate this folder."
                      />
                    )}

                    <div className="mobile-pt-actions">
                      <ConfirmButton
                        idleLabel="Delete folder"
                        confirmLabel="Confirm delete"
                        busyLabel="Deleting..."
                        disabled={busyFolderId === folder.id}
                        onConfirm={async () => {
                          await handleDeleteFolder(folder.id);
                        }}
                      />
                    </div>
                  </MobileCard>
                ))}
              </div>
            ) : (
              <StateCard
                title="No bookmark folders yet"
                message="Create a folder, then save meal plans from the discovery page."
              />
            )}
          </MobileSection>
        </>
      ) : null}
    </MobileAppShell>
  );
}
