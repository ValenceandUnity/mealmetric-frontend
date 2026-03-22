"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { FolderCard } from "@/components/bookmarks/FolderCard";
import { PageShell } from "@/components/layout/PageShell";
import { MealPlanCard } from "@/components/meal-plans/MealPlanCard";
import { ActionRow } from "@/components/ui/ActionRow";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { ListRow } from "@/components/ui/ListRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionBlock } from "@/components/ui/SectionBlock";
import { StatPill } from "@/components/ui/StatPill";
import { useSessionBootstrap } from "@/lib/client/session";
import type { ApiResponse, BookmarkFolder, BookmarkFolderListPayload } from "@/lib/types/api";

type BookmarksResponse = ApiResponse<BookmarkFolderListPayload>;
type FolderResponse = ApiResponse<BookmarkFolder>;

export default function ClientBookmarksPage() {
  const { status, user } = useSessionBootstrap({
    requiredRole: "client",
    unauthenticatedRedirectTo: "/login",
  });

  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [folderName, setFolderName] = useState("Favorites");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    tone: "info" | "success" | "warning" | "error";
    title: string;
    message: string;
  } | null>(null);
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
    <PageShell title="Bookmarks" user={user}>
      {loading ? <LoadingBlock title="Loading bookmarks" message="Fetching bookmark folders." /> : null}
      {loadError ? <ErrorBlock title="Unable to manage bookmarks" message={loadError} /> : null}
      {actionFeedback ? (
        <FeedbackBanner
          tone={actionFeedback.tone}
          title={actionFeedback.title}
          message={actionFeedback.message}
        />
      ) : null}

      {!loading && !loadError ? (
        <>
          <Card className="client-bookmarks-hero" variant="accent" as="section">
            <PageHeader
              eyebrow="Client bookmarks"
              title="Saved-items workspace"
              description="Organize bookmarked meal plans into folders, review what you have saved, and return to plan detail without leaving the protected client shell."
              chips={[
                `${folders.length} folder${folders.length === 1 ? "" : "s"}`,
                `${totalSavedItems} saved item${totalSavedItems === 1 ? "" : "s"}`,
                `${nonEmptyFolders} active folder${nonEmptyFolders === 1 ? "" : "s"}`,
              ]}
              actions={
                <ActionRow>
                  <Link className="link-button link-button--accent" href="/client/meal-plans">
                    Browse meal plans
                  </Link>
                  <Link className="link-button" href="/client/metrics">
                    Review metrics
                  </Link>
                </ActionRow>
              }
            />
            <div className="client-bookmarks-hero__stats">
              <StatPill
                label="Folders"
                value={`${folders.length}`}
                hint="Bookmark folders returned through the current client bookmarks BFF route."
                active
              />
              <StatPill
                label="Saved items"
                value={`${totalSavedItems}`}
                hint="Total bookmarked meal plans across all current folders."
              />
              <StatPill
                label="Folders with items"
                value={`${nonEmptyFolders}`}
                hint="Folders that currently contain at least one saved plan."
              />
              <StatPill
                label="Empty folders"
                value={`${Math.max(folders.length - nonEmptyFolders, 0)}`}
                hint="Folders ready to receive saved plans from the meal-plan catalog."
              />
            </div>
          </Card>

          <SectionBlock
            eyebrow="Overview"
            title="Saved overview"
            description="Summary framing from the currently returned bookmark folders."
          >
            <div className="client-bookmarks-analytics">
              <AnalyticsCard
                eyebrow="Current workspace"
                title="Bookmarks summary"
                description="This summary reflects the exact folders and saved items currently returned through `/api/client/bookmarks`."
                stats={[
                  { label: "Folders", value: `${folders.length}` },
                  { label: "Saved items", value: `${totalSavedItems}` },
                  { label: "Non-empty", value: `${nonEmptyFolders}` },
                  {
                    label: "Latest saved",
                    value: latestSavedItem
                      ? new Date(latestSavedItem.item.created_at).toLocaleDateString()
                      : "Unavailable",
                  },
                ]}
              />
              <Card className="client-bookmarks-context" variant="soft">
                <ListRow
                  eyebrow="Workspace context"
                  title={
                    highlightedFolder
                      ? `${highlightedFolder.name} is first in the current folder stack`
                      : "No folders are available yet"
                  }
                  description={
                    highlightedFolder
                      ? "Folder grouping is supported by the current payload, so this screen keeps folders visible instead of flattening bookmarks into one list."
                      : "Create a folder first, then save meal plans from the discovery screen."
                  }
                  metadata={[
                    { label: "Saved items", value: `${totalSavedItems}` },
                    { label: "Folders", value: `${folders.length}` },
                    { label: "Browse route", value: "/client/meal-plans" },
                  ]}
                />
              </Card>
            </div>
          </SectionBlock>

          <SectionBlock
            eyebrow="Actions"
            title="Create folder"
            description="Folder creation stays limited to the currently supported bookmarks route."
          >
            <Card className="client-bookmarks-create" variant="soft">
              <div className="form-grid grid--2">
                <div className="field">
                  <label htmlFor="folder-name">Folder name</label>
                  <input
                    id="folder-name"
                    value={folderName}
                    onChange={(event) => setFolderName(event.target.value)}
                    placeholder="Favorites"
                    disabled={creatingFolder}
                  />
                </div>
                <ActionRow>
                  <button type="button" onClick={() => void handleCreateFolder()} disabled={folderName.trim().length === 0 || creatingFolder}>
                    {creatingFolder ? "Creating folder..." : "Create folder"}
                  </button>
                </ActionRow>
              </div>
              <div className="client-bookmarks-create__chips">
                <Chip tone="muted">Folders are real backend-backed groups</Chip>
                <Chip tone="muted">Saved plans stay in their current folder</Chip>
              </div>
            </Card>
          </SectionBlock>

          <SectionBlock
            eyebrow="Highlight"
            title="Recently saved plan"
            description="This highlight uses actual bookmark timestamps from the current folder payload."
          >
            {latestSavedItem ? (
              <Card className="client-bookmarks-featured" variant="soft">
                <PageHeader
                  eyebrow="Latest saved item"
                  title={latestSavedItem.item.meal_plan.name}
                  description={
                    latestSavedItem.item.meal_plan.description ??
                    "Saved from the protected client meal-plan catalog."
                  }
                  chips={[
                    latestSavedItem.folderName,
                    new Date(latestSavedItem.item.created_at).toLocaleDateString(),
                  ]}
                />
                <div className="client-bookmarks-featured__stats">
                  <StatPill
                    label="Folder"
                    value={latestSavedItem.folderName}
                  />
                  <StatPill
                    label="Price"
                    value={`$${(latestSavedItem.item.meal_plan.total_price_cents / 100).toFixed(2)}`}
                  />
                  <StatPill
                    label="ZIP"
                    value={latestSavedItem.item.meal_plan.vendor_zip_code ?? "Unavailable"}
                  />
                  <StatPill
                    label="Meals"
                    value={`${latestSavedItem.item.meal_plan.item_count}`}
                  />
                </div>
                <ActionRow>
                  <Link className="link-button" href={`/client/meal-plans/${latestSavedItem.item.meal_plan.id}`}>
                    View plan
                  </Link>
                  <ConfirmButton
                    idleLabel="Remove from folder"
                    confirmLabel="Confirm remove"
                    busyLabel="Removing..."
                    disabled={busyItemKey === `${latestSavedItem.folderId}:${latestSavedItem.item.id}`}
                    onConfirm={async () => {
                      await handleDeleteItem(latestSavedItem.folderId, latestSavedItem.item.id);
                    }}
                  />
                </ActionRow>
              </Card>
            ) : (
              <EmptyState
                title="No saved plan yet"
                message="Once you bookmark a meal plan, the latest saved item will be highlighted here."
              />
            )}
          </SectionBlock>

          <SectionBlock
            eyebrow="Folders"
            title="Saved folders"
            description="Folders remain visible as the primary grouping surface because the current bookmarks payload supports that organization directly."
          >
            {folders.length > 0 ? (
              <div className="stacked-list">
                {folders.map((folder, index) => (
                  <FolderCard
                    key={folder.id}
                    name={folder.name}
                    description={folder.description ?? undefined}
                    itemCount={folder.items.length}
                    updatedLabel={new Date(folder.updated_at).toLocaleDateString()}
                    active={index === 0}
                    disabled={busyFolderId === folder.id}
                    footer={
                      <ConfirmButton
                        idleLabel="Delete folder"
                        confirmLabel="Confirm delete"
                        busyLabel="Deleting..."
                        disabled={busyFolderId === folder.id}
                        onConfirm={async () => {
                          await handleDeleteFolder(folder.id);
                        }}
                      />
                    }
                  >
                    {folder.items.length > 0 ? (
                      <div className="stacked-list">
                        {folder.items.map((item) => (
                          <MealPlanCard
                            key={item.id}
                            mealPlan={item.meal_plan}
                            bookmarked
                            bookmarkBusy={busyItemKey === `${folder.id}:${item.id}`}
                            detailHrefBase={null}
                            footer={
                              <>
                                <Link
                                  className="link-button"
                                  href={`/client/meal-plans/${item.meal_plan.id}`}
                                >
                                  View plan
                                </Link>
                                <ConfirmButton
                                  idleLabel="Remove"
                                  confirmLabel="Confirm remove"
                                  busyLabel="Removing..."
                                  disabled={busyItemKey === `${folder.id}:${item.id}`}
                                  onConfirm={async () => {
                                    await handleDeleteItem(folder.id, item.id);
                                  }}
                                />
                              </>
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="Folder is empty"
                        message="Use the bookmark action on a meal plan to populate this folder."
                      />
                    )}
                  </FolderCard>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No bookmark folders yet"
                message="Create a folder, then save meal plans from the discovery page."
              />
            )}
          </SectionBlock>
        </>
      ) : null}
    </PageShell>
  );
}
